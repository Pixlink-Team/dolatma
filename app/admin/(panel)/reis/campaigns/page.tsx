import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { getAllCampaigns } from "@/lib/data-access/admin";
import { pgGetUserById } from "@/lib/db/repository-extended";
import { REIS_HOME_PATH } from "@/lib/reis/sections";
import { isPostgresConfigured } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

/** Opens the public live campaign report for the active campaign. */
export default async function ReisCampaignsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  const allCampaigns = await getAllCampaigns();

  let campaigns = allCampaigns;
  if (!isFullAdmin(session) && session.userId && isPostgresConfigured()) {
    try {
      const user = await pgGetUserById(session.userId);
      const allowed = new Set(user?.campaignIds ?? []);
      campaigns = allCampaigns.filter((campaign) => allowed.has(campaign.id));
    } catch {
      campaigns = [];
    }
  }

  const campaign =
    (campaignId ? campaigns.find((item) => item.id === campaignId) : undefined) ??
    campaigns[0] ??
    allCampaigns.find((item) => item.id === campaignId) ??
    allCampaigns[0];

  if (!campaign?.slug) {
    redirect(REIS_HOME_PATH);
  }

  redirect(`/campaign/${campaign.slug}`);
}
