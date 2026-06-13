import { redirect } from "next/navigation";
import { getAdminData } from "@/lib/data-access/admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { BillboardsAdmin } from "@/components/admin/billboards-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function BillboardsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin/campaigns");
  const data = await getAdminData(campaignId);
  return <BillboardsAdmin campaignId={campaignId} initialBillboards={data.billboards} />;
}
