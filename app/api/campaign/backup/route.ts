import { cookies } from "next/headers";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/auth/admin-session";
import { isFullAdmin } from "@/lib/auth/get-session";
import { parseSessionTokenSync } from "@/lib/auth/session-node";
import * as pg from "@/lib/db/repository";
import {
  createCampaignBackupZip,
  listStoredCampaignBackups,
  resolveStoredBackupPath,
  saveCampaignBackupZip,
} from "@/lib/services/campaign-backup";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function requireFullAdmin() {
  const cookieStore = await cookies();
  const session = parseSessionTokenSync(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session || !isFullAdmin(session)) {
    return null;
  }
  return session;
}

/** Download latest (or named) stored backup. Use ?mode=live for on-the-fly ZIP. */
export async function GET(request: Request) {
  if (!(await requireFullAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const campaign = await pg.pgGetCampaignById(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (searchParams.get("mode") === "live") {
    const zipBuffer = await createCampaignBackupZip(campaignId);
    const filename = `backup-${campaign.slug}-${new Date().toISOString().split("T")[0]}.zip`;
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const requestedName = searchParams.get("filename");
  const backups = await listStoredCampaignBackups(campaignId);
  const target = requestedName
    ? backups.find((item) => item.filename === requestedName)
    : backups[0];

  if (!target) {
    return NextResponse.json(
      { error: "هیچ پشتیبان ذخیره‌شده‌ای یافت نشد. ابتدا یک پشتیبان بسازید." },
      { status: 404 }
    );
  }

  const resolved = await resolveStoredBackupPath(campaignId, target.filename);
  if (!resolved) {
    return NextResponse.json({ error: "فایل پشتیبان یافت نشد" }, { status: 404 });
  }

  const zipBuffer = await readFile(resolved.absolutePath);
  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(zipBuffer.byteLength),
      "Content-Disposition": `attachment; filename="${target.filename}"`,
    },
  });
}

/** Create a backup ZIP and store it on the server for later download. */
export async function POST(request: Request) {
  if (!(await requireFullAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let campaignId: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { campaignId?: string } | null;
    campaignId = body?.campaignId?.trim() || null;
  } else {
    const { searchParams } = new URL(request.url);
    campaignId = searchParams.get("campaignId");
  }

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const campaign = await pg.pgGetCampaignById(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  try {
    const backup = await saveCampaignBackupZip(campaignId, { source: "manual" });
    return NextResponse.json({ success: true, backup });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "خطا در ساخت پشتیبان",
      },
      { status: 500 }
    );
  }
}
