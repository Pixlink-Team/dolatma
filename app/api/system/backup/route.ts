import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  deleteStoredSystemBackup,
  listStoredSystemBackups,
  resolveSystemBackupPath,
  saveSystemBackup,
} from "@/lib/services/system-backup";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

async function requireFullAdmin() {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return null;
  }
  return session;
}

/** List stored system backups or download one (?filename=). */
export async function GET(request: Request) {
  if (!(await requireFullAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");

  if (filename) {
    const resolved = await resolveSystemBackupPath(filename);
    if (!resolved) {
      return NextResponse.json({ error: "فایل پشتیبان یافت نشد" }, { status: 404 });
    }

    const zipBuffer = await readFile(resolved);
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(zipBuffer.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const backups = await listStoredSystemBackups();
  return NextResponse.json({ success: true, backups });
}

/** Create a full system backup (PostgreSQL dump + uploads + manifest). */
export async function POST() {
  if (!(await requireFullAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  try {
    const backup = await saveSystemBackup({ source: "manual" });
    return NextResponse.json({ success: true, backup });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "خطا در ساخت پشتیبان کامل سامانه",
      },
      { status: 500 }
    );
  }
}

/** Delete a stored system backup ZIP. */
export async function DELETE(request: Request) {
  if (!(await requireFullAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let filename: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { filename?: string } | null;
    filename = body?.filename?.trim() || null;
  } else {
    filename = new URL(request.url).searchParams.get("filename");
  }

  if (!filename) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }

  try {
    const result = await deleteStoredSystemBackup(filename);
    if (!result) {
      return NextResponse.json({ error: "فایل پشتیبان یافت نشد" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "خطا در حذف پشتیبان",
      },
      { status: 500 }
    );
  }
}
