import { MonitoringItemDetailAdmin } from "@/components/admin/monitoring/monitoring-item-detail-admin";
import { requireReisMonitoringAccess } from "@/lib/reis/monitoring";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaign?: string; convert?: string }>;
}

export default async function ReisMonitoringItemDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { campaignId } = await requireReisMonitoringAccess(query.campaign);
  return (
    <MonitoringItemDetailAdmin
      campaignId={campaignId}
      itemId={id}
      initialConvert={query.convert === "1"}
    />
  );
}
