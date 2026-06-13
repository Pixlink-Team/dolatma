import { getAllCampaigns } from "@/lib/data-access/admin";
import { CampaignsAdmin } from "@/components/admin/campaigns-admin";

export default async function CampaignsPage() {
  const campaigns = await getAllCampaigns();
  return <CampaignsAdmin initialCampaigns={campaigns} />;
}
