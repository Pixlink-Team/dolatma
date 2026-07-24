import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { MonitoringItemFormAdmin } from "@/components/admin/monitoring/monitoring-item-form-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MonitoringItemNewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");
  return <MonitoringItemFormAdmin campaignId={campaignId} />;
}
