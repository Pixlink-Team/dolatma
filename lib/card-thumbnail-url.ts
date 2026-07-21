/** Default card preview width (covers ~240–320px slots at 1.5–2x DPR). */
export const CARD_THUMB_WIDTH = 480;
export const CARD_THUMB_QUALITY = 70;

/** Tiny list/row thumbs (e.g. 56px leaderboard slots). */
export const COMPACT_THUMB_WIDTH = 160;

const ALLOWED_WIDTHS = new Set([160, 240, 320, 400, 480, 640, 800]);

function snapWidth(width: number): number {
  if (ALLOWED_WIDTHS.has(width)) return width;
  const sorted = [...ALLOWED_WIDTHS].sort((a, b) => a - b);
  for (const candidate of sorted) {
    if (candidate >= width) return candidate;
  }
  return sorted[sorted.length - 1];
}

function clampQuality(quality: number): number {
  if (!Number.isFinite(quality)) return CARD_THUMB_QUALITY;
  return Math.min(90, Math.max(40, Math.round(quality)));
}

/**
 * Append on-demand resize params to local `/api/files/` URLs.
 * Preserves existing query (exp/sig). Remote URLs are returned unchanged.
 */
export function toCardThumbnailUrl(
  url: string,
  options?: { width?: number; quality?: number }
): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return trimmed;

  let pathname = "";
  let search = "";
  try {
    const parsed = new URL(trimmed, "https://local.invalid");
    pathname = parsed.pathname;
    search = parsed.search;
  } catch {
    return trimmed;
  }

  if (!pathname.startsWith("/api/files/")) return trimmed;

  const width = snapWidth(options?.width ?? CARD_THUMB_WIDTH);
  const quality = clampQuality(options?.quality ?? CARD_THUMB_QUALITY);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.set("w", String(width));
  params.set("q", String(quality));

  const base = trimmed.split("?")[0].split("#")[0];
  return `${base}?${params.toString()}`;
}
