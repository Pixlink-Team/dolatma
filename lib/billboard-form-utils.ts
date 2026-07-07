import type { Billboard, BillboardDisplayPeriod } from "@/lib/types";

export function parseProvinceFromBillboard(billboard: Billboard): string {
  const tagProvince = billboard.tags.find((tag) => tag.startsWith("province:"));
  if (tagProvince) return tagProvince.replace("province:", "").trim();
  if (billboard.province?.trim()) return billboard.province.trim();

  const notesMatch = billboard.notes?.match(/استان:\s*(.+)/);
  return notesMatch?.[1]?.trim() ?? "";
}

export function parseAreaSqmFromBillboard(billboard: Billboard): string {
  if (billboard.areaSqm != null && Number.isFinite(billboard.areaSqm)) {
    return String(billboard.areaSqm);
  }
  const notesMatch = billboard.notes?.match(/متراژ:\s*([\d.]+)/);
  return notesMatch?.[1] ?? "";
}

export function parseAddressFromBillboard(billboard: Billboard): string {
  return billboard.description?.trim() || billboard.location?.trim() || "";
}

export function periodsToLegacyDraft(
  periods: BillboardDisplayPeriod[],
  fallback: Billboard
): BillboardDisplayPeriod[] {
  if (periods.length > 0) return periods;

  return [
    {
      id: crypto.randomUUID(),
      billboardId: fallback.id,
      title: null,
      startDate: fallback.date,
      endDate: fallback.date,
      billboardImageUrl: fallback.thumbnailUrl,
      confirmationImageUrl: null,
      sortOrder: 0,
      createdAt: fallback.createdAt,
    },
  ];
}
