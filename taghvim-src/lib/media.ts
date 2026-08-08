import type { TimelineMedia } from "@taghvim/types/timeline";

export type MediaKind = TimelineMedia["type"];

export function mediaKindFromMime(mime: string | null | undefined): MediaKind {
  const value = (mime ?? "").toLowerCase();
  if (value.startsWith("image/")) return "image";
  if (value.startsWith("video/")) return "video";
  if (value.startsWith("audio/")) return "audio";
  return "document";
}

export function mediaKindFromFile(file: File): MediaKind {
  return mediaKindFromMime(file.type);
}

export function isAllowedMediaFile(file: File): boolean {
  const kind = mediaKindFromFile(file);
  return kind === "image" || kind === "video" || kind === "audio";
}

/** 50MB — matches backend UploadMediaRequest */
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

export function mediaKindLabel(kind: MediaKind): string {
  switch (kind) {
    case "image":
      return "تصویر";
    case "video":
      return "فیلم";
    case "audio":
      return "صوت";
    default:
      return "فایل";
  }
}
