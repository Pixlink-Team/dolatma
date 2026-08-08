import { MonitoringTrendsAdmin } from "@/components/admin/monitoring/monitoring-trends-admin";
import { requireReisMonitoringAccess } from "@/lib/reis/monitoring-access";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReisMonitoringTrendsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await requireReisMonitoringAccess(params.campaign);
  return <MonitoringTrendsAdmin campaignId={campaignId} /