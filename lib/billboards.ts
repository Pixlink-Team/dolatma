import {
  getSafeCreatedTimestamp,
  getTehranCalendarDateIso,
  isSameDay,
} from "@/lib/safe-dates";
import type { Billboard, CampaignSettings } from "@/lib/types";

export {
  BILLBOARD_PLACEHOLDER_IMAGE,
  getBillboardDisplayImage,
  hasBillboardDisplayImage,
} from "@/lib/billboard-media";

/**
 * Ephemeral billboards from a former live Map-Bilboard fetch (not DB rows).
 * Kept for defensive checks against any leftover in-memory ids.
 */
export function isLiveApiBillboard(billboard: Billboard): boolean {
  return billboard.id.startsWith("api-") || billboard.id.startsWith("int-");
}

export function isApiBillboard(billboard: Billboard): boolean {
  return isLiveApiBillboard(billboard);
}

/** Live API billboards were re-mapped with createdAt=now on every fetch. */
export function countsAsTodayBillboardUpload(billboard: Billboard): boolean {
  if (isLiveApiBillboard(billboard)) return false;
  return isSameDay(getSafeCreatedTimestamp(billboard), getTehranCalendarDateIso());
}

export function getBillboardUploadActivityDate(billboard: Billboard): string {
  if (isLiveApiBillboard(billboard)) return "";
  return getSafeCreatedTimestamp(billboard);
}

export function billboardBelongsToUser(
  billboard: Billboard,
  ownerUserId: string | null
): boolean {
  return (billboard.ownerUserId ?? null) === ownerUserId;
}

export function filterBillboardsByOwnerUser(
  billboards: Billboard[],
  ownerUserId: string | null
): Billboard[] {
  return billboards.filter((billboard) => billboardBelongsToUser(billboard, ownerUserId));
}

function sortLocalBillboards(dbBillboards: Billboard[]): Billboard[] {
  return [...dbBillboards].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function resolveAdminBillboards(
  _settings: CampaignSettings,
  dbBillboards: Billboard[],
  ownerUserId?: string | null
): Promise<Billboard[]> {
  const localBillboards = sortLocalBillboards(dbBillboards);

  if (ownerUserId !== undefined) {
    return filterBillboardsByOwnerUser(localBillboards, ownerUserId);
  }

  return localBillboards;
}

export async function resolvePublicBillboards(
  _settings: CampaignSettings,
  dbBillboards: Billboard[]
): Promise<Billboard[]> {
  return sortLocalBillboards(dbBillboards);
}

export function hasBillboardCoordinates(billboard: Billboard): boolean {
  return (
    typeof billboard.latitude === "number" &&
    typeof billboard.longitude === "number" &&
    Number.isFinite(billboard.latitude) &&
    Number.isFinite(billboard.longitude)
  );
}

export function shouldShowBillboardStatus(billboard: Billboard): boolean {
  return !isApiBillboard(billboard);
}

export function filterPublicBillboardTags(tags: string[]): string[] {
  return tags.filter(
    (tag) =>
      !tag.startsWith("map:") &&
      !tag.startsWith("province:") &&
      !tag.startsWith("assignment:") &&
      !tag.startsWith("display-range:")
  );
}

const DAY_MS = 86_400_000;

export function getBillboardDisplayDays(billboard: Billboard): number | null {
  const periods = billboard.displayPeriods;
  if (!periods?.length) return null;

  let total = 0;
  for (const period of periods) {
    const start = Date.parse(period.startDate);
    const end = Date.parse(period.endDate);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue;
    total += Math.round((end - start) / DAY_MS) + 1;
  }

  return total > 0 ? total : null;
}

export function shouldShowBillboardNotes(billboard: Billboard): boolean {
  return !isApiBillboard(billboard) && Boolean(billboard.notes);
}

export function getBillboardDateLabel(billboard: Billboard): string | null {
  if (billboard.displayDateRange) return billboard.displayDateRange;

  const rangeTag = billboard.tags.find((tag) => tag.startsWith("display-range:"));
  if (rangeTag) {
    return rangeTag.slice("display-range:".length);
  }

  return null;
}
