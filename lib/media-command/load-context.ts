import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { requireContributorAccess } from "@/lib/auth/require-contributor-access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgGetMediaCommandBundle } from "@/lib/db/repository-media-command";
import { isPostgresConfigured } from "@/lib/utils";
import type { MediaCommandBundle } from "@/lib/media-command/types";

export async function loadMediaCommandContext(campaignParam?: string) {
  const { campaignId } = await resolveAdminCampaignId(campaignParam);
  if (!campaignId) redirect("/admin");
  await requireContributorAccess(campaignId, "mediaCommand");
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  if (!isPostgresConfigured()) {
    const empty: MediaCommandBundle = {
      summary: {
        connectedAccounts: 0,
        brokenAccounts: 0,
        publishedContents: 0,
        scheduledContents: 0,
        pendingApproval: 0,
        newOrders: 0,
        unansweredInteractions: 0,
        publishErrors: 0,
        missionCompletionRate: 100,
      },
      todayTasks: [],
      suggestions: [],
      accounts: [],
      contents: [],
      orders: [],
      interactions: [],
      library: [],
      recentEvents: [],
    };
    return { campaignId, session, bundle: empty, isFullAdmin: isFullAdmin(session) };
  }

  const bundle = await pgGetMediaCommandBundle(campaignId);
  return { campaignId, session, bundle, isFullAdmin: isFullAdmin(session) };
}
