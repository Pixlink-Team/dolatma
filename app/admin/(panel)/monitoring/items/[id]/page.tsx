import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { MonitoringItemDetailAdmin } from "@/components/admin/monitoring/monitoring-item-detail-admin";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaign?: string; convert?: string }>;
}

export default async function MonitoringItemDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(query.campaign);
  if (!campaignId) redirect("/admin");
  return (
    <MonitoringItemDetailAdmin
      campaignId={campaignId}
      itemId={id}
      initialConvert={query.convert === "1"}
    />
  );
}
