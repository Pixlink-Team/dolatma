import { getSql } from "@/lib/db/client";
import { mapUserFromDb } from "@/lib/db/mappers";
import { DEFAULT_MINISTRIES } from "@/lib/ministry-seed";
import { generateId } from "@/lib/utils";
import type {
  AdminUser,
  Device,
  DeviceActivityScope,
  DeviceCampaignHistoryItem,
  DeviceCapacity,
  DeviceCapacityType,
  DeviceContentStats,
  DeviceDirectiveStats,
  DeviceOfficial,
  DeviceOfficialRole,
  DevicePassport,
  DeviceReadiness,
  DeviceSocialLinks,
  DeviceStatus,
  DeviceType,
} from "@/lib/types";

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? new Date().toISOString());
}

function parsePhones(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsePhones(parsed);
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }
  return [];
}

function parseSocialLinks(value: unknown): DeviceSocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: DeviceSocialLinks = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw.trim();
  }
  return out;
}

function asDeviceType(value: unknown): DeviceType {
  const allowed: DeviceType[] = [
    "ministry",
    "organization",
    "directorate",
    "company",
    "governorate",
    "municipality",
    "other",
  ];
  return allowed.includes(value as DeviceType) ? (value as DeviceType) : "other";
}

function asScope(value: unknown): DeviceActivityScope {
  const allowed: DeviceActivityScope[] = ["national", "provincial", "city", "regional"];
  return allowed.includes(value as DeviceActivityScope)
    ? (value as DeviceActivityScope)
    : "national";
}

function asStatus(value: unknown): DeviceStatus {
  const allowed: DeviceStatus[] = ["active", "inactive", "suspended"];
  return allowed.includes(value as DeviceStatus) ? (value as DeviceStatus) : "active";
}

function asOfficialRole(value: unknown): DeviceOfficialRole {
  const allowed: DeviceOfficialRole[] = [
    "primary",
    "deputy",
    "pr",
    "campaign_exec",
    "supervisor",
  ];
  return allowed.includes(value as DeviceOfficialRole)
    ? (value as DeviceOfficialRole)
    : "primary";
}

function asCapacityType(value: unknown): DeviceCapacityType {
  const allowed: DeviceCapacityType[] = [
    "branches",
    "website_app",
    "social",
    "sms_panel",
    "billboards",
    "urban_tv",
    "venues",
    "pr_team",
    "creative_team",
    "field_staff",
    "call_center",
    "contractors",
    "other",
  ];
  return allowed.includes(value as DeviceCapacityType)
    ? (value as DeviceCapacityType)
    : "other";
}

function mapDevice(row: Record<string, unknown>): Device {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    shortName:
      typeof row.short_name === "string" && row.short_name.trim()
        ? row.short_name.trim()
        : null,
    logoUrl:
      typeof row.logo_url === "string" && row.logo_url.trim() ? row.logo_url.trim() : null,
    type: asDeviceType(row.type),
    parentId: row.parent_id ? String(row.parent_id) : null,
    parentName:
      typeof row.parent_name === "string" && row.parent_name.trim()
        ? row.parent_name.trim()
        : null,
    province:
      typeof row.province === "string" && row.province.trim() ? row.province.trim() : null,
    city: typeof row.city === "string" && row.city.trim() ? row.city.trim() : null,
    activityScope: asScope(row.activity_scope),
    mission:
      typeof row.mission === "string" && row.mission.trim() ? row.mission.trim() : null,
    address:
      typeof row.address === "string" && row.address.trim() ? row.address.trim() : null,
    phones: parsePhones(row.phones),
    website:
      typeof row.website === "string" && row.website.trim() ? row.website.trim() : null,
    socialLinks: parseSocialLinks(row.social_links),
    status: asStatus(row.status),
    isActive: row.is_active !== false && asStatus(row.status) === "active",
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    childrenCount:
      row.children_count != null && Number.isFinite(Number(row.children_count))
        ? Number(row.children_count)
        : undefined,
    usersCount:
      row.users_count != null && Number.isFinite(Number(row.users_count))
        ? Number(row.users_count)
        : undefined,
  };
}

function mapOfficial(row: Record<string, unknown>): DeviceOfficial {
  return {
    id: String(row.id),
    deviceId: String(row.device_id),
    roleType: asOfficialRole(row.role_type),
    fullName: String(row.full_name ?? ""),
    phone: typeof row.phone === "string" && row.phone.trim() ? row.phone.trim() : null,
    email: typeof row.email === "string" && row.email.trim() ? row.email.trim() : null,
    contactNote:
      typeof row.contact_note === "string" && row.contact_note.trim()
        ? row.contact_note.trim()
        : null,
    startedAt: toIso(row.started_at),
    endedAt: row.ended_at ? toIso(row.ended_at) : null,
    isActive: row.is_active !== false,
    userId: row.user_id ? String(row.user_id) : null,
    createdAt: toIso(row.created_at),
  };
}

function mapCapacity(row: Record<string, unknown>): DeviceCapacity {
  return {
    id: String(row.id),
    deviceId: String(row.device_id),
    capacityType: asCapacityType(row.capacity_type),
    title: String(row.title ?? ""),
    description:
      typeof row.description === "string" && row.description.trim()
        ? row.description.trim()
        : null,
    isActive: row.is_active !== false,
    ownerName:
      typeof row.owner_name === "string" && row.owner_name.trim()
        ? row.owner_name.trim()
        : null,
    coverageScope:
      typeof row.coverage_scope === "string" && row.coverage_scope.trim()
        ? row.coverage_scope.trim()
        : null,
    lastUpdatedAt: toIso(row.last_updated_at),
    createdAt: toIso(row.created_at),
  };
}

/** Ensure device tables/columns exist on older databases without a fresh migrate. */
export async function ensureDeviceSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      short_name TEXT,
      logo_url TEXT,
      type TEXT NOT NULL DEFAULT 'organization',
      parent_id UUID REFERENCES devices(id) ON DELETE SET NULL,
      province TEXT,
      city TEXT,
      activity_scope TEXT NOT NULL DEFAULT 'national',
      mission TEXT,
      address TEXT,
      phones JSONB NOT NULL DEFAULT '[]'::jsonb,
      website TEXT,
      social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'active',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS device_officials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      role_type TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      contact_note TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ended_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT true,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS device_capacities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      capacity_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      owner_name TEXT,
      coverage_scope TEXT,
      last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES devices(id) ON DELETE SET NULL
  `;
  await sql`
    ALTER TABLE campaign_directives
      ADD COLUMN IF NOT EXISTS audience_device_id UUID REFERENCES devices(id) ON DELETE SET NULL
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_devices_parent ON devices(parent_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_device ON users(device_id)`;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_campaign_directives_audience_device
      ON campaign_directives(audience_device_id)
  `;

  // Migrate legacy ministries/orgs into devices (idempotent by id).
  // Ignore unique-name conflicts from partial prior seeds.
  try {
    await sql`
      INSERT INTO devices (
        id, name, short_name, type, parent_id, mission, activity_scope,
        status, is_active, created_at, updated_at
      )
      SELECT
        m.id,
        COALESCE(NULLIF(TRIM(m.full_name), ''), m.name),
        m.name,
        'ministry',
        NULL,
        m.description,
        'national',
        CASE WHEN m.is_active IS FALSE THEN 'inactive' ELSE 'active' END,
        COALESCE(m.is_active, true),
        m.created_at,
        now()
      FROM ministries m
      WHERE NOT EXISTS (SELECT 1 FROM devices d WHERE d.id = m.id)
      ON CONFLICT (id) DO NOTHING
    `;
    await sql`
      INSERT INTO devices (
        id, name, short_name, type, parent_id, activity_scope,
        status, is_active, created_at, updated_at
      )
      SELECT
        o.id,
        COALESCE(NULLIF(TRIM(o.full_name), ''), o.name),
        o.name,
        'organization',
        o.ministry_id,
        'national',
        CASE WHEN o.is_active IS FALSE THEN 'inactive' ELSE 'active' END,
        COALESCE(o.is_active, true),
        o.created_at,
        now()
      FROM ministry_organizations o
      WHERE NOT EXISTS (SELECT 1 FROM devices d WHERE d.id = o.id)
        AND EXISTS (SELECT 1 FROM devices d WHERE d.id = o.ministry_id)
      ON CONFLICT (id) DO NOTHING
    `;
    await sql`
      UPDATE users
      SET device_id = COALESCE(organization_id, ministry_id)
      WHERE device_id IS NULL
        AND COALESCE(organization_id, ministry_id) IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = COALESCE(users.organization_id, users.ministry_id)
        )
    `;
    await sql`
      UPDATE campaign_directives
      SET audience_device_id = COALESCE(audience_organization_id, audience_ministry_id)
      WHERE audience_device_id IS NULL
        AND COALESCE(audience_organization_id, audience_ministry_id) IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = COALESCE(
            campaign_directives.audience_organization_id,
            campaign_directives.audience_ministry_id
          )
        )
    `;
  } catch (error) {
    console.error("[devices] legacy migration skipped", error);
  }
}

async function syncLegacyFromDevice(device: {
  id: string;
  name: string;
  shortName?: string | null;
  parentId?: string | null;
  mission?: string | null;
  isActive: boolean;
  type: DeviceType;
}): Promise<void> {
  const sql = getSql();
  const shortName = device.shortName?.trim() || device.name;
  const fullName = device.name;

  if (!device.parentId && device.type === "ministry") {
    await sql`
      INSERT INTO ministries (id, name, full_name, description, is_active, created_at)
      VALUES (
        ${device.id},
        ${shortName},
        ${fullName},
        ${device.mission ?? null},
        ${device.isActive},
        ${new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        full_name = EXCLUDED.full_name,
        description = COALESCE(EXCLUDED.description, ministries.description),
        is_active = EXCLUDED.is_active
    `;
    return;
  }

  if (device.parentId) {
    await sql`
      INSERT INTO ministry_organizations (
        id, ministry_id, name, full_name, is_active, created_at
      )
      VALUES (
        ${device.id},
        ${device.parentId},
        ${shortName},
        ${fullName},
        ${device.isActive},
        ${new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        ministry_id = EXCLUDED.ministry_id,
        name = EXCLUDED.name,
        full_name = EXCLUDED.full_name,
        is_active = EXCLUDED.is_active
    `;
  }
}

export async function pgListDevices(options?: {
  parentId?: string | null;
  rootsOnly?: boolean;
}): Promise<Device[]> {
  const sql = getSql();
  await ensureDeviceSchema();

  const rows = options?.rootsOnly
    ? await sql`
        SELECT
          d.*,
          p.name AS parent_name,
          (SELECT COUNT(*)::int FROM devices c WHERE c.parent_id = d.id) AS children_count,
          (SELECT COUNT(*)::int FROM users u
            WHERE u.device_id = d.id
               OR (u.ministry_id = d.id AND u.organization_id IS NULL)
               OR u.organization_id = d.id
          ) AS users_count
        FROM devices d
        LEFT JOIN devices p ON p.id = d.parent_id
        WHERE d.parent_id IS NULL
        ORDER BY COALESCE(d.short_name, d.name) ASC
      `
    : options?.parentId
      ? await sql`
          SELECT
            d.*,
            p.name AS parent_name,
            (SELECT COUNT(*)::int FROM devices c WHERE c.parent_id = d.id) AS children_count,
            (SELECT COUNT(*)::int FROM users u
              WHERE u.device_id = d.id
                 OR u.organization_id = d.id
            ) AS users_count
          FROM devices d
          LEFT JOIN devices p ON p.id = d.parent_id
          WHERE d.parent_id = ${options.parentId}
          ORDER BY COALESCE(d.short_name, d.name) ASC
        `
      : await sql`
          SELECT
            d.*,
            p.name AS parent_name,
            (SELECT COUNT(*)::int FROM devices c WHERE c.parent_id = d.id) AS children_count,
            (SELECT COUNT(*)::int FROM users u
              WHERE u.device_id = d.id
                 OR (u.ministry_id = d.id AND u.organization_id IS NULL)
                 OR u.organization_id = d.id
            ) AS users_count
          FROM devices d
          LEFT JOIN devices p ON p.id = d.parent_id
          ORDER BY
            CASE WHEN d.parent_id IS NULL THEN 0 ELSE 1 END,
            COALESCE(d.short_name, d.name) ASC
        `;

  return rows.map((row) => mapDevice(row as Record<string, unknown>));
}

export async function pgGetDeviceById(id: string): Promise<Device | null> {
  const sql = getSql();
  await ensureDeviceSchema();
  const rows = await sql`
    SELECT d.*, p.name AS parent_name
    FROM devices d
    LEFT JOIN devices p ON p.id = d.parent_id
    WHERE d.id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapDevice(rows[0] as Record<string, unknown>);
}

export async function pgSaveDevice(data: {
  id?: string;
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  type: DeviceType;
  parentId?: string | null;
  province?: string | null;
  city?: string | null;
  activityScope?: DeviceActivityScope;
  mission?: string | null;
  address?: string | null;
  phones?: string[];
  website?: string | null;
  socialLinks?: DeviceSocialLinks;
  status?: DeviceStatus;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureDeviceSchema();

  const id = data.id ?? generateId();
  const name = data.name.trim();
  const shortName = data.shortName?.trim() || null;
  const logoUrl = data.logoUrl?.trim() || null;
  const parentId = data.parentId?.trim() || null;
  const province = data.province?.trim() || null;
  const city = data.city?.trim() || null;
  const activityScope = data.activityScope ?? "national";
  const mission = data.mission?.trim() || null;
  const address = data.address?.trim() || null;
  const phones = JSON.stringify(
    (data.phones ?? []).map((p) => p.trim()).filter(Boolean)
  );
  const website = data.website?.trim() || null;
  const socialLinks = JSON.stringify(data.socialLinks ?? {});
  const status = data.status ?? "active";
  const isActive = status === "active";
  const now = new Date().toISOString();

  if (!name) return { success: false, error: "نام دستگاه الزامی است" };
  if (parentId && parentId === id) {
    return { success: false, error: "دستگاه نمی‌تواند زیرمجموعه خودش باشد" };
  }

  try {
    if (data.id) {
      await sql`
        UPDATE devices SET
          name = ${name},
          short_name = ${shortName},
          logo_url = ${logoUrl},
          type = ${data.type},
          parent_id = ${parentId},
          province = ${province},
          city = ${city},
          activity_scope = ${activityScope},
          mission = ${mission},
          address = ${address},
          phones = ${sql.json(JSON.parse(phones))},
          website = ${website},
          social_links = ${sql.json(JSON.parse(socialLinks))},
          status = ${status},
          is_active = ${isActive},
          updated_at = ${now}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        INSERT INTO devices (
          id, name, short_name, logo_url, type, parent_id, province, city,
          activity_scope, mission, address, phones, website, social_links,
          status, is_active, created_at, updated_at
        )
        VALUES (
          ${id}, ${name}, ${shortName}, ${logoUrl}, ${data.type}, ${parentId},
          ${province}, ${city}, ${activityScope}, ${mission}, ${address},
          ${sql.json(JSON.parse(phones))}, ${website}, ${sql.json(JSON.parse(socialLinks))},
          ${status}, ${isActive}, ${now}, ${now}
        )
      `;
    }

    await syncLegacyFromDevice({
      id,
      name,
      shortName,
      parentId,
      mission,
      isActive,
      type: data.type,
    });

    return { success: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ذخیره دستگاه ناموفق بود";
    if (message.includes("duplicate key") || message.includes("unique")) {
      return { success: false, error: "این نام دستگاه قبلاً ثبت شده است" };
    }
    return { success: false, error: message };
  }
}

export async function pgDeleteDevice(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  await ensureDeviceSchema();

  const linked = await sql`
    SELECT COUNT(*)::int AS count FROM users
    WHERE device_id = ${id}
       OR ministry_id = ${id}
       OR organization_id = ${id}
  `;
  if (Number(linked[0]?.count ?? 0) > 0) {
    return {
      success: false,
      error: "ابتدا کاربران متصل به این دستگاه را حذف یا جابه‌جا کنید",
    };
  }

  const children = await sql`
    SELECT COUNT(*)::int AS count FROM devices WHERE parent_id = ${id}
  `;
  if (Number(children[0]?.count ?? 0) > 0) {
    return {
      success: false,
      error: "ابتدا زیرمجموعه‌های این دستگاه را حذف یا جابه‌جا کنید",
    };
  }

  await sql`DELETE FROM devices WHERE id = ${id}`;
  await sql`DELETE FROM ministry_organizations WHERE id = ${id}`;
  await sql`DELETE FROM ministries WHERE id = ${id}`;
  return { success: true };
}

export async function pgListDeviceOfficials(
  deviceId: string,
  options?: { includeInactive?: boolean }
): Promise<DeviceOfficial[]> {
  const sql = getSql();
  await ensureDeviceSchema();
  const rows = options?.includeInactive
    ? await sql`
        SELECT * FROM device_officials
        WHERE device_id = ${deviceId}
        ORDER BY is_active DESC, started_at DESC
      `
    : await sql`
        SELECT * FROM device_officials
        WHERE device_id = ${deviceId} AND is_active = true
        ORDER BY started_at DESC
      `;
  return rows.map((row) => mapOfficial(row as Record<string, unknown>));
}

export async function pgSaveDeviceOfficial(data: {
  id?: string;
  deviceId: string;
  roleType: DeviceOfficialRole;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  contactNote?: string | null;
  userId?: string | null;
  startedAt?: string | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureDeviceSchema();

  const id = data.id ?? generateId();
  const fullName = data.fullName.trim();
  if (!fullName) return { success: false, error: "نام مسئول الزامی است" };

  const phone = data.phone?.trim() || null;
  const email = data.email?.trim() || null;
  const contactNote = data.contactNote?.trim() || null;
  const userId = data.userId?.trim() || null;
  const startedAt = data.startedAt || new Date().toISOString();
  const now = new Date().toISOString();

  try {
    if (!data.id) {
      // End previous active official for the same role (keep history).
      await sql`
        UPDATE device_officials SET
          is_active = false,
          ended_at = COALESCE(ended_at, ${now})
        WHERE device_id = ${data.deviceId}
          AND role_type = ${data.roleType}
          AND is_active = true
      `;
    }

    if (data.id) {
      await sql`
        UPDATE device_officials SET
          role_type = ${data.roleType},
          full_name = ${fullName},
          phone = ${phone},
          email = ${email},
          contact_note = ${contactNote},
          user_id = ${userId},
          started_at = ${startedAt}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        INSERT INTO device_officials (
          id, device_id, role_type, full_name, phone, email, contact_note,
          started_at, is_active, user_id, created_at
        )
        VALUES (
          ${id}, ${data.deviceId}, ${data.roleType}, ${fullName}, ${phone},
          ${email}, ${contactNote}, ${startedAt}, ${true}, ${userId}, ${now}
        )
      `;
    }
    return { success: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ذخیره مسئول ناموفق بود";
    return { success: false, error: message };
  }
}

export async function pgEndDeviceOfficial(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`
    UPDATE device_officials SET
      is_active = false,
      ended_at = COALESCE(ended_at, ${now})
    WHERE id = ${id}
  `;
  return { success: true };
}

export async function pgListDeviceCapacities(deviceId: string): Promise<DeviceCapacity[]> {
  const sql = getSql();
  await ensureDeviceSchema();
  const rows = await sql`
    SELECT * FROM device_capacities
    WHERE device_id = ${deviceId}
    ORDER BY is_active DESC, last_updated_at DESC
  `;
  return rows.map((row) => mapCapacity(row as Record<string, unknown>));
}

export async function pgSaveDeviceCapacity(data: {
  id?: string;
  deviceId: string;
  capacityType: DeviceCapacityType;
  title: string;
  description?: string | null;
  isActive?: boolean;
  ownerName?: string | null;
  coverageScope?: string | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureDeviceSchema();

  const id = data.id ?? generateId();
  const title = data.title.trim();
  if (!title) return { success: false, error: "عنوان ظرفیت الزامی است" };

  const description = data.description?.trim() || null;
  const isActive = data.isActive !== false;
  const ownerName = data.ownerName?.trim() || null;
  const coverageScope = data.coverageScope?.trim() || null;
  const now = new Date().toISOString();

  try {
    if (data.id) {
      await sql`
        UPDATE device_capacities SET
          capacity_type = ${data.capacityType},
          title = ${title},
          description = ${description},
          is_active = ${isActive},
          owner_name = ${ownerName},
          coverage_scope = ${coverageScope},
          last_updated_at = ${now}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        INSERT INTO device_capacities (
          id, device_id, capacity_type, title, description, is_active,
          owner_name, coverage_scope, last_updated_at, created_at
        )
        VALUES (
          ${id}, ${data.deviceId}, ${data.capacityType}, ${title}, ${description},
          ${isActive}, ${ownerName}, ${coverageScope}, ${now}, ${now}
        )
      `;
    }
    return { success: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ذخیره ظرفیت ناموفق بود";
    return { success: false, error: message };
  }
}

export async function pgDeleteDeviceCapacity(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  await sql`DELETE FROM device_capacities WHERE id = ${id}`;
  return { success: true };
}

async function listDeviceUsers(deviceId: string): Promise<AdminUser[]> {
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT
        u.*,
        m.name AS ministry_name,
        o.name AS organization_name,
        d.name AS device_name,
        p.name AS parent_user_name
      FROM users u
      LEFT JOIN ministries m ON m.id = u.ministry_id
      LEFT JOIN ministry_organizations o ON o.id = u.organization_id
      LEFT JOIN devices d ON d.id = COALESCE(u.device_id, u.organization_id, u.ministry_id)
      LEFT JOIN users p ON p.id = u.parent_user_id
      WHERE u.device_id = ${deviceId}
         OR u.organization_id = ${deviceId}
         OR (u.ministry_id = ${deviceId} AND u.organization_id IS NULL)
         OR u.device_id IN (SELECT id FROM devices WHERE parent_id = ${deviceId})
         OR u.organization_id IN (SELECT id FROM devices WHERE parent_id = ${deviceId})
      ORDER BY u.created_at DESC
    `;
    return rows.map((row) => {
      const user = mapUserFromDb(row as Record<string, unknown>);
      const record = row as Record<string, unknown>;
      return {
        ...user,
        deviceId: record.device_id
          ? String(record.device_id)
          : user.organizationId ?? user.ministryId ?? null,
        deviceName:
          typeof record.device_name === "string" ? record.device_name : null,
      };
    });
  } catch (error) {
    console.error("[device-passport] listDeviceUsers primary failed", error);
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
      WHERE u.organization_id = ${deviceId}
         OR (u.ministry_id = ${deviceId} AND u.organization_id IS NULL)
         OR u.organization_id IN (
           SELECT id FROM ministry_organizations WHERE ministry_id = ${deviceId}
         )
      ORDER BY u.created_at DESC
    `;
    return rows.map((row) => mapUserFromDb(row as Record<string, unknown>));
  }
}

function computeReadiness(input: {
  device: Device;
  officials: DeviceOfficial[];
  capacities: DeviceCapacity[];
  users: AdminUser[];
  directiveStats: DeviceDirectiveStats;
}): DeviceReadiness {
  const { device, officials, capacities, users, directiveStats } = input;

  if (device.status !== "active" || !device.isActive) {
    return {
      status: "inactive",
      score: 0,
      reason: "دستگاه غیرفعال یا تعلیق‌شده است و برای اجرای کمپین جدید آماده نیست.",
      factors: {
        hasPrimaryOfficial: false,
        hasDeputyOfficial: false,
        hasActiveUsers: false,
        profileComplete: false,
        hasCapacity: false,
        directiveResponseOk: false,
        actionPlanOk: false,
      },
    };
  }

  const activeOfficials = officials.filter((item) => item.isActive);
  const hasPrimaryOfficial = activeOfficials.some((item) => item.roleType === "primary");
  const hasDeputyOfficial = activeOfficials.some((item) => item.roleType === "deputy");
  const hasActiveUsers = users.length > 0;
  const hasCapacity = capacities.some((item) => item.isActive);
  const profileComplete = Boolean(
    device.name &&
      device.type &&
      (device.mission || device.address || device.phones.length > 0 || device.website)
  );

  const seenRate =
    directiveStats.received > 0
      ? directiveStats.seen / directiveStats.received
      : 1;
  const directiveResponseOk = seenRate >= 0.5;
  const actionPlanRate =
    directiveStats.confirmed > 0
      ? directiveStats.actionPlans / directiveStats.confirmed
      : 1;
  const actionPlanOk = actionPlanRate >= 0.5;

  let score = 0;
  if (hasPrimaryOfficial) score += 20;
  if (hasDeputyOfficial) score += 10;
  if (hasActiveUsers) score += 20;
  if (profileComplete) score += 15;
  if (hasCapacity) score += 15;
  if (directiveResponseOk) score += 10;
  if (actionPlanOk) score += 10;

  const gaps: string[] = [];
  if (!hasPrimaryOfficial) gaps.push("مسئول اصلی فعال ندارد");
  if (!hasDeputyOfficial) gaps.push("جانشین مسئول تعیین نشده");
  if (!hasActiveUsers) gaps.push("کاربر فعالی ندارد");
  if (!profileComplete) gaps.push("اطلاعات پروفایل ناقص است");
  if (!hasCapacity) gaps.push("ظرفیتی ثبت نشده");
  if (!directiveResponseOk) gaps.push("نرخ مشاهده دستورها پایین است");
  if (!actionPlanOk) gaps.push("نرخ ثبت برنامه اقدام پایین است");

  let status: DeviceReadiness["status"] = "ready";
  if (score < 40 || !hasPrimaryOfficial) status = "high_risk";
  else if (score < 70) status = "needs_completion";

  const reason =
    status === "ready"
      ? "آمادگی مناسب است؛ مسئول فعال، کاربران و اطلاعات پایه در وضعیت قابل قبول قرار دارند."
      : `آمادگی ${status === "high_risk" ? "پرریسک" : "متوسط"} است؛ ${gaps.slice(0, 3).join("، ")}.`;

  return {
    status,
    score,
    reason,
    factors: {
      hasPrimaryOfficial,
      hasDeputyOfficial,
      hasActiveUsers,
      profileComplete,
      hasCapacity,
      directiveResponseOk,
      actionPlanOk,
    },
  };
}

async function loadDirectiveStats(deviceId: string): Promise<DeviceDirectiveStats> {
  const sql = getSql();
  try {
    const rows = await sql`
      WITH device_users AS (
        SELECT id FROM users
        WHERE device_id = ${deviceId}
           OR organization_id = ${deviceId}
           OR (ministry_id = ${deviceId} AND organization_id IS NULL)
           OR device_id IN (SELECT id FROM devices WHERE parent_id = ${deviceId})
           OR organization_id IN (SELECT id FROM devices WHERE parent_id = ${deviceId})
      )
      SELECT
        COUNT(*)::int AS received,
        COUNT(*) FILTER (WHERE seen_at IS NOT NULL)::int AS seen,
        COUNT(*) FILTER (WHERE seen_at IS NULL)::int AS unseen,
        COUNT(*) FILTER (WHERE confirmed IS TRUE)::int AS confirmed,
        (
          SELECT COUNT(*)::int
          FROM directive_action_plans ap
          JOIN device_users du2 ON du2.id = ap.user_id
        ) AS action_plans
      FROM directive_recipients dr
      JOIN device_users du ON du.id = dr.user_id
    `;
    const row = rows[0] as Record<string, unknown> | undefined;
    return {
      received: Number(row?.received ?? 0),
      seen: Number(row?.seen ?? 0),
      unseen: Number(row?.unseen ?? 0),
      confirmed: Number(row?.confirmed ?? 0),
      actionPlans: Number(row?.action_plans ?? 0),
    };
  } catch (error) {
    console.error("[device-passport] loadDirectiveStats failed", error);
    return { received: 0, seen: 0, unseen: 0, confirmed: 0, actionPlans: 0 };
  }
}

async function loadContentStats(deviceId: string): Promise<DeviceContentStats> {
  const empty: DeviceContentStats = {
    billboards: 0,
    posters: 0,
    videos: 0,
    socialPosts: 0,
    activities: 0,
    files: 0,
    totalUploads: 0,
    score: 0,
  };
  const sql = getSql();
  try {
    const userRows = await sql`
      SELECT id FROM users
      WHERE device_id = ${deviceId}
         OR organization_id = ${deviceId}
         OR (ministry_id = ${deviceId} AND organization_id IS NULL)
         OR device_id IN (SELECT id FROM devices WHERE parent_id = ${deviceId})
         OR organization_id IN (SELECT id FROM devices WHERE parent_id = ${deviceId})
    `;
    const userIds = userRows.map((row) => String(row.id));
    if (userIds.length === 0) return empty;

    const [billboards, posters, videos, socialPosts, activities, files] = await Promise.all([
      sql`SELECT COUNT(*)::int AS c FROM billboards WHERE owner_user_id IN ${sql(userIds)}`,
      sql`SELECT COUNT(*)::int AS c FROM posters WHERE owner_user_id IN ${sql(userIds)}`,
      sql`SELECT COUNT(*)::int AS c FROM videos WHERE owner_user_id IN ${sql(userIds)}`,
      sql`SELECT COUNT(*)::int AS c FROM social_media_posts WHERE owner_user_id IN ${sql(userIds)}`,
      sql`SELECT COUNT(*)::int AS c FROM campaign_activities WHERE owner_user_id IN ${sql(userIds)}`,
      sql`SELECT COUNT(*)::int AS c FROM campaign_files WHERE owner_user_id IN ${sql(userIds)}`,
    ]);

    const b = Number(billboards[0]?.c ?? 0);
    const p = Number(posters[0]?.c ?? 0);
    const v = Number(videos[0]?.c ?? 0);
    const s = Number(socialPosts[0]?.c ?? 0);
    const a = Number(activities[0]?.c ?? 0);
    const f = Number(files[0]?.c ?? 0);
    const totalUploads = b + p + v + s + a + f;
    const score = b * 5 + p * 3 + v * 4 + s * 2 + a * 3 + f * 1;

    return {
      billboards: b,
      posters: p,
      videos: v,
      socialPosts: s,
      activities: a,
      files: f,
      totalUploads,
      score,
    };
  } catch (error) {
    console.error("[device-passport] loadContentStats failed", error);
    return empty;
  }
}

async function loadCampaignHistory(deviceId: string): Promise<DeviceCampaignHistoryItem[]> {
  const sql = getSql();
  try {
    const rows = await sql`
      WITH device_users AS (
        SELECT id FROM users
        WHERE device_id = ${deviceId}
           OR organization_id = ${deviceId}
           OR (ministry_id = ${deviceId} AND organization_id IS NULL)
           OR device_id IN (SELECT id FROM devices WHERE parent_id = ${deviceId})
           OR organization_id IN (SELECT id FROM devices WHERE parent_id = ${deviceId})
      ),
      directive_stats AS (
        SELECT
          d.campaign_id,
          COUNT(DISTINCT dr.directive_id)::int AS directives_received,
          COUNT(DISTINCT CASE WHEN dr.seen_at IS NOT NULL THEN dr.directive_id END)::int AS directives_seen,
          COUNT(DISTINCT CASE WHEN dr.confirmed IS TRUE THEN dr.directive_id END)::int AS directives_confirmed,
          (
            SELECT COUNT(DISTINCT ap.directive_id)::int
            FROM directive_action_plans ap
            JOIN device_users du2 ON du2.id = ap.user_id
            JOIN campaign_directives d2 ON d2.id = ap.directive_id
            WHERE d2.campaign_id = d.campaign_id
          ) AS action_plans
        FROM campaign_directives d
        JOIN directive_recipients dr ON dr.directive_id = d.id
        JOIN device_users du ON du.id = dr.user_id
        GROUP BY d.campaign_id
      ),
      content_stats AS (
        SELECT campaign_id, SUM(cnt)::int AS content_uploads FROM (
          SELECT campaign_id, COUNT(*)::int AS cnt FROM billboards
            WHERE owner_user_id IN (SELECT id FROM device_users) GROUP BY campaign_id
          UNION ALL
          SELECT campaign_id, COUNT(*)::int AS cnt FROM posters
            WHERE owner_user_id IN (SELECT id FROM device_users) GROUP BY campaign_id
          UNION ALL
          SELECT campaign_id, COUNT(*)::int AS cnt FROM videos
            WHERE owner_user_id IN (SELECT id FROM device_users) GROUP BY campaign_id
          UNION ALL
          SELECT campaign_id, COUNT(*)::int AS cnt FROM social_media_posts
            WHERE owner_user_id IN (SELECT id FROM device_users) GROUP BY campaign_id
          UNION ALL
          SELECT campaign_id, COUNT(*)::int AS cnt FROM campaign_activities
            WHERE owner_user_id IN (SELECT id FROM device_users) GROUP BY campaign_id
        ) t
        GROUP BY campaign_id
      )
      SELECT
        cs.id AS campaign_id,
        cs.title AS campaign_title,
        cs.slug AS campaign_slug,
        COALESCE(ds.directives_received, 0) AS directives_received,
        COALESCE(ds.directives_seen, 0) AS directives_seen,
        COALESCE(ds.directives_confirmed, 0) AS directives_confirmed,
        COALESCE(ds.action_plans, 0) AS action_plans,
        COALESCE(ct.content_uploads, 0) AS content_uploads
      FROM campaign_settings cs
      LEFT JOIN directive_stats ds ON ds.campaign_id = cs.id
      LEFT JOIN content_stats ct ON ct.campaign_id = cs.id
      WHERE COALESCE(ds.directives_received, 0) > 0
         OR COALESCE(ct.content_uploads, 0) > 0
         OR cs.id IN (
           SELECT campaign_id FROM campaign_directives
           WHERE audience_ministry_id = ${deviceId}
              OR audience_organization_id = ${deviceId}
              OR audience_device_id = ${deviceId}
              OR audience_device_id IN (SELECT id FROM devices WHERE parent_id = ${deviceId})
         )
      ORDER BY cs.updated_at DESC NULLS LAST
      LIMIT 50
    `;

    return rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        campaignId: String(r.campaign_id),
        campaignTitle: String(r.campaign_title ?? ""),
        campaignSlug: String(r.campaign_slug ?? ""),
        directivesReceived: Number(r.directives_received ?? 0),
        directivesSeen: Number(r.directives_seen ?? 0),
        directivesConfirmed: Number(r.directives_confirmed ?? 0),
        actionPlans: Number(r.action_plans ?? 0),
        contentUploads: Number(r.content_uploads ?? 0),
      };
    });
  } catch (error) {
    console.error("[device-passport] loadCampaignHistory failed", error);
    // Fallback without audience_device_id (older DBs before migrate).
    try {
      const rows = await sql`
        WITH device_users AS (
          SELECT id FROM users
          WHERE organization_id = ${deviceId}
             OR (ministry_id = ${deviceId} AND organization_id IS NULL)
             OR organization_id IN (
               SELECT id FROM ministry_organizations WHERE ministry_id = ${deviceId}
             )
        ),
        directive_stats AS (
          SELECT
            d.campaign_id,
            COUNT(DISTINCT dr.directive_id)::int AS directives_received,
            COUNT(DISTINCT CASE WHEN dr.seen_at IS NOT NULL THEN dr.directive_id END)::int AS directives_seen,
            COUNT(DISTINCT CASE WHEN dr.confirmed IS TRUE THEN dr.directive_id END)::int AS directives_confirmed
          FROM campaign_directives d
          JOIN directive_recipients dr ON dr.directive_id = d.id
          JOIN device_users du ON du.id = dr.user_id
          GROUP BY d.campaign_id
        )
        SELECT
          cs.id AS campaign_id,
          cs.title AS campaign_title,
          cs.slug AS campaign_slug,
          COALESCE(ds.directives_received, 0) AS directives_received,
          COALESCE(ds.directives_seen, 0) AS directives_seen,
          COALESCE(ds.directives_confirmed, 0) AS directives_confirmed,
          0 AS content_uploads
        FROM campaign_settings cs
        INNER JOIN directive_stats ds ON ds.campaign_id = cs.id
        ORDER BY cs.updated_at DESC NULLS LAST
        LIMIT 50
      `;
      return rows.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          campaignId: String(r.campaign_id),
          campaignTitle: String(r.campaign_title ?? ""),
          campaignSlug: String(r.campaign_slug ?? ""),
          directivesReceived: Number(r.directives_received ?? 0),
          directivesSeen: Number(r.directives_seen ?? 0),
          directivesConfirmed: Number(r.directives_confirmed ?? 0),
          actionPlans: 0,
          contentUploads: Number(r.content_uploads ?? 0),
        };
      });
    } catch (fallbackError) {
      console.error("[device-passport] loadCampaignHistory fallback failed", fallbackError);
      return [];
    }
  }
}

export async function pgGetDevicePassport(deviceId: string): Promise<DevicePassport | null> {
  await ensureDeviceSchema();
  const device = await pgGetDeviceById(deviceId);
  if (!device) return null;

  const [parent, children, officials, capacities, users, directiveStats, contentStats, campaignHistory] =
    await Promise.all([
      device.parentId ? pgGetDeviceById(device.parentId) : Promise.resolve(null),
      pgListDevices({ parentId: deviceId }).catch((error) => {
        console.error("[device-passport] children failed", error);
        return [] as Device[];
      }),
      pgListDeviceOfficials(deviceId, { includeInactive: true }).catch((error) => {
        console.error("[device-passport] officials failed", error);
        return [] as DeviceOfficial[];
      }),
      pgListDeviceCapacities(deviceId).catch((error) => {
        console.error("[device-passport] capacities failed", error);
        return [] as DeviceCapacity[];
      }),
      listDeviceUsers(deviceId).catch((error) => {
        console.error("[device-passport] users failed", error);
        return [] as AdminUser[];
      }),
      loadDirectiveStats(deviceId),
      loadContentStats(deviceId),
      loadCampaignHistory(deviceId),
    ]);

  const readiness = computeReadiness({
    device,
    officials,
    capacities,
    users,
    directiveStats,
  });

  return {
    device,
    parent,
    children,
    officials,
    capacities,
    users,
    directiveStats,
    contentStats,
    campaignHistory,
    readiness,
  };
}

/** Seed default ministries/orgs into devices (and legacy tables via sync). */
export async function pgEnsureDefaultDevices(): Promise<void> {
  await ensureDeviceSchema();
  const now = new Date().toISOString();
  const sql = getSql();

  for (const item of DEFAULT_MINISTRIES) {
    const existing = await sql`
      SELECT id FROM devices
      WHERE parent_id IS NULL
        AND (
          short_name = ${item.name}
          OR name = ${item.fullName}
          OR name = ${item.name}
        )
      LIMIT 1
    `;

    let ministryId = existing[0] ? String(existing[0].id) : generateId();
    if (!existing[0]) {
      const saved = await pgSaveDevice({
        id: ministryId,
        name: item.fullName,
        shortName: item.name,
        type: "ministry",
        parentId: null,
        mission: item.description ?? null,
        activityScope: "national",
        status: "active",
      });
      if (!saved.success) continue;
      ministryId = saved.id;
    } else {
      await sql`
        UPDATE devices SET
          name = ${item.fullName},
          short_name = ${item.name},
          mission = COALESCE(${item.description ?? null}, mission),
          updated_at = ${now}
        WHERE id = ${ministryId}
      `;
      await syncLegacyFromDevice({
        id: ministryId,
        name: item.fullName,
        shortName: item.name,
        parentId: null,
        mission: item.description ?? null,
        isActive: true,
        type: "ministry",
      });
    }

    for (const org of item.organizations) {
      const orgExisting = await sql`
        SELECT id FROM devices
        WHERE parent_id = ${ministryId}
          AND (short_name = ${org.name} OR name = ${org.name})
        LIMIT 1
      `;
      if (orgExisting[0]) continue;
      await pgSaveDevice({
        name: org.fullName ?? org.name,
        shortName: org.name,
        type: "organization",
        parentId: ministryId,
        activityScope: "national",
        status: "active",
      });
    }
  }
}

/** Resolve legacy ministry/org ids from a device id for compatibility writes. */
export async function resolveLegacyIdsFromDevice(deviceId: string | null | undefined): Promise<{
  ministryId: string | null;
  organizationId: string | null;
  deviceId: string | null;
}> {
  if (!deviceId) {
    return { ministryId: null, organizationId: null, deviceId: null };
  }
  const device = await pgGetDeviceById(deviceId);
  if (!device) {
    return { ministryId: null, organizationId: null, deviceId: null };
  }
  if (!device.parentId) {
    return { ministryId: device.id, organizationId: null, deviceId: device.id };
  }
  return {
    ministryId: device.parentId,
    organizationId: device.id,
    deviceId: device.id,
  };
}
