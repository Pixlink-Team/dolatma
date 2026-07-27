import { NextResponse } from "next/server";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  listAllStoredCampaignBackups,
  listStoredCampaignBackups,
  runDailyCampaignBackups,
} from "@/lib/services/campaign-backup";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Lists stored backups for one campaign (?campaignId=) or across all campaigns (no param). */
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaignId = new URL(request.url).searchParams.get("campaignId");
  if (!campaignId) {
    const backups = await listAllStoredCampaignBackups();
    return NextResponse.json({ success: true, backups, latest: backups[0] ?? null });
  }

  const backups = await listStoredCampaignBackups(campaignId);
  return NextResponse.json({
    success: true,
    backups,
    latest: backups[0] ?? null,
  });
}

/** Creates a fresh backup ZIP for every campaign right now (same job the nightly cron runs). */
export async function POST() {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyCampaignBackups();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "خطا در ساخت پشتیبان همه راستاها",
      },
      { status: 500 }
    );
  }
}
