import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { getUploadPublicUrl, getUploadsDir } from "@/lib/uploads";

const MAX_BYTES = 50 * 1024 * 1024;

export async function saveTaghvimUpload(file: File): Promise<{
  path: string;
  mime_type: string | null;
  size: number;
}> {
  if (file.size > MAX_BYTES) {
    throw new Error("حجم فایل بیش از حد مجاز است");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext =
    path.extname(file.name || "").toLowerCase().replace(/[^.a-z0-9]/gi, "") ||
    "";
  const filename = `taghvim-${randomUUID()}${ext}`;
  const uploadsDir = getUploadsDir();
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(`${uploadsDir}/${filename}`, buffer);
  return {
    path: getUploadPublicUrl(filename),
    mime_type: file.type || null,
    size: buffer.byteLength,
  };
}
