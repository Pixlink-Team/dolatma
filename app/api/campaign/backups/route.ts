import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/auth/admin-session";
import { isFullAdmin } from "@/lib/auth/get-session";
import { parseSessionTokenSync } from "@/lib/auth/session-node";
import { listStoredCampaignBackups } from "@/lib/services/campaign-backup";

export const dynamic = "force-dynamic";

/** List stored backup ZIP files for a campaign. */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = parseSessionTokenSync(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session || !isFullAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaignId = new URL(request.url).searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const backups = await listStoredCampaignBackups(campaignId);
  return NextResponse.json({
    success: true,
    backups,
    latest: backups[0] ?? null,
  });
}
