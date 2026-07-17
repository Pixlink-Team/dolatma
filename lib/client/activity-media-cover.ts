import type { ActivityMediaItem } from "@/lib/types";

export function applyVideoCoverToMediaItems(
  mediaItems: ActivityMediaItem[],
  coverUrl: string,
  maxItems: number
): { mediaItems: ActivityMediaItem[]; applied: boolean } {
  const hasFilledImage = mediaItems.some((item) => item.type === "image" && item.url.trim());
  if (hasFilledImage) {
    return { mediaItems, applied: false };
  }

  const emptyImage = mediaItems.find((item) => item.type === "image" && !item.url.trim());
  if (emptyImage) {
    return {
      mediaItems: mediaItems.map((item) =>
        item.id === emptyImage.id ? { ...item, url: coverUrl } : item
      ),
      applied: true,
    };
  }

  if (mediaItems.length < maxItems) {
    return {
      mediaItems: [{ id: crypto.randomUUID(), type: "image", url: coverUrl }, ...mediaItems],
      applied: true,
    };
  }

  return { mediaItems, applied: false };
}
