import { getAllCampaigns } from "@/lib/data-access/admin";

export async function resolveAdminCampaignId(campaignParam?: string) {
  const campaigns = await getAllCampaigns();
  const fromParam = campaignParam?.trim() || "";
  const campaignId = fromParam || campaigns[0]?.id || "";
  return { campaignId, campaigns };
}
