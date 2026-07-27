import { getSql } from "@/lib/db/client";
import type { OwnerScope } from "@/lib/auth/owner-scope";
import { normalizeOwnerIds } from "@/lib/auth/owner-scope";
import {
  mapBroadcastReportFromDb,
  mapCampaignActivityFromDb,
  mapMeetingDecisionFromDb,
  mapMeetingFromDb,
  mapMeetingPreviewFromDb,
  mapMeetingPublicDetailFromDb,
  mapMeetingTaskFromDb,
  mapSmsSendReportFromDb,
  mapSocialPlatformStatFromDb,
  mapSocialPostFromDb,
  mapUserFromDb,
} from "@/lib/db/mappers";
import {
  recalculateScoreAfterSave,
  socialPostScoreableType,
} from "@/lib/scoring/persist-content-score";
import type {
  AdminUser,
  BroadcastReport,
  CampaignActivity,
  CampaignMeeting,
  MeetingDecision,
  MeetingPublicDetail,
  MeetingPublicPreview,
  MeetingTask,
  MeetingWithTasks,
  Ownable,
  SmsSendReport,
  SocialMediaPost,
  SocialPlatformStat,
} from "@/lib/types";
import { verifyPassword } from "@/lib/auth/password";
import {
  buildLoginEmailCandidates,
  normalizeStoredUserEmail,
  resolveStoredUserEmail,
} from "@/lib/auth/user-login";
import {
  defaultContributorPermissions,
  normalizeContributorPermissions,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import {
  inferDefaultAuthorityLevel,
  type DirectiveAuthorityLevel,
} from "@/lib/directive-authority";
import type { OrgRole } from "@/lib/org-roles";
import { isOrgRole } from "@/lib/org-roles";
import type { ParsedUserImportRow } from "@/lib/services/users-excel-parser";
import { normalizePlanLabels } from "@/lib/content-topics";
import { normalizeSocialPostLinkEntries } from "@/lib/social-posts";
import { generateId } from "@/lib/utils";
import { hashPassword } from "@/lib/auth/password";
import { isOrgUserRole, normalizeAdminRole } from "@/lib/user-roles";

/** Ensure authority columns exist on older databases without a full migrate. */
export async function ensureUserAuthoritySchema(): Promise<void> {
  const sql = getSql();
  await sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS authority_level TEXT NOT NULL DEFAULT 'internal'
  `;
  await sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS authority_other TEXT
  `;
}

function isPgAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  // 42710 = duplicate_object
  if (code === "42710") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /already exists/i.test(message);
}

/**
 * Ensure org_role column + migrate legacy panel roles to org_user.
 * Runs once per process; never DROP/ADD constraints on every request
 * (that races under concurrent traffic and crashes page loads).
 */
let orgUserSchemaReady: Promise<void> | null = null;

export async function ensureOrgUserSchema(): Promise<void> {
  if (!orgUserSchemaReady) {
    orgUserSchemaReady = (async () => {
      const sql = getSql();
      await ensureUserAuthoritySchema();
      await sql`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS org_role TEXT
      `;

      // Migrate data before (re)applying check constraints.
      await sql`
        UPDATE users
        SET org_role = COALESCE(org_role, 'primary'), role = 'org_user'
        WHERE role = 'ministry_parent'
      `;
      await sql`
        UPDATE users
        SET org_role = COALESCE(org_role, 'pr'), role = 'org_user'
        WHERE role = 'sub_user'
      `;
      await sql`
        UPDATE users
        SET org_role = COALESCE(org_role, 'pr'), role = 'org_user'
        WHERE role = 'contributor'
      `;
      await sql`
        UPDATE users
        SET org_role = NULL
        WHERE role IN ('admin', 'client')
      `;
      await sql`
        UPDATE users
        SET org_role = NULL
        WHERE org_role IS NOT NULL
          AND org_role NOT IN ('primary', 'supervisor', 'deputy', 'pr')
      `;

      const orgRoleConstraint = await sql`
        SELECT 1 FROM pg_catalog.pg_constraint
        WHERE conname = 'users_org_role_check'
        LIMIT 1
      `;
      if (orgRoleConstraint.length === 0) {
        try {
          await sql`
            ALTER TABLE users ADD CONSTRAINT users_org_role_check
              CHECK (org_role IS NULL OR org_role IN ('primary', 'supervisor', 'deputy', 'pr'))
          `;
        } catch (error) {
          if (!isPgAlreadyExistsError(error)) throw error;
        }
      }

      // Widen role check once; tolerate concurrent instances.
      await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`;
      try {
        await sql`
          ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN (
              'admin', 'client', 'org_user',
              'contributor', 'ministry_parent', 'sub_user'
            ))
        `;
      } catch (error) {
        if (!isPgAlreadyExistsError(error)) throw error;
      }

      await sql`CREATE INDEX IF NOT EXISTS idx_users_org_role ON users(org_role)`;
    })().catch((error) => {
      orgUserSchemaReady = null;
      throw error;
    });
  }
  await orgUserSchemaReady;
}

function resolvePlanFields(data: Partial<Ownable>) {
  const planLabels = normalizePlanLabels(data.planLabels, data.planLabel);
  return {
    planLabel: planLabels[0] ?? null,
    planLabels,
  };
}

function sqlOwnerIn(
  sql: ReturnType<typeof getSql>,
  scope: OwnerScope,
  column:
    | "sp.owner_user_id"
    | "br.owner_user_id"
    | "sps.owner_user_id"
    | "ca.owner_user_id"
    | "m.owner_user_id"
    | "sr.owner_user_id"
) {
  const ids = normalizeOwnerIds(scope);
  if (ids === undefined) return sql``;
  if (ids.length === 0) return sql`AND FALSE`;
  if (column === "sp.owner_user_id") return sql`AND sp.owner_user_id IN ${sql(ids)}`;
  if (column === "br.owner_user_id") return sql`AND br.owner_user_id IN ${sql(ids)}`;
  if (column === "sps.owner_user_id") return sql`AND sps.owner_user_id IN ${sql(ids)}`;
  if (column === "ca.owner_user_id") return sql`AND ca.owner_user_id IN ${sql(ids)}`;
  if (column === "sr.owner_user_id") return sql`AND sr.owner_user_id IN ${sql(ids)}`;
  return sql`AND m.owner_user_id IN ${sql(ids)}`;
}

interface CampaignAccessRow {
  campaignId: string;
  permissions: ContributorPermissions;
}

async function loadUserCampaignAccess(userId: string): Promise<CampaignAccessRow[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT campaign_id, permissions FROM user_campaign_access WHERE user_id = ${userId}
  `;
  const access = rows.map((row) => ({
    campaignId: String(row.campaign_id),
    permissions: normalizeContributorPermissions(row.permissions),
  }));

  try {
    const userRows = await sql`
      SELECT organization_id, ministry_id, device_id
      FROM users WHERE id = ${userId} LIMIT 1
    `;
    if (!userRows[0]) return access;
    const {
      clampPermissionsToDeviceCeiling,
      resolveHomeDeviceId,
    } = await import("@/lib/db/repository-device-access");
    const homeDeviceId = resolveHomeDeviceId({
      organizationId: userRows[0].organization_id
        ? String(userRows[0].organization_id)
        : null,
      ministryId: userRows[0].ministry_id ? String(userRows[0].ministry_id) : null,
      deviceId: userRows[0].device_id ? String(userRows[0].device_id) : null,
    });
    if (!homeDeviceId) return access;

    const clamped: CampaignAccessRow[] = [];
    for (const row of access) {
      clamped.push({
        campaignId: row.campaignId,
        permissions: await clampPermissionsToDeviceCeiling(
          homeDeviceId,
          row.campaignId,
          row.permissions
        ),
      });
    }
    return clamped;
  } catch {
    return access;
  }
}

function mapAccessToUser(row: Record<string, unknown>, access: CampaignAccessRow[]): AdminUser {
  return mapUserFromDb(row, access);
}

/**
 * Resolve users.device_id safely against the devices FK.
 * Ensures legacy ministry/org rows are mirrored into devices when possible.
 */
async function resolveUserDeviceId(
  sql: ReturnType<typeof getSql>,
  input: {
    organizationId: string | null;
    ministryId: string | null;
    existingDeviceId: string | null;
  }
): Promise<string | null> {
  const candidate = input.organizationId ?? input.ministryId;

  try {
    const { ensureDeviceSchema, pgSaveDevice } = await import("@/lib/db/repository-devices");
    await ensureDeviceSchema();

    // Keep a more-specific existing device when admin is not assigning an organization.
    if (!input.organizationId && input.existingDeviceId) {
      const current = await sql`
        SELECT id FROM devices WHERE id = ${input.existingDeviceId} LIMIT 1
      `;
      if (current[0]) return input.existingDeviceId;
    }

    if (!candidate) return null;

    const existing = await sql`SELECT id FROM devices WHERE id = ${candidate} LIMIT 1`;
    if (existing[0]) return candidate;

    // Lazily mirror ministry / organization into devices (same UUID).
    if (input.organizationId) {
      const orgRows = await sql`
        SELECT id, ministry_id, name, full_name, is_active
        FROM ministry_organizations WHERE id = ${input.organizationId} LIMIT 1
      `;
      const org = orgRows[0];
      if (org?.ministry_id) {
        const ministryId = String(org.ministry_id);
        const ministryDevice = await sql`SELECT id FROM devices WHERE id = ${ministryId} LIMIT 1`;
        if (!ministryDevice[0]) {
          const ministryRows = await sql`
            SELECT id, name, full_name, description, is_active
            FROM ministries WHERE id = ${ministryId} LIMIT 1
          `;
          const ministry = ministryRows[0];
          if (ministry) {
            await pgSaveDevice({
              id: ministryId,
              name: String(ministry.full_name || ministry.name),
              shortName: String(ministry.name),
              type: "ministry",
              parentId: null,
              mission: ministry.description ? String(ministry.description) : null,
              status: ministry.is_active === false ? "inactive" : "active",
              activityScope: "national",
            });
          }
        }
        await pgSaveDevice({
          id: input.organizationId,
          name: String(org.full_name || org.name),
          shortName: String(org.name),
          type: "organization",
          parentId: ministryId,
          status: org.is_active === false ? "inactive" : "active",
          activityScope: "national",
        });
        return input.organizationId;
      }
    }

    if (input.ministryId) {
      const ministryRows = await sql`
        SELECT id, name, full_name, description, is_active
        FROM ministries WHERE id = ${input.ministryId} LIMIT 1
      `;
      const ministry = ministryRows[0];
      if (ministry) {
        await pgSaveDevice({
          id: input.ministryId,
          name: String(ministry.full_name || ministry.name),
          shortName: String(ministry.name),
          type: "ministry",
          parentId: null,
          mission: ministry.description ? String(ministry.description) : null,
          status: ministry.is_active === false ? "inactive" : "active",
          activityScope: "national",
        });
        return input.ministryId;
      }
    }
  } catch {
    // Devices may be unavailable on older DBs; fall through to existing link.
  }

  if (input.existingDeviceId) {
    try {
      const rows = await sql`
        SELECT id FROM devices WHERE id = ${input.existingDeviceId} LIMIT 1
      `;
      if (rows[0]) return input.existingDeviceId;
    } catch {
      return null;
    }
  }

  return null;
}

export async function pgGetUserByEmail(email: string) {
  const sql = getSql();
  const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1`;
  if (!rows[0]) return null;

  const access = await loadUserCampaignAccess(String(rows[0].id));
  return mapAccessToUser(rows[0], access);
}

export async function pgGetUserAuthByEmail(email: string) {
  const sql = getSql();
  const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1`;
  if (!rows[0]) return null;

  const access = await loadUserCampaignAccess(String(rows[0].id));
  const user = mapAccessToUser(rows[0], access);

  return {
    ...user,
    passwordHash: String(rows[0].password_hash),
  };
}

export async function pgGetUserAuthByLogin(identifier: string) {
  const candidates = buildLoginEmailCandidates(identifier);
  for (const email of candidates) {
    const user = await pgGetUserAuthByEmail(email);
    if (user) return user;
  }
  return null;
}

export async function pgGetUserById(id: string) {
  const sql = getSql();
  await ensureOrgUserSchema();
  const rows = await sql`
    SELECT
      u.*,
      m.name AS ministry_name,
      o.name AS organization_name,
      p.name AS parent_user_name
    FROM users u
    LEFT JOIN ministries m ON m.id = u.ministry_id
    LEFT JOIN ministry_organizations o ON o.id = u.organization_id
    LEFT JOIN users p ON p.id = u.parent_user_id
    WHERE u.id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return null;

  const access = await loadUserCampaignAccess(id);
  return mapAccessToUser(rows[0], access);
}

/** Find a user id by display name (exact match preferred, then contains). */
export async function pgFindUserIdByName(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const sql = getSql();
  const exact = await sql`
    SELECT id FROM users
    WHERE LOWER(TRIM(name)) = LOWER(${trimmed})
    ORDER BY created_at ASC
    LIMIT 1
  `;
  if (exact[0]?.id) return String(exact[0].id);

  const fuzzy = await sql`
    SELECT id FROM users
    WHERE LOWER(name) LIKE ${`%${trimmed.toLowerCase()}%`}
    ORDER BY created_at ASC
    LIMIT 1
  `;
  return fuzzy[0]?.id ? String(fuzzy[0].id) : null;
}

export async function pgGetUserPermissionsForCampaign(userId: string, campaignId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT uca.permissions, u.organization_id, u.ministry_id, u.device_id
    FROM user_campaign_access uca
    INNER JOIN users u ON u.id = uca.user_id
    WHERE uca.user_id = ${userId} AND uca.campaign_id = ${campaignId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  const stored = normalizeContributorPermissions(rows[0].permissions);
  try {
    const {
      clampPermissionsToDeviceCeiling,
      resolveHomeDeviceId,
    } = await import("@/lib/db/repository-device-access");
    const homeDeviceId = resolveHomeDeviceId({
      organizationId: rows[0].organization_id ? String(rows[0].organization_id) : null,
      ministryId: rows[0].ministry_id ? String(rows[0].ministry_id) : null,
      deviceId: rows[0].device_id ? String(rows[0].device_id) : null,
    });
    return clampPermissionsToDeviceCeiling(homeDeviceId, campaignId, stored);
  } catch {
    return stored;
  }
}

export async function pgGetAllUsers(): Promise<AdminUser[]> {
  const sql = getSql();
  await ensureOrgUserSchema();
  const rows = await sql`
    SELECT
      u.*,
      m.name AS ministry_name,
      o.name AS organization_name,
      p.name AS parent_user_name
    FROM users u
    LEFT JOIN ministries m ON m.id = u.ministry_id
    LEFT JOIN ministry_organizations o ON o.id = u.organization_id
    LEFT JOIN users p ON p.id = u.parent_user_id
    ORDER BY u.created_at DESC
  `;
  const users: AdminUser[] = [];

  for (const row of rows) {
    const access = await loadUserCampaignAccess(String(row.id));
    users.push(mapAccessToUser(row, access));
  }

  return users;
}

/** All org_user descendants under parent (any depth), not only direct children. */
export async function pgGetSubUsersForParent(parentUserId: string): Promise<AdminUser[]> {
  const sql = getSql();
  await ensureOrgUserSchema();
  const rows = await sql`
    WITH RECURSIVE descendants AS (
      SELECT id, ARRAY[id] AS path FROM users
      WHERE parent_user_id = ${parentUserId}
        AND role = 'org_user'
      UNION ALL
      SELECT u.id, d.path || u.id FROM users u
      INNER JOIN descendants d ON u.parent_user_id = d.id
      WHERE u.role = 'org_user'
        AND NOT (u.id = ANY (d.path))
    )
    SELECT
      u.*,
      m.name AS ministry_name,
      o.name AS organization_name,
      p.name AS parent_user_name
    FROM users u
    INNER JOIN descendants d ON d.id = u.id
    LEFT JOIN ministries m ON m.id = u.ministry_id
    LEFT JOIN ministry_organizations o ON o.id = u.organization_id
    LEFT JOIN users p ON p.id = u.parent_user_id
    ORDER BY u.created_at DESC
  `;
  const users: AdminUser[] = [];
  for (const row of rows) {
    const access = await loadUserCampaignAccess(String(row.id));
    users.push(mapAccessToUser(row, access));
  }
  return users;
}

export async function pgSaveUser(data: {
  id?: string;
  email: string;
  name: string;
  role: AdminUser["role"];
  orgRole?: OrgRole | null;
  password?: string;
  province?: string | null;
  city?: string | null;
  region?: string | null;
  phone?: string | null;
  accountManagerName?: string | null;
  alternateContactName?: string | null;
  alternateContactPhone?: string | null;
  ministryId?: string | null;
  organizationId?: string | null;
  parentUserId?: string | null;
  authorityLevel?: DirectiveAuthorityLevel | null;
  authorityOther?: string | null;
  campaignIds?: string[];
  campaignPermissions?: Record<string, ContributorPermissions>;
}) {
  const sql = getSql();
  await ensureOrgUserSchema();
  const id = data.id ?? generateId();
  const now = new Date().toISOString();
  const province = data.province?.trim() || null;
  const city = data.city?.trim() || null;
  const region =
    data.region === "north" ||
    data.region === "south" ||
    data.region === "east" ||
    data.region === "west"
      ? data.region
      : null;
  const phone = data.phone?.trim() || null;
  const accountManagerName = data.accountManagerName?.trim() || null;
  let alternateContactName =
    data.alternateContactName !== undefined
      ? data.alternateContactName?.trim() || null
      : null;
  let alternateContactPhone =
    data.alternateContactPhone !== undefined
      ? data.alternateContactPhone?.trim() || null
      : null;
  let ministryId = data.ministryId?.trim() || null;
  let organizationId = data.organizationId?.trim() || null;
  let parentUserId = data.parentUserId?.trim() || null;

  let existingEmail: string | null = null;
  let existingDeviceId: string | null = null;
  if (data.id) {
    const existingRows = await sql`
      SELECT email, device_id, parent_user_id
      FROM users WHERE id = ${id} LIMIT 1
    `;
    existingEmail = existingRows[0]?.email ? String(existingRows[0].email) : null;
    existingDeviceId = existingRows[0]?.device_id ? String(existingRows[0].device_id) : null;
  }
  const email = resolveStoredUserEmail(data.email, existingEmail);

  const role = normalizeAdminRole(data.role);
  const orgRole: OrgRole | null =
    role === "org_user"
      ? isOrgRole(data.orgRole)
        ? data.orgRole
        : "pr"
      : null;

  if (organizationId) {
    const orgRows = await sql`
      SELECT ministry_id FROM ministry_organizations WHERE id = ${organizationId} LIMIT 1
    `;
    const orgMinistryId = orgRows[0]?.ministry_id ? String(orgRows[0].ministry_id) : null;
    if (orgMinistryId) {
      if (ministryId && ministryId !== orgMinistryId) {
        return {
          success: false as const,
          error: "زیرمجموعه باید متعلق به وزارتخانه انتخاب‌شده باشد",
        };
      }
      ministryId = orgMinistryId;
    } else {
      // Not in ministry_organizations — may be a devices-tree id (FK forbids storing it as organization_id).
      const deviceRows = await sql`
        SELECT parent_id FROM devices WHERE id = ${organizationId} LIMIT 1
      `;
      if (deviceRows[0]) {
        const parentId = deviceRows[0].parent_id ? String(deviceRows[0].parent_id) : null;
        // Keep linking via device_id; clear organization_id to satisfy FK.
        existingDeviceId = organizationId;
        if (!parentId) {
          ministryId = ministryId ?? organizationId;
        } else if (!ministryId) {
          ministryId = parentId;
        }
      }
      organizationId = null;
    }
  } else {
    organizationId = null;
  }

  if (parentUserId) {
    const parentRows = await sql`
      SELECT id, role FROM users WHERE id = ${parentUserId} LIMIT 1
    `;
    const parentRole = parentRows[0]?.role ? String(parentRows[0].role) : null;
    if (!parentRole || !isOrgUserRole(normalizeAdminRole(parentRole))) {
      // Stale parent must not block permission edits.
      parentUserId = null;
    }
  }

  const deviceId = await resolveUserDeviceId(sql, {
    organizationId,
    ministryId,
    existingDeviceId,
  });

  // Authority is always derived from ministry/org placement — never taken from client input.
  const authorityLevel = inferDefaultAuthorityLevel({
    role,
    organizationId,
    ministryId,
  });
  const authorityOther = null;

  if (
    data.id &&
    (data.alternateContactName === undefined || data.alternateContactPhone === undefined)
  ) {
    const existingAlt = await sql`
      SELECT alternate_contact_name, alternate_contact_phone
      FROM users WHERE id = ${id} LIMIT 1
    `;
    if (data.alternateContactName === undefined) {
      alternateContactName = existingAlt[0]?.alternate_contact_name
        ? String(existingAlt[0].alternate_contact_name)
        : null;
    }
    if (data.alternateContactPhone === undefined) {
      alternateContactPhone = existingAlt[0]?.alternate_contact_phone
        ? String(existingAlt[0].alternate_contact_phone)
        : null;
    }
  }

  try {
  if (data.id) {
    if (data.password) {
      const passwordHash = await hashPassword(data.password);
      await sql`
        UPDATE users SET
          email = ${email},
          name = ${data.name},
          role = ${role},
          org_role = ${orgRole},
          province = ${province},
          city = ${city},
          region = ${region},
          phone = ${phone},
          account_manager_name = ${accountManagerName},
          alternate_contact_name = ${alternateContactName},
          alternate_contact_phone = ${alternateContactPhone},
          ministry_id = ${ministryId},
          organization_id = ${organizationId},
          device_id = ${deviceId},
          parent_user_id = ${parentUserId},
          authority_level = ${authorityLevel},
          authority_other = ${authorityOther},
          password_hash = ${passwordHash}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE users SET
          email = ${email},
          name = ${data.name},
          role = ${role},
          org_role = ${orgRole},
          province = ${province},
          city = ${city},
          region = ${region},
          phone = ${phone},
          account_manager_name = ${accountManagerName},
          alternate_contact_name = ${alternateContactName},
          alternate_contact_phone = ${alternateContactPhone},
          ministry_id = ${ministryId},
          organization_id = ${organizationId},
          device_id = ${deviceId},
          parent_user_id = ${parentUserId},
          authority_level = ${authorityLevel},
          authority_other = ${authorityOther}
        WHERE id = ${id}
      `;
    }
  } else {
    if (!data.password) {
      return { success: false as const, error: "رمز عبور الزامی است" };
    }
    const passwordHash = await hashPassword(data.password);
    await sql`
      INSERT INTO users (
        id, email, password_hash, name, role, org_role, province, city, region, phone,
        account_manager_name, alternate_contact_name, alternate_contact_phone,
        ministry_id, organization_id, device_id, parent_user_id,
        authority_level, authority_other, created_at
      )
      VALUES (
        ${id}, ${email}, ${passwordHash}, ${data.name}, ${role}, ${orgRole}, ${province}, ${city},
        ${region}, ${phone}, ${accountManagerName}, ${alternateContactName}, ${alternateContactPhone},
        ${ministryId}, ${organizationId},
        ${deviceId}, ${parentUserId}, ${authorityLevel}, ${authorityOther}, ${now}
      )
    `;
  }

  await sql`DELETE FROM user_campaign_access WHERE user_id = ${id}`;
  const requestedCampaignIds = [
    ...new Set((data.campaignIds ?? []).map((campaignId) => campaignId.trim()).filter(Boolean)),
  ];
  let validCampaignIds = requestedCampaignIds;
  if (requestedCampaignIds.length > 0) {
    const campaignRows = await sql`
      SELECT id FROM campaign_settings WHERE id IN ${sql(requestedCampaignIds)}
    `;
    const existing = new Set(campaignRows.map((row) => String(row.id)));
    validCampaignIds = requestedCampaignIds.filter((campaignId) => existing.has(campaignId));
  }
  const {
    clampPermissionsToDeviceCeiling,
    pgEnsureDeviceCeilingAllows,
    resolveHomeDeviceId,
  } = await import("@/lib/db/repository-device-access");
  const homeDeviceId = resolveHomeDeviceId({
    organizationId,
    ministryId,
    deviceId,
  });
  for (const campaignId of validCampaignIds) {
    const requested = normalizeContributorPermissions(
      data.campaignPermissions?.[campaignId] ?? defaultContributorPermissions()
    );
    // Raise the home-device ceiling first so explicitly granted flags are not
    // silently stripped by clamp (and remain visible in the user sidebar).
    if (homeDeviceId) {
      await pgEnsureDeviceCeilingAllows(homeDeviceId, campaignId, requested);
    }
    const permissions = await clampPermissionsToDeviceCeiling(
      homeDeviceId,
      campaignId,
      requested
    );
    await sql`
      INSERT INTO user_campaign_access (user_id, campaign_id, permissions, created_at)
      VALUES (
        ${id},
        ${campaignId},
        ${sql.json(JSON.parse(JSON.stringify(permissions)))},
        ${now}
      )
      ON CONFLICT (user_id, campaign_id) DO UPDATE SET
        permissions = EXCLUDED.permissions
    `;
  }

  return { success: true as const, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ذخیره کاربر ناموفق بود";
    if (message.includes("duplicate key") || message.includes("unique")) {
      return { success: false as const, error: "این نام کاربری قبلاً ثبت شده است" };
    }
    return { success: false as const, error: message };
  }
}

/** Replace campaign access for many users with a shared permission set. */
export async function pgBulkUpdateUsersAccess(input: {
  userIds: string[];
  campaignIds: string[];
  permissions: ContributorPermissions;
}): Promise<{ success: true; updated: number } | { success: false; error: string }> {
  const userIds = [...new Set(input.userIds.map((id) => id.trim()).filter(Boolean))];
  if (userIds.length === 0) {
    return { success: false, error: "هیچ کاربری انتخاب نشده است" };
  }

  const campaignIds = [...new Set(input.campaignIds.map((id) => id.trim()).filter(Boolean))];
  const permissions = normalizeContributorPermissions(input.permissions);
  const sql = getSql();
  const now = new Date().toISOString();

  let validCampaignIds = campaignIds;
  if (campaignIds.length > 0) {
    const campaignRows = await sql`
      SELECT id FROM campaign_settings WHERE id IN ${sql(campaignIds)}
    `;
    const existing = new Set(campaignRows.map((row) => String(row.id)));
    validCampaignIds = campaignIds.filter((id) => existing.has(id));
  }

  try {
    const {
      clampPermissionsToDeviceCeiling,
      pgEnsureDeviceCeilingAllows,
      resolveHomeDeviceId,
    } = await import("@/lib/db/repository-device-access");

    for (const userId of userIds) {
      const userRows = await sql`
        SELECT organization_id, ministry_id, device_id
        FROM users WHERE id = ${userId} LIMIT 1
      `;
      const homeDeviceId = resolveHomeDeviceId({
        organizationId: userRows[0]?.organization_id
          ? String(userRows[0].organization_id)
          : null,
        ministryId: userRows[0]?.ministry_id ? String(userRows[0].ministry_id) : null,
        deviceId: userRows[0]?.device_id ? String(userRows[0].device_id) : null,
      });

      await sql`DELETE FROM user_campaign_access WHERE user_id = ${userId}`;
      for (const campaignId of validCampaignIds) {
        if (homeDeviceId) {
          await pgEnsureDeviceCeilingAllows(homeDeviceId, campaignId, permissions);
        }
        const clamped = await clampPermissionsToDeviceCeiling(
          homeDeviceId,
          campaignId,
          permissions
        );
        await sql`
          INSERT INTO user_campaign_access (user_id, campaign_id, permissions, created_at)
          VALUES (
            ${userId},
            ${campaignId},
            ${sql.json(JSON.parse(JSON.stringify(clamped)))},
            ${now}
          )
          ON CONFLICT (user_id, campaign_id) DO UPDATE SET
            permissions = EXCLUDED.permissions
        `;
      }
    }
    return { success: true, updated: userIds.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "بروزرسانی دسترسی ناموفق بود";
    return { success: false, error: message };
  }
}

export async function pgUpdateUserRegion(userId: string, region: string | null) {
  const sql = getSql();
  const normalized =
    region === "north" || region === "south" || region === "east" || region === "west"
      ? region
      : null;
  await sql`UPDATE users SET region = ${normalized} WHERE id = ${userId}`;
  return { success: true as const };
}

export async function pgUpdateUserMinistry(
  userId: string,
  ministryId: string | null,
  organizationId?: string | null
) {
  const sql = getSql();
  let normalizedMinistry = ministryId?.trim() || null;
  let normalizedOrg = organizationId?.trim() || null;

  if (normalizedOrg) {
    const orgRows = await sql`
      SELECT ministry_id FROM ministry_organizations WHERE id = ${normalizedOrg} LIMIT 1
    `;
    const orgMinistryId = orgRows[0]?.ministry_id ? String(orgRows[0].ministry_id) : null;
    if (!orgMinistryId) {
      return { success: false as const, error: "زیرمجموعه انتخاب‌شده معتبر نیست" };
    }
    if (normalizedMinistry && normalizedMinistry !== orgMinistryId) {
      return {
        success: false as const,
        error: "زیرمجموعه باید متعلق به وزارتخانه انتخاب‌شده باشد",
      };
    }
    normalizedMinistry = orgMinistryId;
  } else {
    normalizedOrg = null;
  }

  await sql`
    UPDATE users SET
      ministry_id = ${normalizedMinistry},
      organization_id = ${normalizedOrg},
      device_id = ${normalizedOrg ?? normalizedMinistry}
    WHERE id = ${userId}
  `;
  return { success: true as const };
}

export async function pgImportUsersFromExcel(params: {
  rows: ParsedUserImportRow[];
  campaignIds: string[];
  campaignPermissions: ContributorPermissions;
  updateExisting: boolean;
}) {
  const sql = getSql();
  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of params.rows) {
    try {
      const email = normalizeStoredUserEmail(row.username);
      const existingRows = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
      const permissions = normalizeContributorPermissions(params.campaignPermissions);

      if (existingRows[0]) {
        if (!params.updateExisting) {
          skipped += 1;
          continue;
        }

        const userId = String(existingRows[0].id);
        const passwordHash = await hashPassword(row.password);
        await sql`
          UPDATE users SET
            name = ${row.companyName},
            password_hash = ${passwordHash},
            province = ${row.province},
            city = ${row.city},
            role = 'org_user',
            org_role = COALESCE(org_role, 'pr')
          WHERE id = ${userId}
        `;

        for (const campaignId of params.campaignIds) {
          await sql`
            INSERT INTO user_campaign_access (user_id, campaign_id, permissions, created_at)
            VALUES (
              ${userId},
              ${campaignId},
              ${sql.json(JSON.parse(JSON.stringify(permissions)))},
              ${now}
            )
            ON CONFLICT (user_id, campaign_id) DO UPDATE SET
              permissions = EXCLUDED.permissions
          `;
        }

        updated += 1;
        continue;
      }

      const userId = generateId();
      const passwordHash = await hashPassword(row.password);
      await sql`
        INSERT INTO users (id, email, password_hash, name, role, org_role, province, city, created_at)
        VALUES (
          ${userId},
          ${email},
          ${passwordHash},
          ${row.companyName},
          'org_user',
          'pr',
          ${row.province},
          ${row.city},
          ${now}
        )
      `;

      for (const campaignId of params.campaignIds) {
        await sql`
          INSERT INTO user_campaign_access (user_id, campaign_id, permissions, created_at)
          VALUES (
            ${userId},
            ${campaignId},
            ${sql.json(JSON.parse(JSON.stringify(permissions)))},
            ${now}
          )
        `;
      }

      created += 1;
    } catch (error) {
      errors.push(
        `${row.username}: ${error instanceof Error ? error.message : "خطای ناشناخته"}`
      );
    }
  }

  return { created, updated, skipped, errors };
}

export async function pgDeleteUser(id: string) {
  const sql = getSql();
  await sql`DELETE FROM users WHERE id = ${id}`;
  return { success: true };
}

export async function pgDeleteUsers(ids: string[]) {
  if (ids.length === 0) {
    return { success: true, deleted: 0 };
  }

  const sql = getSql();
  await sql`DELETE FROM users WHERE id IN ${sql(ids)}`;
  return { success: true, deleted: ids.length };
}

export async function pgGetSocialPostById(id: string): Promise<SocialMediaPost | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT sp.*, u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name
    FROM social_media_posts sp
    LEFT JOIN users u ON u.id = sp.owner_user_id

    LEFT JOIN ministries om ON om.id = u.ministry_id

    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE sp.id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapSocialPostFromDb(rows[0]) : null;
}

/** Posts with links that may be refreshed from Eitaa or public web pages. */
export async function pgListRefreshableSocialPosts(limit = 300): Promise<SocialMediaPost[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT sp.*, u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name
    FROM social_media_posts sp
    LEFT JOIN users u ON u.id = sp.owner_user_id

    LEFT JOIN ministries om ON om.id = u.ministry_id

    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE COALESCE(TRIM(sp.link), '') <> ''
      AND (
        sp.platform IN ('eitaa', 'aparat', 'site')
        OR sp.link ILIKE '%eitaa.com%'
        OR sp.link ILIKE '%aparat.com%'
      )
    ORDER BY sp.updated_at ASC NULLS FIRST, sp.published_date DESC
    LIMIT ${limit}
  `;
  return rows.map(mapSocialPostFromDb);
}

/** Magazine/newspaper activities that have an external link. */
export async function pgListRefreshablePressActivities(limit = 300): Promise<CampaignActivity[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT ca.*, u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name
    FROM campaign_activities ca
    LEFT JOIN users u ON u.id = ca.owner_user_id

    LEFT JOIN ministries om ON om.id = u.ministry_id

    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE ca.activity_type IN ('magazine', 'newspaper')
      AND COALESCE(TRIM(ca.link), '') <> ''
    ORDER BY ca.updated_at ASC NULLS FIRST, ca.activity_date DESC
    LIMIT ${limit}
  `;
  return rows.map(mapCampaignActivityFromDb);
}

export async function pgGetSocialPosts(
  campaignId: string,
  ownerUserId?: OwnerScope
): Promise<SocialMediaPost[]> {
  const sql = getSql();
  const ownerFilter = sqlOwnerIn(sql, ownerUserId, "sp.owner_user_id");
  const rows = await sql`
    SELECT sp.*, u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name
    FROM social_media_posts sp
    LEFT JOIN users u ON u.id = sp.owner_user_id

    LEFT JOIN ministries om ON om.id = u.ministry_id

    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE sp.campaign_id = ${campaignId}
    ${ownerFilter}
    ORDER BY sp.sort_order, sp.published_date DESC
  `;

  return rows.map(mapSocialPostFromDb);
}

export async function pgSaveSocialPost(data: Partial<SocialMediaPost> & { id?: string }) {
  const sql = getSql();
  const now = new Date().toISOString();
  const id = data.id ?? generateId();
  const { planLabel, planLabels } = resolvePlanFields(data);
  const linkEntries = normalizeSocialPostLinkEntries(data.linkEntries);

  // Ensure column exists on older deployments that have not run db:migrate yet.
  await sql`
    ALTER TABLE social_media_posts
    ADD COLUMN IF NOT EXISTS link_entries JSONB NOT NULL DEFAULT '[]'::jsonb
  `;

  const countRows = await sql`
    SELECT COUNT(*)::int AS count FROM social_media_posts WHERE campaign_id = ${data.campaignId ?? ""}
  `;
  const sortOrder = data.sortOrder ?? (Number(countRows[0]?.count) || 0) + 1;

  await sql`
    INSERT INTO social_media_posts (
      id, campaign_id, owner_user_id, platform, title, cover_image_url,
      views, likes, comments, shares, link, link_entries, content_type, media_url, description,
      published_date, published, sort_order, plan_label, plan_labels, created_at, updated_at
    ) VALUES (
      ${id},
      ${data.campaignId ?? ""},
      ${data.ownerUserId ?? null},
      ${data.platform ?? "instagram"},
      ${data.title ?? ""},
      ${data.coverImageUrl ?? null},
      ${data.views ?? 0},
      ${data.likes ?? 0},
      ${data.comments ?? 0},
      ${data.shares ?? 0},
      ${data.link ?? ""},
      ${sql.json(JSON.parse(JSON.stringify(linkEntries)))},
      ${data.contentType ?? "image"},
      ${data.mediaUrl ?? null},
      ${data.description ?? null},
      ${data.publishedDate ?? now.split("T")[0]},
      ${data.published ?? true},
      ${sortOrder},
      ${planLabel},
      ${sql.json(planLabels)},
      ${now},
      ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      platform = EXCLUDED.platform,
      title = EXCLUDED.title,
      cover_image_url = EXCLUDED.cover_image_url,
      views = EXCLUDED.views,
      likes = EXCLUDED.likes,
      comments = EXCLUDED.comments,
      shares = EXCLUDED.shares,
      link = EXCLUDED.link,
      link_entries = EXCLUDED.link_entries,
      content_type = EXCLUDED.content_type,
      media_url = EXCLUDED.media_url,
      description = EXCLUDED.description,
      published_date = EXCLUDED.published_date,
      published = EXCLUDED.published,
      sort_order = EXCLUDED.sort_order,
      owner_user_id = COALESCE(EXCLUDED.owner_user_id, social_media_posts.owner_user_id),
      plan_label = EXCLUDED.plan_label,
      plan_labels = EXCLUDED.plan_labels,
      updated_at = EXCLUDED.updated_at
  `;

  await recalculateScoreAfterSave({
    campaignId: data.campaignId ?? "",
    contentType: socialPostScoreableType(data.platform ?? "instagram"),
    contentId: id,
  });

  return { success: true, id };
}

export async function pgDeleteSocialPost(id: string) {
  const sql = getSql();
  await sql`DELETE FROM social_media_posts WHERE id = ${id}`;
  return { success: true };
}

export async function pgGetSocialPlatformStatById(id: string): Promise<SocialPlatformStat | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT sps.*, u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name
    FROM social_platform_stats sps
    LEFT JOIN users u ON u.id = sps.owner_user_id

    LEFT JOIN ministries om ON om.id = u.ministry_id

    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE sps.id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapSocialPlatformStatFromDb(rows[0]) : null;
}

export async function pgGetSocialPlatformStats(
  campaignId: string,
  ownerUserId?: OwnerScope
): Promise<SocialPlatformStat[]> {
  const sql = getSql();
  const ownerFilter = sqlOwnerIn(sql, ownerUserId, "sps.owner_user_id");
  const rows = await sql`
    SELECT sps.*, u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name
    FROM social_platform_stats sps
    LEFT JOIN users u ON u.id = sps.owner_user_id

    LEFT JOIN ministries om ON om.id = u.ministry_id

    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE sps.campaign_id = ${campaignId}
    ${ownerFilter}
    ORDER BY sps.sort_order, sps.platform
  `;

  return rows.map(mapSocialPlatformStatFromDb);
}

export async function pgSaveSocialPlatformStat(data: Partial<SocialPlatformStat> & { id?: string }) {
  const sql = getSql();
  const now = new Date().toISOString();
  const campaignId = data.campaignId ?? "";
  const ownerUserId = data.ownerUserId ?? null;
  const platform = data.platform ?? "instagram";
  const title = data.title?.trim() || null;
  const followers = data.followers ?? 0;
  const posts = data.posts ?? 0;
  const profileUrl = data.profileUrl ?? null;

  if (data.id) {
    await sql`
      UPDATE social_platform_stats SET
        platform = ${platform},
        title = ${title},
        followers = ${followers},
        posts = ${posts},
        profile_url = ${profileUrl},
        updated_at = ${now}
      WHERE id = ${data.id}
    `;
    return { success: true, id: data.id };
  }

  const countRows = ownerUserId
    ? await sql`
        SELECT COUNT(*)::int AS count
        FROM social_platform_stats
        WHERE campaign_id = ${campaignId} AND owner_user_id = ${ownerUserId}
      `
    : await sql`
        SELECT COUNT(*)::int AS count
        FROM social_platform_stats
        WHERE campaign_id = ${campaignId} AND owner_user_id IS NULL
      `;
  const sortOrder = data.sortOrder ?? (Number(countRows[0]?.count) || 0) + 1;
  const id = generateId();

  await sql`
    INSERT INTO social_platform_stats (
      id, campaign_id, owner_user_id, platform, title, followers, posts, profile_url,
      sort_order, created_at, updated_at
    ) VALUES (
      ${id},
      ${campaignId},
      ${ownerUserId},
      ${platform},
      ${title},
      ${followers},
      ${posts},
      ${profileUrl},
      ${sortOrder},
      ${now},
      ${now}
    )
  `;

  return { success: true, id };
}

export async function pgDeleteSocialPlatformStat(id: string) {
  const sql = getSql();
  await sql`DELETE FROM social_platform_stats WHERE id = ${id}`;
  return { success: true };
}

export async function pgGetBroadcastReports(
  campaignId: string,
  ownerUserId?: OwnerScope
): Promise<BroadcastReport[]> {
  const sql = getSql();
  const ownerFilter = sqlOwnerIn(sql, ownerUserId, "br.owner_user_id");
  const rows = await sql`
    SELECT br.*, u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name
    FROM broadcast_reports br
    LEFT JOIN users u ON u.id = br.owner_user_id

    LEFT JOIN ministries om ON om.id = u.ministry_id

    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE br.campaign_id = ${campaignId}
    ${ownerFilter}
    ORDER BY br.sort_order, br.report_date DESC
  `;

  return rows.map(mapBroadcastReportFromDb);
}

export async function pgSaveBroadcastReport(data: Partial<BroadcastReport> & { id?: string }) {
  const sql = getSql();
  const now = new Date().toISOString();
  const id = data.id ?? generateId();
  const { planLabel, planLabels } = resolvePlanFields(data);

  const countRows = await sql`
    SELECT COUNT(*)::int AS count FROM broadcast_reports WHERE campaign_id = ${data.campaignId ?? ""}
  `;
  const sortOrder = data.sortOrder ?? (Number(countRows[0]?.count) || 0) + 1;

  await sql`
    INSERT INTO broadcast_reports (
      id, campaign_id, owner_user_id, title, report_date, pdf_url, file_name,
      summary_data, published, sort_order, plan_label, plan_labels, created_at, updated_at
    ) VALUES (
      ${id},
      ${data.campaignId ?? ""},
      ${data.ownerUserId ?? null},
      ${data.title ?? ""},
      ${data.reportDate ?? now.split("T")[0]},
      ${data.pdfUrl ?? ""},
      ${data.fileName ?? ""},
      ${sql.json(JSON.parse(JSON.stringify(data.summaryData ?? {})))},
      ${data.published ?? true},
      ${sortOrder},
      ${planLabel},
      ${sql.json(planLabels)},
      ${now},
      ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      report_date = EXCLUDED.report_date,
      pdf_url = EXCLUDED.pdf_url,
      file_name = EXCLUDED.file_name,
      summary_data = EXCLUDED.summary_data,
      published = EXCLUDED.published,
      sort_order = EXCLUDED.sort_order,
      owner_user_id = COALESCE(EXCLUDED.owner_user_id, broadcast_reports.owner_user_id),
      plan_label = EXCLUDED.plan_label,
      plan_labels = EXCLUDED.plan_labels,
      updated_at = EXCLUDED.updated_at
  `;

  await recalculateScoreAfterSave({
    campaignId: data.campaignId ?? "",
    contentType: "broadcast",
    contentId: id,
  });

  return { success: true, id };
}

export async function pgDeleteBroadcastReport(id: string) {
  const sql = getSql();
  await sql`DELETE FROM broadcast_reports WHERE id = ${id}`;
  return { success: true };
}

export async function pgGetSmsSendReportById(id: string): Promise<SmsSendReport | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT sr.*, u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name
    FROM sms_send_reports sr
    LEFT JOIN users u ON u.id = sr.owner_user_id

    LEFT JOIN ministries om ON om.id = u.ministry_id

    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE sr.id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapSmsSendReportFromDb(rows[0]) : null;
}

export async function pgGetSmsSendReports(
  campaignId: string,
  ownerUserId?: OwnerScope
): Promise<SmsSendReport[]> {
  const sql = getSql();
  const ownerFilter = sqlOwnerIn(sql, ownerUserId, "sr.owner_user_id");
  const rows = await sql`
    SELECT sr.*, u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name
    FROM sms_send_reports sr
    LEFT JOIN users u ON u.id = sr.owner_user_id

    LEFT JOIN ministries om ON om.id = u.ministry_id

    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE sr.campaign_id = ${campaignId}
    ${ownerFilter}
    ORDER BY sr.sort_order, sr.send_date DESC
  `;

  return rows.map(mapSmsSendReportFromDb);
}

export async function pgSaveSmsSendReport(data: Partial<SmsSendReport> & { id?: string }) {
  const sql = getSql();
  const now = new Date().toISOString();
  const id = data.id ?? generateId();
  const { planLabel, planLabels } = resolvePlanFields(data);

  const countRows = await sql`
    SELECT COUNT(*)::int AS count FROM sms_send_reports WHERE campaign_id = ${data.campaignId ?? ""}
  `;
  const sortOrder = data.sortOrder ?? (Number(countRows[0]?.count) || 0) + 1;

  await sql`
    INSERT INTO sms_send_reports (
      id, campaign_id, owner_user_id, title, send_date, recipient_count, message_body,
      evidence_file_url, evidence_file_name, evidence_mime_type, evidence_file_size,
      published, sort_order, plan_label, plan_labels, created_at, updated_at
    ) VALUES (
      ${id},
      ${data.campaignId ?? ""},
      ${data.ownerUserId ?? null},
      ${data.title ?? ""},
      ${data.sendDate ?? now.split("T")[0]},
      ${data.recipientCount ?? 0},
      ${data.messageBody ?? ""},
      ${data.evidenceFileUrl ?? null},
      ${data.evidenceFileName ?? null},
      ${data.evidenceMimeType ?? null},
      ${data.evidenceFileSize ?? 0},
      ${data.published ?? true},
      ${sortOrder},
      ${planLabel},
      ${sql.json(planLabels)},
      ${now},
      ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      send_date = EXCLUDED.send_date,
      recipient_count = EXCLUDED.recipient_count,
      message_body = EXCLUDED.message_body,
      evidence_file_url = EXCLUDED.evidence_file_url,
      evidence_file_name = EXCLUDED.evidence_file_name,
      evidence_mime_type = EXCLUDED.evidence_mime_type,
      evidence_file_size = EXCLUDED.evidence_file_size,
      published = EXCLUDED.published,
      sort_order = EXCLUDED.sort_order,
      owner_user_id = COALESCE(EXCLUDED.owner_user_id, sms_send_reports.owner_user_id),
      plan_label = EXCLUDED.plan_label,
      plan_labels = EXCLUDED.plan_labels,
      updated_at = EXCLUDED.updated_at
  `;

  return { success: true, id };
}

export async function pgDeleteSmsSendReport(id: string) {
  const sql = getSql();
  await sql`DELETE FROM sms_send_reports WHERE id = ${id}`;
  return { success: true };
}

export async function pgGetCampaignActivities(
  campaignId: string,
  ownerUserId?: OwnerScope
): Promise<CampaignActivity[]> {
  const sql = getSql();
  const ownerFilter = sqlOwnerIn(sql, ownerUserId, "ca.owner_user_id");
  const rows = await sql`
    SELECT ca.*, u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name
    FROM campaign_activities ca
    LEFT JOIN users u ON u.id = ca.owner_user_id

    LEFT JOIN ministries om ON om.id = u.ministry_id

    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE ca.campaign_id = ${campaignId}
    ${ownerFilter}
    ORDER BY ca.activity_date DESC, ca.sort_order
  `;

  return rows.map(mapCampaignActivityFromDb);
}

export async function pgSaveCampaignActivity(data: Partial<CampaignActivity> & { id?: string }) {
  const sql = getSql();
  const now = new Date().toISOString();
  const id = data.id ?? generateId();
  const { planLabel, planLabels } = resolvePlanFields(data);

  const countRows = await sql`
    SELECT COUNT(*)::int AS count FROM campaign_activities WHERE campaign_id = ${data.campaignId ?? ""}
  `;
  const sortOrder = data.sortOrder ?? (Number(countRows[0]?.count) || 0) + 1;

  await sql`
    INSERT INTO campaign_activities (
      id, campaign_id, owner_user_id, title, activity_type, activity_date,
      location, link, image_url, video_url, media_items, description, is_creative, published, sort_order, plan_label, plan_labels, created_at, updated_at
    ) VALUES (
      ${id},
      ${data.campaignId ?? ""},
      ${data.ownerUserId ?? null},
      ${data.title ?? ""},
      ${data.activityType ?? "other"},
      ${data.activityDate ?? now.split("T")[0]},
      ${data.location ?? ""},
      ${data.link ?? ""},
      ${data.imageUrl ?? null},
      ${data.videoUrl ?? null},
      ${sql.json(JSON.parse(JSON.stringify(data.mediaItems ?? [])))},
      ${data.description ?? null},
      ${data.isCreative ?? false},
      ${data.published ?? true},
      ${sortOrder},
      ${planLabel},
      ${sql.json(planLabels)},
      ${now},
      ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      activity_type = EXCLUDED.activity_type,
      activity_date = EXCLUDED.activity_date,
      location = EXCLUDED.location,
      link = EXCLUDED.link,
      image_url = EXCLUDED.image_url,
      video_url = EXCLUDED.video_url,
      media_items = EXCLUDED.media_items,
      description = EXCLUDED.description,
      is_creative = EXCLUDED.is_creative,
      published = EXCLUDED.published,
      sort_order = EXCLUDED.sort_order,
      owner_user_id = COALESCE(EXCLUDED.owner_user_id, campaign_activities.owner_user_id),
      plan_label = EXCLUDED.plan_label,
      plan_labels = EXCLUDED.plan_labels,
      updated_at = EXCLUDED.updated_at
  `;

  await recalculateScoreAfterSave({
    campaignId: data.campaignId ?? "",
    contentType: "activity",
    contentId: id,
  });

  return { success: true, id };
}

export async function pgDeleteCampaignActivity(id: string) {
  const sql = getSql();
  await sql`DELETE FROM campaign_activities WHERE id = ${id}`;
  return { success: true };
}

export async function pgGetNotificationReads(readerKey: string): Promise<string[]> {
  const sql = getSql();
  const rows = await sql<{ content_key: string }[]>`
    SELECT content_key FROM user_notification_reads
    WHERE reader_key = ${readerKey}
  `;
  return rows.map((row) => row.content_key);
}

export async function pgMarkNotificationReads(
  readerKey: string,
  contentKeys: string[],
  confirmed = false
) {
  if (contentKeys.length === 0) return { success: true };
  const sql = getSql();
  const now = new Date().toISOString();

  for (const contentKey of contentKeys) {
    await sql`
      INSERT INTO user_notification_reads (reader_key, content_key, seen_at, confirmed)
      VALUES (${readerKey}, ${contentKey}, ${now}, ${confirmed})
      ON CONFLICT (reader_key, content_key) DO UPDATE SET
        seen_at = EXCLUDED.seen_at,
        confirmed = CASE WHEN EXCLUDED.confirmed THEN true ELSE user_notification_reads.confirmed END
    `;
  }

  return { success: true };
}

export interface MeetingTaskPayload {
  id?: string;
  title: string;
  completed: boolean;
  sortOrder: number;
}

export interface MeetingDecisionPayload {
  id?: string;
  title: string;
  sortOrder: number;
}

function groupMeetingTasks(rows: MeetingTask[]): Map<string, MeetingTask[]> {
  const map = new Map<string, MeetingTask[]>();
  for (const task of rows) {
    const list = map.get(task.meetingId) ?? [];
    list.push(task);
    map.set(task.meetingId, list);
  }
  return map;
}

function groupMeetingDecisions(rows: MeetingDecision[]): Map<string, MeetingDecision[]> {
  const map = new Map<string, MeetingDecision[]>();
  for (const decision of rows) {
    const list = map.get(decision.meetingId) ?? [];
    list.push(decision);
    map.set(decision.meetingId, list);
  }
  return map;
}

export async function pgGetPublicMeetingPreviews(campaignId: string): Promise<MeetingPublicPreview[]> {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        m.id,
        m.campaign_id,
        m.meeting_date,
        m.title,
        m.image_url,
        m.discussion_summary,
        m.sort_order,
        m.owner_user_id,
        u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name,
        (cs.meetings_view_password_hash IS NOT NULL AND LENGTH(cs.meetings_view_password_hash) > 0) AS has_password
      FROM campaign_meetings m
      INNER JOIN campaign_settings cs ON cs.id = m.campaign_id
      LEFT JOIN users u ON u.id = m.owner_user_id

      LEFT JOIN ministries om ON om.id = u.ministry_id

      LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
      WHERE m.campaign_id = ${campaignId}
      ORDER BY m.meeting_date DESC, m.sort_order
    `;

    return rows.map(mapMeetingPreviewFromDb);
  } catch (error) {
    console.error("pgGetPublicMeetingPreviews failed:", error);
    return [];
  }
}

export type MeetingUnlockResult =
  | { status: "ok"; meeting: MeetingPublicDetail }
  | { status: "not_found" }
  | { status: "wrong_password" };

export type CampaignMeetingsUnlockResult =
  | { status: "ok"; meetings: MeetingPublicDetail[] }
  | { status: "not_found" }
  | { status: "wrong_password" };

async function loadMeetingDetailsForCampaign(
  sql: ReturnType<typeof getSql>,
  campaignId: string
): Promise<MeetingPublicDetail[]> {
  const meetingRows = await sql`
    SELECT * FROM campaign_meetings
    WHERE campaign_id = ${campaignId} AND published = true
    ORDER BY meeting_date DESC, sort_order
  `;

  if (meetingRows.length === 0) return [];

  const meetingIds = meetingRows.map((row) => row.id as string);

  const taskRows = await sql`
    SELECT * FROM meeting_tasks
    WHERE meeting_id IN ${sql(meetingIds)}
    ORDER BY sort_order
  `;

  const decisionRows = await sql`
    SELECT * FROM meeting_decisions
    WHERE meeting_id IN ${sql(meetingIds)}
    ORDER BY sort_order
  `;

  const tasksByMeeting = new Map<string, Record<string, unknown>[]>();
  for (const task of taskRows) {
    const meetingId = task.meeting_id as string;
    const list = tasksByMeeting.get(meetingId) ?? [];
    list.push(task);
    tasksByMeeting.set(meetingId, list);
  }

  const decisionsByMeeting = new Map<string, Record<string, unknown>[]>();
  for (const decision of decisionRows) {
    const meetingId = decision.meeting_id as string;
    const list = decisionsByMeeting.get(meetingId) ?? [];
    list.push(decision);
    decisionsByMeeting.set(meetingId, list);
  }

  return meetingRows.map((row) =>
    mapMeetingPublicDetailFromDb(
      row,
      tasksByMeeting.get(row.id as string) ?? [],
      decisionsByMeeting.get(row.id as string) ?? []
    )
  );
}

export async function pgUnlockCampaignMeetings(
  slug: string,
  password: string
): Promise<CampaignMeetingsUnlockResult> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, meetings_view_password_hash
    FROM campaign_settings
    WHERE slug = ${slug} AND published = true
    LIMIT 1
  `;

  if (!rows[0]) return { status: "not_found" };

  const campaignId = rows[0].id as string;
  const hash = rows[0].meetings_view_password_hash as string | null;

  if (hash) {
    const valid = await verifyPassword(password, hash);
    if (!valid) return { status: "wrong_password" };
  }

  const meetings = await loadMeetingDetailsForCampaign(sql, campaignId);
  return { status: "ok", meetings };
}

export async function pgUpdateMeetingsViewPassword(campaignId: string, passwordHash: string | null) {
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`
    UPDATE campaign_settings
    SET meetings_view_password_hash = ${passwordHash}, updated_at = ${now}
    WHERE id = ${campaignId}
  `;
  return { success: true };
}

export async function pgUpdatePageViewPassword(campaignId: string, passwordHash: string | null) {
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`
    UPDATE campaign_settings
    SET page_view_password_hash = ${passwordHash}, updated_at = ${now}
    WHERE id = ${campaignId}
  `;
  return { success: true };
}

export async function pgVerifyCampaignPagePassword(
  slug: string,
  password: string
): Promise<
  | { status: "not_found" }
  | { status: "wrong_password" }
  | { status: "ok"; passwordHash: string | null; title: string }
> {
  const sql = getSql();
  const rows = await sql`
    SELECT title, page_view_password_hash
    FROM campaign_settings
    WHERE slug = ${slug} AND published = true
    LIMIT 1
  `;

  if (!rows[0]) return { status: "not_found" };

  const hash = (rows[0].page_view_password_hash as string | null) ?? null;
  if (hash) {
    const valid = await verifyPassword(password, hash);
    if (!valid) return { status: "wrong_password" };
  }

  return {
    status: "ok",
    passwordHash: hash,
    title: String(rows[0].title ?? ""),
  };
}

export async function pgUnlockMeetingDetail(
  meetingId: string,
  password: string
): Promise<MeetingUnlockResult> {
  const sql = getSql();
  const rows = await sql`
    SELECT m.*, cs.meetings_view_password_hash
    FROM campaign_meetings m
    INNER JOIN campaign_settings cs ON cs.id = m.campaign_id
    WHERE m.id = ${meetingId} AND m.published = true
    LIMIT 1
  `;

  if (!rows[0]) return { status: "not_found" };

  const hash = rows[0].meetings_view_password_hash as string | null;
  if (hash) {
    const valid = await verifyPassword(password, hash);
    if (!valid) return { status: "wrong_password" };
  }

  const taskRows = await sql`
    SELECT * FROM meeting_tasks
    WHERE meeting_id = ${meetingId}
    ORDER BY sort_order
  `;

  const decisionRows = await sql`
    SELECT * FROM meeting_decisions
    WHERE meeting_id = ${meetingId}
    ORDER BY sort_order
  `;

  return {
    status: "ok",
    meeting: mapMeetingPublicDetailFromDb(rows[0], taskRows, decisionRows),
  };
}

export async function pgGetMeetingsWithTasks(
  campaignId: string,
  options?: { publishedOnly?: boolean; ownerUserId?: OwnerScope }
): Promise<MeetingWithTasks[]> {
  try {
    const sql = getSql();
    const publishedOnly = options?.publishedOnly ?? false;
    const ownerFilter = sqlOwnerIn(sql, options?.ownerUserId, "m.owner_user_id");
    const publishedFilter = publishedOnly ? sql`AND m.published = true` : sql``;

    const meetingRows = await sql`
      SELECT m.*, u.name AS owner_name, u.province AS owner_province, u.city AS owner_city, u.ministry_id AS owner_ministry_id, om.name AS owner_ministry_name, u.organization_id AS owner_organization_id, oo.name AS owner_organization_name
      FROM campaign_meetings m
      LEFT JOIN users u ON u.id = m.owner_user_id

      LEFT JOIN ministries om ON om.id = u.ministry_id

      LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
      WHERE m.campaign_id = ${campaignId}
      ${ownerFilter}
      ${publishedFilter}
      ORDER BY m.meeting_date DESC, m.sort_order
    `;

    if (meetingRows.length === 0) return [];

    const taskRows = await sql`
      SELECT mt.*
      FROM meeting_tasks mt
      INNER JOIN campaign_meetings m ON m.id = mt.meeting_id
      WHERE m.campaign_id = ${campaignId}
      ${ownerFilter}
      ${publishedFilter}
      ORDER BY mt.sort_order
    `;

    const decisionRows = await sql`
      SELECT md.*
      FROM meeting_decisions md
      INNER JOIN campaign_meetings m ON m.id = md.meeting_id
      WHERE m.campaign_id = ${campaignId}
      ${ownerFilter}
      ${publishedFilter}
      ORDER BY md.sort_order
    `;

    const tasksByMeeting = groupMeetingTasks(taskRows.map(mapMeetingTaskFromDb));
    const decisionsByMeeting = groupMeetingDecisions(decisionRows.map(mapMeetingDecisionFromDb));

    return meetingRows.map((row) => ({
      ...mapMeetingFromDb(row),
      tasks: tasksByMeeting.get(row.id) ?? [],
      decisions: decisionsByMeeting.get(row.id) ?? [],
    }));
  } catch (error) {
    console.error("pgGetMeetingsWithTasks failed:", error);
    return [];
  }
}

export async function pgSaveMeetingWithTasks(
  data: Partial<CampaignMeeting> & { id?: string },
  tasks: MeetingTaskPayload[],
  decisions: MeetingDecisionPayload[] = []
) {
  const sql = getSql();
  const now = new Date().toISOString();
  const id = data.id ?? generateId();

  const countRows = await sql`
    SELECT COUNT(*)::int AS count FROM campaign_meetings WHERE campaign_id = ${data.campaignId ?? ""}
  `;
  const sortOrder = data.sortOrder ?? (Number(countRows[0]?.count) || 0) + 1;
  const attendees = JSON.stringify(data.attendees ?? []);

  if (data.id) {
    await sql`
      INSERT INTO campaign_meetings (
        id, campaign_id, owner_user_id, title, meeting_date, location, image_url,
        discussion_summary, attendees, audio_url, view_password_hash,
        published, sort_order, created_at, updated_at
      ) VALUES (
        ${id},
        ${data.campaignId ?? ""},
        ${data.ownerUserId ?? null},
        ${data.title ?? ""},
        ${data.meetingDate ?? now.split("T")[0]},
        ${data.location ?? ""},
        ${data.imageUrl ?? null},
        ${data.discussionSummary ?? ""},
        ${sql.json(JSON.parse(attendees))},
        ${data.audioUrl ?? null},
        ${null},
        ${data.published ?? false},
        ${sortOrder},
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        meeting_date = EXCLUDED.meeting_date,
        location = EXCLUDED.location,
        image_url = EXCLUDED.image_url,
        discussion_summary = EXCLUDED.discussion_summary,
        attendees = EXCLUDED.attendees,
        audio_url = EXCLUDED.audio_url,
        published = EXCLUDED.published,
        sort_order = EXCLUDED.sort_order,
        owner_user_id = COALESCE(EXCLUDED.owner_user_id, campaign_meetings.owner_user_id),
        updated_at = EXCLUDED.updated_at
      `;
  } else {
    await sql`
      INSERT INTO campaign_meetings (
        id, campaign_id, owner_user_id, title, meeting_date, location, image_url,
        discussion_summary, attendees, audio_url, view_password_hash,
        published, sort_order, created_at, updated_at
      ) VALUES (
        ${id},
        ${data.campaignId ?? ""},
        ${data.ownerUserId ?? null},
        ${data.title ?? ""},
        ${data.meetingDate ?? now.split("T")[0]},
        ${data.location ?? ""},
        ${data.imageUrl ?? null},
        ${data.discussionSummary ?? ""},
        ${sql.json(JSON.parse(attendees))},
        ${data.audioUrl ?? null},
        ${null},
        ${data.published ?? false},
        ${sortOrder},
        ${now},
        ${now}
      )
    `;
  }

  const keptIds: string[] = [];
  for (const task of tasks) {
    const taskId = task.id ?? generateId();
    keptIds.push(taskId);
    await sql`
      INSERT INTO meeting_tasks (
        id, meeting_id, title, completed, sort_order, created_at, updated_at
      ) VALUES (
        ${taskId},
        ${id},
        ${task.title},
        ${task.completed},
        ${task.sortOrder},
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        completed = EXCLUDED.completed,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at
    `;
  }

  if (keptIds.length === 0) {
    await sql`DELETE FROM meeting_tasks WHERE meeting_id = ${id}`;
  } else {
    await sql`
      DELETE FROM meeting_tasks
      WHERE meeting_id = ${id}
      AND id NOT IN ${sql(keptIds)}
    `;
  }

  const keptDecisionIds: string[] = [];
  for (const decision of decisions) {
    const decisionId = decision.id ?? generateId();
    keptDecisionIds.push(decisionId);
    await sql`
      INSERT INTO meeting_decisions (
        id, meeting_id, title, sort_order, created_at, updated_at
      ) VALUES (
        ${decisionId},
        ${id},
        ${decision.title},
        ${decision.sortOrder},
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at
    `;
  }

  if (keptDecisionIds.length === 0) {
    await sql`DELETE FROM meeting_decisions WHERE meeting_id = ${id}`;
  } else {
    await sql`
      DELETE FROM meeting_decisions
      WHERE meeting_id = ${id}
      AND id NOT IN ${sql(keptDecisionIds)}
    `;
  }

  await recalculateScoreAfterSave({
    campaignId: data.campaignId ?? "",
    contentType: "meeting",
    contentId: id,
  });

  return { success: true, id };
}

export async function pgDeleteMeeting(id: string) {
  const sql = getSql();
  await sql`DELETE FROM campaign_meetings WHERE id = ${id}`;
  return { success: true };
}

export async function pgGetMeetingById(id: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, campaign_id, owner_user_id
    FROM campaign_meetings
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return {
    id: String(rows[0].id),
    campaignId: String(rows[0].campaign_id),
    ownerUserId: rows[0].owner_user_id ? String(rows[0].owner_user_id) : null,
  };
}

export async function pgGetMeetingTaskOwner(taskId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT m.id, m.campaign_id, m.owner_user_id
    FROM meeting_tasks t
    INNER JOIN campaign_meetings m ON m.id = t.meeting_id
    WHERE t.id = ${taskId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return {
    meetingId: String(rows[0].id),
    campaignId: String(rows[0].campaign_id),
    ownerUserId: rows[0].owner_user_id ? String(rows[0].owner_user_id) : null,
  };
}

export async function pgToggleMeetingTask(taskId: string, completed: boolean) {
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`
    UPDATE meeting_tasks
    SET completed = ${completed}, updated_at = ${now}
    WHERE id = ${taskId}
  `;
  return { success: true };
}

export async function pgGetCampaignBackupData(campaignId: string) {
  const sql = getSql();
  const settings = await sql`SELECT * FROM campaign_settings WHERE id = ${campaignId} LIMIT 1`;
  if (!settings[0]) return null;

  const [
    billboards,
    posterCategories,
    posters,
    posterVersions,
    videoCategories,
    videos,
    videoVersions,
    analytics,
    submissions,
    files,
    socialPosts,
    broadcastReports,
  ] = await Promise.all([
    sql`SELECT * FROM billboards WHERE campaign_id = ${campaignId}`,
    sql`SELECT * FROM media_categories WHERE campaign_id = ${campaignId} AND type = 'poster'`,
    sql`SELECT * FROM posters WHERE campaign_id = ${campaignId}`,
    sql`
      SELECT pv.* FROM poster_versions pv
      INNER JOIN posters p ON p.id = pv.poster_id
      WHERE p.campaign_id = ${campaignId}
    `,
    sql`SELECT * FROM media_categories WHERE campaign_id = ${campaignId} AND type = 'video'`,
    sql`SELECT * FROM videos WHERE campaign_id = ${campaignId}`,
    sql`
      SELECT vv.* FROM video_versions vv
      INNER JOIN videos v ON v.id = vv.video_id
      WHERE v.campaign_id = ${campaignId}
    `,
    sql`SELECT * FROM analytics_metrics WHERE campaign_id = ${campaignId}`,
    sql`SELECT * FROM campaign_submissions WHERE campaign_id = ${campaignId}`,
    sql`SELECT * FROM campaign_files WHERE campaign_id = ${campaignId}`,
    sql`SELECT * FROM social_media_posts WHERE campaign_id = ${campaignId}`,
    sql`SELECT * FROM broadcast_reports WHERE campaign_id = ${campaignId}`,
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    campaign: settings[0],
    billboards,
    posterCategories,
    posters,
    posterVersions,
    videoCategories,
    videos,
    videoVersions,
    analytics,
    submissions,
    files,
    socialPosts,
    broadcastReports,
  };
}
