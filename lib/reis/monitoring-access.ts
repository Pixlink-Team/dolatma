import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { requireContributorAccess } from "@/lib/auth/require-contributor-access";
import { REIS_HOME_PATH } from "@/lib/reis/sections";
import { isReisRole } from "@/lib/user-roles";

/** Shared gate for all /admin/reis/monitoring/* pages. */
export async function requireReisMonitoringAccess(campaignParam?: string) {
  const { campaignId } = await resolveAdminCampaignId(
    campaignParam?.trim() ? campaignParam : undefined
  );
  if (!campaignId) redirect(REIS_HOME_PATH);

  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  if (
    !isReisRole(session.role) &&
    !isFullAdmin(session) &&
    session.role !== "client"
  ) {
    redirect(REIS_HOME_PATH);
  }

  await requireContributorAccess(campaignId, "monitoring");
  return { campaignId, session };
}
