import { mkdir, open, readFile, rename, stat, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getUploadsDir } from "@/lib/uploads";

const RESIZABLE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const ALLOWED_WIDTHS = new Set([160, 240, 320, 400, 480, 640, 800]);

export function isResizableImageFilename(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return RESIZABLE_EXT.has(ext);
}

export function parseThumbnailWidth(raw: string | null): number | null {
  if (!raw) return null;
  const width = Number.parseInt(raw, 10);
  if (!Number.isFinite(width) || !ALLOWED_WIDTHS.has(width)) return null;
  return width;
}

export function parseThumbnailQuality(raw: string | null, fallback = 70): number {
  if (!raw) return fallback;
  const quality = Number.parseInt(raw, 10);
  if (!Number.isFinite(quality)) return fallback;
  return Math.min(90, Math.max(40, quality));
}

function thumbCachePath(filename: string, width: number, quality: number): string {
  const safeBase = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(getUploadsDir(), ".thumbs", `${safeBase}-w${width}-q${quality}.webp`);
}

/**
 * Return a cached WebP thumbnail for an uploaded image, generating it on first request.
 * Falls back to null when resize is not applicable or fails.
 */
export async function getOrCreateUploadThumbnail(
  sourcePath: string,
  filename: string,
  width: number,
  quality: number
): Promise<{ buffer: Buffer; contentType: "image/webp" } | null> {
  if (!isResizableImageFilename(filename)) return null;

  const cachePath = thumbCachePath(filename, width, quality);

  try {
    const [sourceStat, cacheStat] = await Promise.all([
      stat(sourcePath),
      stat(cachePath).catch(() => null),
    ]);
    if (cacheStat?.isFile() && cacheStat.mtimeMs >= sourceStat.mtimeMs) {
      const buffer = await readFile(cachePath);
      return { buffer, contentType: "image/webp" };
    }
  } catch {
    // Continue to generate.
  }

  try {
    const sourceHandle = await open(sourcePath, "r");
    let sourceBuffer: Buffer;
    try {
      const sourceStat = await sourceHandle.stat();
      sourceBuffer = Buffer.alloc(sourceStat.size);
      await sourceHandle.read(sourceBuffer, 0, sourceStat.size, 0);
    } finally {
      await sourceHandle.close();
    }

    const buffer = await sharp(sourceBuffer, { failOn: "none" })
      .rotate()
      .resize({
        width,
        height: width,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4 })
      .toBuffer();

    await mkdir(path.dirname(cachePath), { recursive: true });
    const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, buffer);
    await rename(tempPath, cachePath).catch(async () => {
      // Another request may have won the race; prefer the existing cache.
      await writeFile(cachePath, buffer).catch(() => undefined);
    });

    return { buffer, contentType: "image/webp" };
  } catch {
    return null;
  }
}
