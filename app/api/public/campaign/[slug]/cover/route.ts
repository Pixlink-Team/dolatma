import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { pgGetPublishedCampaignBySlug } from "@/lib/db/repository";
import { isLocalUploadedFileUrl } from "@/lib/media-utils";
import { isPostgresConfigured } from "@/lib/utils";
import { resolveUploadFilePath, stripFileAccessToken } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function getContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

function extractUploadFilename(coverImageUrl: string): string | null {
  const bare = stripFileAccessToken(coverImageUrl);
  if (!isLocalUploadedFileUrl(bare)) return null;
  const match = /^\/api\/files\/([^/?#]+)/i.exec(bare);
  if (!match?.[1]) return null;
  const safeName = path.basename(match[1]);
  if (!safeName || safeName === "." || safeName === "..") return null;
  return safeName;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug?.trim() || !isPostgresConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const settings = await pgGetPublishedCampaignBySlug(slug.trim());
  const coverImageUrl = settings?.coverImageUrl?.trim();
  if (!coverImageUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filename = extractUploadFilename(coverImageUrl);
  if (!filename) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const filePath = resolveUploadFilePath(filename);
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const contentType = getContentType(filename);
    const nodeStream = createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileStat.size),
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
