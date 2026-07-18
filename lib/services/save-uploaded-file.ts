import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { assertMagicMatchesKind } from "@/lib/security/file-magic";
import { getUploadPublicUrl, getUploadsDir } from "@/lib/uploads";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

export async function saveUploadedImageBuffer(
  buffer: Buffer,
  options?: { mimeType?: string; fileNameHint?: string }
): Promise<string> {
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("حجم تصویر بیش از حد مجاز است");
  }

  const magic = assertMagicMatchesKind(buffer, "image");
  if (!magic.ok) {
    throw new Error(magic.error);
  }

  const hintExt = options?.fileNameHint?.match(/(\.[a-z0-9]+)$/i)?.[1]?.toLowerCase();
  const mimeExt = options?.mimeType ? extensionForMime(options.mimeType) : "";
  const extension = mimeExt || hintExt || ".jpg";
  const filename = `${randomUUID()}${extension}`;
  const uploadsDir = getUploadsDir();

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(`${uploadsDir}/${filename}`, buffer);

  return getUploadPublicUrl(filename);
}

export async function saveUploadedImageFile(file: File): Promise<string> {
  if (file.type === "image/svg+xml") {
    throw new Error("آپلود فایل SVG مجاز نیست");
  }

  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("نوع فایل تصویر مجاز نیست");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("حجم تصویر بیش از حد مجاز است");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return saveUploadedImageBuffer(buffer, {
    mimeType: file.type,
    fileNameHint: file.name,
  });
}
