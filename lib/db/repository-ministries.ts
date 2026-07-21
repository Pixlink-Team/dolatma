import { getSql } from "@/lib/db/client";
import type { Ministry, MinistryOrganization } from "@/lib/types";
import { generateId } from "@/lib/utils";

function mapMinistry(row: Record<string, unknown>): Ministry {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    fullName:
      typeof row.full_name === "string" && row.full_name.trim()
        ? row.full_name.trim()
        : null,
    description:
      typeof row.description === "string" && row.description.trim()
        ? row.description.trim()
        : null,
    isActive: row.is_active !== false,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? new Date().toISOString()),
  };
}

function mapOrganization(row: Record<string, unknown>): MinistryOrganization {
  return {
    id: String(row.id),
    ministryId: String(row.ministry_id),
    ministryName:
      typeof row.ministry_name === "string" && row.ministry_name.trim()
        ? row.ministry_name.trim()
        : null,
    name: String(row.name ?? ""),
    fullName:
      typeof row.full_name === "string" && row.full_name.trim()
        ? row.full_name.trim()
        : null,
    isActive: row.is_active !== false,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? new Date().toISOString()),
  };
}

/** Ensure organizations table/columns exist on older databases without a fresh migrate. */
async function ensureMinistryOrgSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS ministry_organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      full_name TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (ministry_id, name)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_ministry_organizations_ministry
      ON ministry_organizations(ministry_id)
  `;
  await sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS organization_id UUID
      REFERENCES ministry_organizations(id) ON DELETE SET NULL
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id)
  `;
  await sql`
    ALTER TABLE campaign_directives
      ADD COLUMN IF NOT EXISTS audience_organization_id UUID
      REFERENCES ministry_organizations(id) ON DELETE SET NULL
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_campaign_directives_audience_organization
      ON campaign_directives(audience_organization_id)
  `;
}

export async function pgListMinistries(options?: {
  includeOrganizations?: boolean;
}): Promise<Ministry[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM ministries
    ORDER BY name ASC
  `;
  const ministries = rows.map((row) => mapMinistry(row as Record<string, unknown>));

  if (!options?.includeOrganizations || ministries.length === 0) {
    return ministries;
  }

  const orgRows = await sql`
    SELECT o.*, m.name AS ministry_name
    FROM ministry_organizations o
    JOIN ministries m ON m.id = o.ministry_id
    ORDER BY o.name ASC
  `;
  const byMinistry = new Map<string, MinistryOrganization[]>();
  for (const row of orgRows) {
    const org = mapOrganization(row as Record<string, unknown>);
    const list = byMinistry.get(org.ministryId) ?? [];
    list.push(org);
    byMinistry.set(org.ministryId, list);
  }

  return ministries.map((ministry) => ({
    ...ministry,
    organizations: byMinistry.get(ministry.id) ?? [],
  }));
}

export async function pgListOrganizations(ministryId?: string): Promise<MinistryOrganization[]> {
  const sql = getSql();
  const rows = ministryId
    ? await sql`
        SELECT o.*, m.name AS ministry_name
        FROM ministry_organizations o
        JOIN ministries m ON m.id = o.ministry_id
        WHERE o.ministry_id = ${ministryId}
        ORDER BY o.name ASC
      `
    : await sql`
        SELECT o.*, m.name AS ministry_name
        FROM ministry_organizations o
        JOIN ministries m ON m.id = o.ministry_id
        ORDER BY m.name ASC, o.name ASC
      `;
  return rows.map((row) => mapOrganization(row as Record<string, unknown>));
}

export async function pgGetOrganizationById(
  id: string
): Promise<MinistryOrganization | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT o.*, m.name AS ministry_name
    FROM ministry_organizations o
    JOIN ministries m ON m.id = o.ministry_id
    WHERE o.id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapOrganization(rows[0] as Record<string, unknown>);
}

export async function pgGetMinistryById(id: string): Promise<Ministry | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM ministries WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return null;
  return mapMinistry(rows[0] as Record<string, unknown>);
}

export async function pgEnsureDefaultMinistries(): Promise<void> {
  const { pgEnsureDefaultDevices } = await import("@/lib/db/repository-devices");
  await pgEnsureDefaultDevices();
}

export async function pgSaveMinistry(data: {
  id?: string;
  name: string;
  fullName?: string | null;
  description?: string | null;
  isActive?: boolean;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  const id = data.id ?? generateId();
  const name = data.name.trim();
  const fullName = data.fullName?.trim() || null;
  const description = data.description?.trim() || null;
  const isActive = data.isActive !== false;
  if (!name) {
    return { success: false, error: "نام وزارتخانه الزامی است" };
  }

  try {
    if (data.id) {
      await sql`
        UPDATE ministries SET
          name = ${name},
          full_name = ${fullName},
          description = ${description},
          is_active = ${isActive}
        WHERE id = ${id}
      `;
    } else {
      const now = new Date().toISOString();
      await sql`
        INSERT INTO ministries (id, name, full_name, description, is_active, created_at)
        VALUES (${id}, ${name}, ${fullName}, ${description}, ${isActive}, ${now})
      `;
    }

    // Dual-write into unified devices table (same UUID).
    try {
      const { ensureDeviceSchema, pgSaveDevice } = await import("@/lib/db/repository-devices");
      await ensureDeviceSchema();
      await pgSaveDevice({
        id,
        name: fullName || name,
        shortName: name,
        type: "ministry",
        parentId: null,
        mission: description,
        status: isActive ? "active" : "inactive",
        activityScope: "national",
      });
    } catch {
      // Devices table may not exist yet on very old DBs; migrate handles it.
    }

    return { success: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ذخیره وزارتخانه ناموفق بود";
    if (message.includes("duplicate key") || message.includes("unique")) {
      return { success: false, error: "این نام وزارتخانه قبلاً ثبت شده است" };
    }
    return { success: false, error: message };
  }
}

export async function pgSaveOrganization(data: {
  id?: string;
  ministryId: string;
  name: string;
  fullName?: string | null;
  isActive?: boolean;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureMinistryOrgSchema();
  const id = data.id ?? generateId();
  const ministryId = data.ministryId.trim();
  const name = data.name.trim();
  const fullName = data.fullName?.trim() || null;
  const isActive = data.isActive !== false;

  if (!ministryId) return { success: false, error: "وزارتخانه الزامی است" };
  if (!name) return { success: false, error: "نام زیرمجموعه الزامی است" };

  try {
    if (data.id) {
      await sql`
        UPDATE ministry_organizations SET
          ministry_id = ${ministryId},
          name = ${name},
          full_name = ${fullName},
          is_active = ${isActive}
        WHERE id = ${id}
      `;
    } else {
      const now = new Date().toISOString();
      await sql`
        INSERT INTO ministry_organizations (
          id, ministry_id, name, full_name, is_active, created_at
        )
        VALUES (${id}, ${ministryId}, ${name}, ${fullName}, ${isActive}, ${now})
      `;
    }

    try {
      const { ensureDeviceSchema, pgSaveDevice } = await import("@/lib/db/repository-devices");
      await ensureDeviceSchema();
      await pgSaveDevice({
        id,
        name: fullName || name,
        shortName: name,
        type: "organization",
        parentId: ministryId,
        status: isActive ? "active" : "inactive",
        activityScope: "national",
      });
    } catch {
      // Devices table may not exist yet on very old DBs.
    }

    return { success: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ذخیره زیرمجموعه ناموفق بود";
    if (message.includes("duplicate key") || message.includes("unique")) {
      return { success: false, error: "این زیرمجموعه قبلاً برای این وزارتخانه ثبت شده است" };
    }
    return { success: false, error: message };
  }
}

export async function pgDeleteMinistry(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const linked = await sql`
    SELECT COUNT(*)::int AS count FROM users WHERE ministry_id = ${id}
  `;
  if (Number(linked[0]?.count ?? 0) > 0) {
    return {
      success: false,
      error: "ابتدا کاربران متصل به این وزارتخانه را حذف یا جابه‌جا کنید",
    };
  }
  await sql`DELETE FROM ministries WHERE id = ${id}`;
  try {
    await sql`DELETE FROM devices WHERE id = ${id}`;
  } catch {
    // ignore if devices table missing
  }
  return { success: true };
}

export async function pgDeleteOrganization(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const linked = await sql`
    SELECT COUNT(*)::int AS count FROM users WHERE organization_id = ${id}
  `;
  if (Number(linked[0]?.count ?? 0) > 0) {
    return {
      success: false,
      error: "ابتدا کاربران متصل به این زیرمجموعه را حذف یا جابه‌جا کنید",
    };
  }
  await sql`DELETE FROM ministry_organizations WHERE id = ${id}`;
  try {
    await sql`DELETE FROM devices WHERE id = ${id}`;
  } catch {
    // ignore if devices table missing
  }
  return { success: true };
}

export async function pgListSubUserIds(parentUserId: string): Promise<string[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id FROM users
    WHERE parent_user_id = ${parentUserId}
      AND role = 'sub_user'
  `;
  return rows.map((row) => String(row.id));
}

export async function pgListUsersByParent(parentUserId: string) {
  const sql = getSql();
  return sql`
    SELECT
      u.*,
      m.name AS ministry_name,
      o.name AS organization_name,
      p.name AS parent_user_name
    FROM users u
    LEFT JOIN ministries m ON m.id = u.ministry_id
    LEFT JOIN ministry_organizations o ON o.id = u.organization_id
    LEFT JOIN users p ON p.id = u.parent_user_id
    WHERE u.parent_user_id = ${parentUserId}
    ORDER BY u.created_at DESC
  `;
}
