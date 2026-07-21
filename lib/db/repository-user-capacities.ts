import { getSql } from "@/lib/db/client";
import type { DeviceCapacityType, UserCapacity } from "@/lib/types";
import { generateId } from "@/lib/utils";

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

function toIsoString(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapUserCapacity(row: Record<string, unknown>): UserCapacity {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    capacityType: asCapacityType(row.capacity_type),
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : null,
    isActive: row.is_active !== false,
    ownerName: row.owner_name ? String(row.owner_name) : null,
    coverageScope: row.coverage_scope ? String(row.coverage_scope) : null,
    lastUpdatedAt: toIsoString(row.last_updated_at),
    createdAt: toIsoString(row.created_at),
  };
}

export async function ensureUserCapacitySchema(): Promise<void> {
  const sql = getSql();
  await sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS alternate_contact_name TEXT
  `;
  await sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS alternate_contact_phone TEXT
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_capacities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
}

export async function pgListUserCapacities(userId: string): Promise<UserCapacity[]> {
  const sql = getSql();
  await ensureUserCapacitySchema();
  const rows = await sql`
    SELECT * FROM user_capacities
    WHERE user_id = ${userId}
    ORDER BY is_active DESC, last_updated_at DESC
  `;
  return rows.map((row) => mapUserCapacity(row as Record<string, unknown>));
}

export async function pgSaveUserCapacity(data: {
  id?: string;
  userId: string;
  capacityType: DeviceCapacityType;
  title: string;
  description?: string | null;
  isActive?: boolean;
  ownerName?: string | null;
  coverageScope?: string | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureUserCapacitySchema();

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
        UPDATE user_capacities SET
          capacity_type = ${data.capacityType},
          title = ${title},
          description = ${description},
          is_active = ${isActive},
          owner_name = ${ownerName},
          coverage_scope = ${coverageScope},
          last_updated_at = ${now}
        WHERE id = ${id} AND user_id = ${data.userId}
      `;
    } else {
      await sql`
        INSERT INTO user_capacities (
          id, user_id, capacity_type, title, description, is_active,
          owner_name, coverage_scope, last_updated_at, created_at
        )
        VALUES (
          ${id}, ${data.userId}, ${data.capacityType}, ${title}, ${description},
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

export async function pgDeleteUserCapacity(
  id: string,
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  await ensureUserCapacitySchema();
  await sql`DELETE FROM user_capacities WHERE id = ${id} AND user_id = ${userId}`;
  return { success: true };
}

export async function pgListNationalCapacityMap(filters?: {
  province?: string | null;
  city?: string | null;
  deviceId?: string | null;
  capacityType?: DeviceCapacityType | null;
}): Promise<
  Array<{
    source: "device" | "user";
    id: string;
    capacityType: DeviceCapacityType;
    title: string;
    description?: string | null;
    isActive: boolean;
    ownerName?: string | null;
    coverageScope?: string | null;
    province?: string | null;
    city?: string | null;
    deviceId?: string | null;
    deviceName?: string | null;
    userId?: string | null;
    userName?: string | null;
    lastUpdatedAt: string;
  }>
> {
  const sql = getSql();
  await ensureUserCapacitySchema();
  const { ensureDeviceSchema } = await import("@/lib/db/repository-devices");
  await ensureDeviceSchema();

  const province = filters?.province?.trim() || null;
  const city = filters?.city?.trim() || null;
  const deviceId = filters?.deviceId?.trim() || null;
  const capacityType = filters?.capacityType ?? null;

  const deviceRows = await sql`
    SELECT
      c.id,
      c.capacity_type,
      c.title,
      c.description,
      c.is_active,
      c.owner_name,
      c.coverage_scope,
      c.last_updated_at,
      d.id AS device_id,
      d.name AS device_name,
      d.province,
      d.city
    FROM device_capacities c
    INNER JOIN devices d ON d.id = c.device_id
    WHERE (${province}::text IS NULL OR d.province = ${province})
      AND (${city}::text IS NULL OR d.city = ${city})
      AND (${deviceId}::uuid IS NULL OR d.id = ${deviceId})
      AND (${capacityType}::text IS NULL OR c.capacity_type = ${capacityType})
    ORDER BY c.is_active DESC, c.last_updated_at DESC
  `;

  const userRows = await sql`
    SELECT
      c.id,
      c.capacity_type,
      c.title,
      c.description,
      c.is_active,
      c.owner_name,
      c.coverage_scope,
      c.last_updated_at,
      u.id AS user_id,
      u.name AS user_name,
      u.province,
      u.city,
      COALESCE(u.device_id, u.organization_id, u.ministry_id) AS device_id,
      d.name AS device_name
    FROM user_capacities c
    INNER JOIN users u ON u.id = c.user_id
    LEFT JOIN devices d ON d.id = COALESCE(u.device_id, u.organization_id, u.ministry_id)
    WHERE (${province}::text IS NULL OR u.province = ${province})
      AND (${city}::text IS NULL OR u.city = ${city})
      AND (
        ${deviceId}::uuid IS NULL
        OR COALESCE(u.device_id, u.organization_id, u.ministry_id) = ${deviceId}
      )
      AND (${capacityType}::text IS NULL OR c.capacity_type = ${capacityType})
    ORDER BY c.is_active DESC, c.last_updated_at DESC
  `;

  return [
    ...deviceRows.map((row) => ({
      source: "device" as const,
      id: String(row.id),
      capacityType: asCapacityType(row.capacity_type),
      title: String(row.title ?? ""),
      description: row.description ? String(row.description) : null,
      isActive: row.is_active !== false,
      ownerName: row.owner_name ? String(row.owner_name) : null,
      coverageScope: row.coverage_scope ? String(row.coverage_scope) : null,
      province: row.province ? String(row.province) : null,
      city: row.city ? String(row.city) : null,
      deviceId: row.device_id ? String(row.device_id) : null,
      deviceName: row.device_name ? String(row.device_name) : null,
      userId: null,
      userName: null,
      lastUpdatedAt: toIsoString(row.last_updated_at),
    })),
    ...userRows.map((row) => ({
      source: "user" as const,
      id: String(row.id),
      capacityType: asCapacityType(row.capacity_type),
      title: String(row.title ?? ""),
      description: row.description ? String(row.description) : null,
      isActive: row.is_active !== false,
      ownerName: row.owner_name ? String(row.owner_name) : null,
      coverageScope: row.coverage_scope ? String(row.coverage_scope) : null,
      province: row.province ? String(row.province) : null,
      city: row.city ? String(row.city) : null,
      deviceId: row.device_id ? String(row.device_id) : null,
      deviceName: row.device_name ? String(row.device_name) : null,
      userId: row.user_id ? String(row.user_id) : null,
      userName: row.user_name ? String(row.user_name) : null,
      lastUpdatedAt: toIsoString(row.last_updated_at),
    })),
  ];
}
