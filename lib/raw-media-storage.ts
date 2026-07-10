import type { RawMediaStorageSummary, RawMediaUpload } from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";

/** 50 GB storage quota for raw media uploads per campaign. */
export const RAW_MEDIA_STORAGE_LIMIT_BYTES = 50 * 1024 * 1024 * 1024;

/** Max single raw media file size (2 GB). */
export const RAW_MEDIA_MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;

export function buildRawMediaStorageSummary(
  items: Pick<RawMediaUpload, "fileSize">[]
): RawMediaStorageSummary {
  const usedBytes = items.reduce((sum, item) => sum + Math.max(0, item.fileSize || 0), 0);
  const limitBytes = RAW_MEDIA_STORAGE_LIMIT_BYTES;
  const remainingBytes = Math.max(0, limitBytes - usedBytes);
  const percentUsed = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;

  return {
    usedBytes,
    limitBytes,
    remainingBytes,
    fileCount: items.length,
    percentUsed,
  };
}

export function formatStorageBytes(bytes: number): string {
  const safe = Math.max(0, bytes);
  if (safe < 1024) return `${formatPersianNumber(safe)} B`;
  if (safe < 1024 * 1024) return `${formatPersianNumber(Math.round(safe / 1024))} KB`;
  if (safe < 1024 * 1024 * 1024) {
    return `${formatPersianNumber(Math.round((safe / (1024 * 1024)) * 10) / 10)} MB`;
  }
  return `${formatPersianNumber(Math.round((safe / (1024 * 1024 * 1024)) * 100) / 100)} GB`;
}

export function canAcceptRawMediaUpload(
  storage: RawMediaStorageSummary,
  incomingBytes: number
): { ok: true } | { ok: false; error: string } {
  if (incomingBytes <= 0) {
    return { ok: false, error: "حجم فایل نامعتبر است" };
  }
  if (incomingBytes > RAW_MEDIA_MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `حداکثر حجم هر فایل ${formatStorageBytes(RAW_MEDIA_MAX_FILE_BYTES)} است`,
    };
  }
  if (storage.usedBytes + incomingBytes > storage.limitBytes) {
    return {
      ok: false,
      error: `فضای ذخیره‌سازی کافی نیست. باقی‌مانده: ${formatStorageBytes(storage.remainingBytes)}`,
    };
  }
  return { ok: true };
}
