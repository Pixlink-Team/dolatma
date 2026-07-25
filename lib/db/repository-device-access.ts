import { getSql } from "@/lib/db/client";
import { ensureDeviceSchema } from "@/lib/db/repository-devices";
import {
  defaultContributorPermissions,
  intersectContributorPermissions,
  normalizeContributorPermissions,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";

async function ensureDeviceAccessSchema(): Promise<void> {
  await ensureDeviceSchema();
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS device_campaign_access (
      device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (device_id, campaign_id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_device_campaign_access_campaign
      ON device_campaign_access(campaign_id)
  `;
}

/** Home device for a user row: org node wins, then ministry root, then device_id. */
export function resolveHomeDeviceId(input: {
  organizationId?: string | null;
  ministryId?: string | null;
  deviceId?: string | null;
}): string | null {
  const org = input.organizationId?.trim() || null;
  if (org) return org;
  const ministry = input.ministryId?.trim() || null;
  if (ministry) return ministry;
  return input.deviceId?.trim() || null;
}

/** Own stored permissions for one device + campaign (no ancestor walk). */
export async function pgGetDevicePermissionsForCampaign(
  deviceId: string,
  campaignId: string
): Promise<ContributorPermissions | null> {
  await ensureDeviceAccessSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT permissions FROM device_campaign_access
    WHERE device_id = ${deviceId} AND campaign_id = ${campaignId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return normalizeContributorPermissions(rows[0].permissions);
}

/** All campaign permission rows stored on a device. */
export async function pgGetDeviceCampaignPermissions(
  deviceId: string
): Promise<Record<string, ContributorPermissions>> {
  await ensureDeviceAccessSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT campaign_id, permissions FROM device_campaign_access
    WHERE device_id = ${deviceId}
  `;
  const out: Record<string, ContributorPermissions> = {};
  for (const row of rows) {
    out[String(row.campaign_id)] = normalizeContributorPermissions(row.permissions);
  }
  return out;
}

/**
 * Effective ceiling for a device: intersect own + ancestor device permissions
 * that have an explicit row. Returns null when nothing in the chain is set
 * (no ceiling — legacy / unrestricted relative to stored user grants).
 */
export async function pgGetEffectiveDeviceCeiling(
  deviceId: string,
  campaignId: string
): Promise<ContributorPermissions | null> {
  await ensureDeviceAccessSchema();
  const sql = getSql();
  const rows = await sql`
    WITH RECURSIVE chain AS (
      SELECT d.id, d.parent_id, 0 AS depth
      FROM devices d
      WHERE d.id = ${deviceId}
      UNION ALL
      SELECT p.id, p.parent_id, c.depth + 1
      FROM devices p
      INNER JOIN chain c ON p.id = c.parent_id
    )
    SELECT a.permissions, c.depth
    FROM chain c
    INNER JOIN device_campaign_access a
      ON a.device_id = c.id AND a.campaign_id = ${campaignId}
    ORDER BY c.depth DESC
  `;
  if (rows.length === 0) return null;

  let ceiling = normalizeContributorPermissions(rows[0].permissions);
  for (let i = 1; i < rows.length; i++) {
    ceiling = intersectContributorPermissions(
      ceiling,
      normalizeContributorPermissions(rows[i].permissions)
    );
  }
  return ceiling;
}

/** Parent-chain ceiling only (excludes the device itself) — used when editing a node. */
export async function pgGetParentDeviceCeiling(
  deviceId: string,
  campaignId: string
): Promise<ContributorPermissions | null> {
  await ensureDeviceAccessSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT parent_id FROM devices WHERE id = ${deviceId} LIMIT 1
  `;
  const parentId = rows[0]?.parent_id ? String(rows[0].parent_id) : null;
  if (!parentId) return null;
  return pgGetEffectiveDeviceCeiling(parentId, campaignId);
}

async function listSubtreeDeviceIds(rootId: string): Promise<string[]> {
  const sql = getSql();
  const rows = await sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM devices WHERE id = ${rootId}
      UNION ALL
      SELECT c.id FROM devices c
      INNER JOIN subtree s ON c.parent_id = s.id
    )
    SELECT id FROM subtree
  `;
  return rows.map((row) => String(row.id));
}

async function listUserIdsInDeviceSubtree(rootId: string): Promise<string[]> {
  const sql = getSql();
  const rows = await sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM devices WHERE id = ${rootId}
      UNION ALL
      SELECT c.id FROM devices c
      INNER JOIN subtree s ON c.parent_id = s.id
    )
    SELECT DISTINCT u.id
    FROM users u
    WHERE u.device_id IN (SELECT id FROM subtree)
       OR u.organization_id IN (SELECT id FROM subtree)
       OR (u.ministry_id IN (SELECT id FROM subtree) AND u.organization_id IS NULL)
  `;
  return rows.map((row) => String(row.id));
}

/**
 * Save device permissions and optionally cascade:
 * - clamp descendant device rows that already have access
 * - clamp all users whose home is in the subtree
 */
export async function pgSaveDeviceCampaignAccess(input: {
  deviceId: string;
  campaignId: string;
  permissions: ContributorPermissions;
  applyToSubtree?: boolean;
}): Promise<
  | {
      success: true;
      permissions: ContributorPermissions;
      clampedUsers: number;
      clampedDevices: number;
    }
  | { success: false; error: string }
> {
  try {
    await ensureDeviceAccessSchema();
    const sql = getSql();
    const applyToSubtree = input.applyToSubtree !== false;
    const now = new Date().toISOString();

    const parentCeiling = await pgGetParentDeviceCeiling(
      input.deviceId,
      input.campaignId
    );
    let permissions = normalizeContributorPermissions(input.permissions);
    if (parentCeiling) {
      permissions = intersectContributorPermissions(permissions, parentCeiling);
    }

    await sql`
      INSERT INTO device_campaign_access (device_id, campaign_id, permissions, created_at, updated_at)
      VALUES (
        ${input.deviceId},
        ${input.campaignId},
        ${sql.json(JSON.parse(JSON.stringify(permissions)))},
        ${now},
        ${now}
      )
      ON CONFLICT (device_id, campaign_id) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        updated_at = EXCLUDED.updated_at
    `;

    let clampedDevices = 0;
    let clampedUsers = 0;

    if (applyToSubtree) {
      const subtreeIds = await listSubtreeDeviceIds(input.deviceId);
      const descendantIds = subtreeIds.filter((id) => id !== input.deviceId);

      if (descendantIds.length > 0) {
        const childRows = await sql`
          SELECT device_id, permissions FROM device_campaign_access
          WHERE campaign_id = ${input.campaignId}
            AND device_id IN ${sql(descendantIds)}
        `;
        for (const row of childRows) {
          const deviceId = String(row.device_id);
          const clamped = intersectContributorPermissions(
            normalizeContributorPermissions(row.permissions),
            permissions
          );
          await sql`
            UPDATE device_campaign_access
            SET permissions = ${sql.json(JSON.parse(JSON.stringify(clamped)))},
                updated_at = ${now}
            WHERE device_id = ${deviceId} AND campaign_id = ${input.campaignId}
          `;
          clampedDevices += 1;
        }
      }

      const userIds = await listUserIdsInDeviceSubtree(input.deviceId);
      for (const userId of userIds) {
        const accessRows = await sql`
          SELECT permissions FROM user_campaign_access
          WHERE user_id = ${userId} AND campaign_id = ${input.campaignId}
          LIMIT 1
        `;
        if (!accessRows[0]) continue;
        const clamped = intersectContributorPermissions(
          normalizeContributorPermissions(accessRows[0].permissions),
          permissions
        );
        await sql`
          UPDATE user_campaign_access
          SET permissions = ${sql.json(JSON.parse(JSON.stringify(clamped)))}
          WHERE user_id = ${userId} AND campaign_id = ${input.campaignId}
        `;
        clampedUsers += 1;
      }
    }

    return {
      success: true,
      permissions,
      clampedUsers,
      clampedDevices,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ذخیره دسترسی دستگاه ناموفق بود";
    return { success: false, error: message };
  }
}

/** Clear explicit device permissions (subtree falls back to ancestors / no ceiling). */
export async function pgClearDeviceCampaignAccess(
  deviceId: string,
  campaignId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await ensureDeviceAccessSchema();
    const sql = getSql();
    await sql`
      DELETE FROM device_campaign_access
      WHERE device_id = ${deviceId} AND campaign_id = ${campaignId}
    `;
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "حذف دسترسی دستگاه ناموفق بود";
    return { success: false, error: message };
  }
}

/**
 * Clamp a permission map to the effective ceiling of a home device.
 * When no ceiling exists, returns the input unchanged.
 */
export async function clampPermissionsToDeviceCeiling(
  homeDeviceId: string | null | undefined,
  campaignId: string,
  permissions: ContributorPermissions
): Promise<ContributorPermissions> {
  if (!homeDeviceId) return permissions;
  const ceiling = await pgGetEffectiveDeviceCeiling(homeDeviceId, campaignId);
  if (!ceiling) return permissions;
  return intersectContributorPermissions(permissions, ceiling);
}

export async function clampCampaignPermissionsToDeviceCeiling(
  homeDeviceId: string | null | undefined,
  campaignPermissions: Record<string, ContributorPermissions> | undefined,
  campaignIds: string[]
): Promise<Record<string, ContributorPermissions>> {
  const out: Record<string, ContributorPermissions> = {};
  for (const campaignId of campaignIds) {
    const requested = normalizeContributorPermissions(
      campaignPermissions?.[campaignId] ?? defaultContributorPermissions()
    );
    out[campaignId] = await clampPermissionsToDeviceCeiling(
      homeDeviceId,
      campaignId,
      requested
    );
  }
  return out;
}
