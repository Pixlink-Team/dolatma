import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/auth/admin-session";
import { isFullAdmin } from "@/lib/auth/get-session";
import { parseSessionTokenSync } from "@/lib/auth/session-node";
import * as pg from "@/lib/db/repository";
import { createCampaignBackupZip } from "@/lib/services/campaign-backup";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = parseSessionTokenSync(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session || !isFullAdmin(session)) {
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

  const zipBuffer = await createCampaignBackupZip(campaignId);
  const filename = `backup-${campaign.slug}-${new Date().toISOString().split("T")[0]}.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
