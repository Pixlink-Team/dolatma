import { getSocialPlatformLabel } from "@/components/public/social-platform-icon";
import { normalizeCapacityDetails } from "@/lib/capacity-details";
import { getSql } from "@/lib/db/client";
import { ensureDeviceSchema } from "@/lib/db/repository-devices";
import { generateId } from "@/lib/utils";
import type {
  DeviceCapacitySourceType,
  DeviceCapacityType,
  SocialPlatform,
} from "@/lib/types";

async function resolveOwnerHomeDeviceId(
  ownerUserId: string | null | undefined
): Promise<string | null> {
  if (!ownerUserId) return null;
  const sql = getSql();
  const rows = await sql`
    SELECT COALESCE(device_id, organization_id, ministry_id) AS device_id
    FROM users
    WHERE id = ${ownerUserId}
    LIMIT 1
  `;
  const deviceId = rows[0]?.device_id;
  if (!deviceId) return null;

  const deviceRows = await sql`
    SELECT id FROM devices WHERE id = ${String(deviceId)} LIMIT 1
  `;
  return deviceRows[0]?.id ? String(deviceRows[0].id) : null;
}

export async function upsertSyncedCapacity(input: {
  ownerUserId?: string | null;
  sourceType: DeviceCapacitySourceType;
  sourceId: string;
  capacityType: DeviceCapacityType;
  title: string;
  description?: string | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  const deviceId = await resolveOwnerHomeDeviceId(input.ownerUserId);
  if (!deviceId) return;

  await ensureDeviceSchema();
  const sql = getSql();
  const title = input.title.trim();
  if (!title) return;

  const description = input.description?.trim() || null;
  const details = normalizeCapacityDetails(input.capacityType, input.details ?? {});
  const detailsJson = JSON.parse(JSON.stringify(details));
  const now = new Date().toISOString();

  const existing = await sql`
    SELECT id FROM device_capacities
    WHERE device_id = ${deviceId}
      AND source_type = ${input.sourceType}
      AND source_id = ${input.sourceId}
    LIMIT 1
  `;

  if (existing[0]?.id) {
    await sql`
      UPDATE device_capacities SET
        capacity_type = ${input.capacityType},
        title = ${title},
        description = ${description},
        details = ${sql.json(detailsJson)},
        is_active = true,
        last_updated_at = ${now}
      WHERE id = ${String(existing[0].id)}
    `;
    return;
  }

  await sql`
    INSERT INTO device_capacities (
      id, device_id, capacity_type, title, description, is_active,
      details, source_type, source_id, last_updated_at, created_at
    )
    VALUES (
      ${generateId()}, ${deviceId}, ${input.capacityType}, ${title}, ${description},
      true, ${sql.json(detailsJson)}, ${input.sourceType}, ${input.sourceId},
      ${now}, ${now}
    )
  `;
}

export async function deleteSyncedCapacity(
  sourceType: DeviceCapacitySourceType,
  sourceId: string
): Promise<void> {
  if (!sourceId) return;
  await ensureDeviceSchema();
  const sql = getSql();
  await sql`
    DELETE FROM device_capacities
    WHERE source_type = ${sourceType}
      AND source_id = ${sourceId}
  `;
}

/** Best-effort sync; never throws to the caller. */
export async function syncWebsiteCapacityFromContent(input: {
  ownerUserId?: string | null;
  sourceId: string;
  title: string;
  url: string;
  description?: string | null;
}): Promise<void> {
  try {
    await upsertSyncedCapacity({
      ownerUserId: input.ownerUserId,
      sourceType: "company_website",
      sourceId: input.sourceId,
      capacityType: "website",
      title: input.title,
      description: input.description,
      details: { url: input.url },
    });
  } catch (error) {
    console.error("[syncWebsiteCapacityFromContent]", error);
  }
}

/** Best-effort sync; never throws to the caller. */
export async function syncSocialCapacityFromContent(input: {
  ownerUserId?: string | null;
  sourceId: string;
  platform: SocialPlatform;
  title?: string | null;
  profileUrl?: string | null;
  followers?: number | null;
}): Promise<void> {
  try {
    const title = input.title?.trim() || getSocialPlatformLabel(input.platform);
    await upsertSyncedCapacity({
      ownerUserId: input.ownerUserId,
      sourceType: "social_platform_stat",
      sourceId: input.sourceId,
      capacityType: "social",
      title,
      details: {
        handleOrUrl: input.profileUrl ?? null,
        followers: input.followers ?? null,
      },
    });
  } catch (error) {
    console.error("[syncSocialCapacityFromContent]", error);
  }
}

/** Best-effort delete; never throws to the caller. */
export async function removeSyncedCapacity(
  sourceType: DeviceCapacitySourceType,
  sourceId: string
): Promise<void> {
  try {
    await deleteSyncedCapacity(sourceType, sourceId);
  } catch (error) {
    console.error("[removeSyncedCapacity]", error);
  }
}
