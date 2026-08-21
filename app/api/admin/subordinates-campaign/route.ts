import { NextResponse } from "next/server";
import { canViewSubtreeLiveReport } from "@/lib/auth/access";
import {
  getAuthSession,
  getSubordinatesOwnerFilter,
} from "@/lib/auth/get-session";
import { getPublicCampaignDataForOwners } from "@/lib/data-access/campaign";
import { isOrgUserRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Refresh endpoint for the subordinates-only live campaign report. */
export async function GET(request: Request) {
  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Database required" }, { status: 503 });
  }

  const session = await getAuthSession();
  if (!session || !canViewSubtreeLiveReport(session) || !isOrgUserRole(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const campaignSlug = searchParams.get("campaign")?.trim();
  if (!campaignSlug) {
    return NextResponse.json({ error: "campaign is required" }, { status: 400 });
  }

  const ownerScope = await getSubordinatesOwnerFilter(session);
  if (ownerScope === null || (Array.isArray(ownerScope) && ownerScope.length === 0)) {
    return NextResponse.json({ error: "No subordinates" }, { status: 404 });
  }

  const data = await getPublicCampaignDataForOwners(campaignSlug, ownerScope);
  if (!data) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
