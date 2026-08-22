import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/get-session";
import { verifyFileAccessToken } from "@/lib/auth/file-access-token";
import {
  getOrCreateUploadThumbnail,
  parseThumbnailQuality,
  parseThumbnailWidth,
} from "@/lib/services/resize-upload-image";
import { resolveUploadFilePath } from "@/lib/uploads";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
};

function getContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

function sanitizeFilename(raw: string): string | null {
  const safeName = path.basename(raw.split("?")[0].split("#")[0]);
  if (!safeName || safeName === "." || safeName === "..") return null;
  return safeName;
}

const INLINE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "application/pdf",
]);

/**
 * Signed URLs work for public/unauthenticated views.
 * Authenticated admin-panel sessions may also load uploads (UUID filenames).
 */
async function canAccessFile(request: Request, filename: string): Promise<boolean> {
  const { searchParams } = new URL(request.url);
  if (verifyFileAccessToken(filename, searchParams.get("exp"), searchParams.get("sig"))) {
    return true;
  }

  const session = await getAuthSession();
  return Boolean(session);
}

function contentDispositionFor(contentType: string, filename: string): string {
  if (INLINE_CONTENT_TYPES.has(contentType)) return "inline";
  return `attachment; filename="${filename.replace(/"/g, "")}"`;
}

function streamFileResponse(
  filePath: string,
  contentType: string,
  options: {
    status?: number;
    start?: number;
    end?: number;
    contentLength: number;
    fileSize: number;
    isPartial: boolean;
  }
) {
  const nodeStream =
    options.start !== undefined && options.end !== undefined
      ? createReadStream(filePath, { start: options.start, end: options.end })
      : createReadStream(filePath);

  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Length": String(options.contentLength),
    "Content-Disposition": contentDispositionFor(contentType, path.basename(filePath)),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };

  if (options.isPartial && options.start !== undefined && options.end !== undefined) {
    headers["Content-Range"] = `bytes ${options.start}-${options.end}/${options.fileSize}`;
  }

  return new NextResponse(webStream, {
    status: options.status ?? 200,
    headers,
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename: rawFilename } = await params;
  const filename = sanitizeFilename(decodeURIComponent(rawFilename));
  if (!filename) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await canAccessFile(request, filename))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const filePath = resolveUploadFilePath(filename);
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const thumbWidth = parseThumbnailWidth(searchParams.get("w"));
    if (thumbWidth) {
      const quality = parseThumbnailQuality(searchParams.get("q"));
      const thumb = await getOrCreateUploadThumbnail(filePath, filename, thumbWidth, quality);
      if (thumb) {
        return new NextResponse(new Uint8Array(thumb.buffer), {
          headers: {
            "Content-Type": thumb.contentType,
            "Content-Length": String(thumb.buffer.length),
            "Content-Disposition": "inline",
            "Cache-Control": "private, max-age=86400",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    const contentType = getContentType(filename);
    const fileSize = fileStat.size;
    const range = request.headers.get("range");

    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/i.exec(range);
      if (match) {
        const start = Number.parseInt(match[1], 10);
        const end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize || start > end) {
          return new NextResponse(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
            },
          });
        }

        const chunkSize = end - start + 1;
        return streamFileResponse(filePath, contentType, {
          status: 206,
          start,
          end,
          contentLength: chunkSize,
          fileSize,
          isPartial: true,
        });
      }
    }

    return streamFileResponse(filePath, contentType, {
      contentLength: fileSize,
      fileSize,
      isPartial: false,
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
