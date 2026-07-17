import type { Billboard } from "@/lib/types";

export const BILLBOARD_PLACEHOLDER_IMAGE = "/images/billboard-placeholder.svg";

const INVALID_BILLBOARD_IMAGE_HINTS = ["via.placeholder.com", "placeholder.com"];

function normalizeBillboardImageUrl(url?: string | null): string {
  return url?.trim() ?? "";
}

function isInvalidBillboardImageUrl(url: string): boolean {
  if (!url) return true;
  if (url === BILLBOARD_PLACEHOLDER_IMAGE) return true;
  const lower = url.toLowerCase();
  return INVALID_BILLBOARD_IMAGE_HINTS.some((hint) => lower.includes(hint));
}

function firstPeriodImageUrl(billboard: Billboard): string {
  const periods = billboard.displayPeriods;
  if (!periods?.length) return "";

  const sorted = [...periods].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const period of sorted) {
    const url = normalizeBillboardImageUrl(period.billboardImageUrl);
    if (!isInvalidBillboardImageUrl(url)) return url;
  }
  return "";
}

function resolveBillboardImageCandidate(billboard: Billboard): string {
  const imageUrl = normalizeBillboardImageUrl(billboard.imageUrl);
  const thumbnailUrl = normalizeBillboardImageUrl(billboard.thumbnailUrl);
  const fromRow = imageUrl || thumbnailUrl;
  if (!isInvalidBillboardImageUrl(fromRow)) return fromRow;
  return firstPeriodImageUrl(billboard);
}

export function hasBillboardDisplayImage(billboard: Billboard): boolean {
  return !isInvalidBillboardImageUrl(resolveBillboardImageCandidate(billboard));
}

export function getBillboardDisplayImage(billboard: Billboard): string {
  const candidate = resolveBillboardImageCandidate(billboard);
  if (isInvalidBillboardImageUrl(candidate)) {
    return BILLBOARD_PLACEHOLDER_IMAGE;
  }
  return candidate;
}
