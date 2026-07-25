/**
 * Client-side image resize + WebP compression before upload.
 * Keeps logos/icons small without a new dependency.
 */

export type OptimizeImageOptions = {
  /** Longest edge in pixels (default 512). */
  maxEdge?: number;
  /** Initial WebP quality 0–1 (default 0.82). */
  quality?: number;
  /** Soft target file size; quality is reduced until under this when possible. */
  targetMaxBytes?: number;
};

const DEFAULT_MAX_EDGE = 512;
const DEFAULT_QUALITY = 0.82;
const DEFAULT_TARGET_MAX_BYTES = 150 * 1024;
const MIN_QUALITY = 0.5;

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("ساخت تصویر WebP ناموفق بود"));
      },
      "image/webp",
      quality
    );
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("بارگذاری تصویر ناموفق بود"));
    };
    image.src = url;
  });
}

function shouldSkipOptimization(file: File): boolean {
  const type = file.type.toLowerCase();
  // Keep animated GIFs and vector/icon formats as-is.
  if (type === "image/gif" || type === "image/svg+xml" || type === "image/x-icon") {
    return true;
  }
  return !type.startsWith("image/");
}

/**
 * Resize and compress an image File to WebP when beneficial.
 * Returns the original file when optimization is skipped or not smaller.
 */
export async function optimizeImageFile(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<File> {
  if (shouldSkipOptimization(file)) return file;

  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const targetMaxBytes = options.targetMaxBytes ?? DEFAULT_TARGET_MAX_BYTES;
  let quality = options.quality ?? DEFAULT_QUALITY;

  const image = await loadImageFromFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return file;

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const alreadySmallEnough =
    scale === 1 && file.size <= targetMaxBytes && file.type === "image/webp";
  if (alreadySmallEnough) return file;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(image, 0, 0, width, height);

  let blob = await canvasToWebpBlob(canvas, quality);
  while (blob.size > targetMaxBytes && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, Math.round((quality - 0.08) * 100) / 100);
    blob = await canvasToWebpBlob(canvas, quality);
  }

  // Prefer original when optimization does not shrink the payload.
  if (blob.size >= file.size && scale === 1) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
