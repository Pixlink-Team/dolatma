export async function downloadMedia(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function getFilenameFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const base = pathname.split("/").pop();
    return base && base.length > 0 ? base : fallback;
  } catch {
    return fallback;
  }
}

export function hasDistinctThumbnail(thumbnailUrl?: string | null, mediaUrl?: string | null): boolean {
  if (!thumbnailUrl) return false;
  if (!mediaUrl) return true;
  return thumbnailUrl.trim() !== mediaUrl.trim();
}
