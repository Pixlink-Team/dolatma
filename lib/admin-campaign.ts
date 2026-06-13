import { getAllCampaigns } from "@/lib/data-access/admin";

export async function resolveAdminCampaignId(campaignParam?: string) {
  const campaigns = await getAllCampaigns();
  const campaignId = campaignParam ?? campaigns[0]?.id ?? "";
  return { campaignId, campaigns };
}
