import { MonitoringFeedAdmin } from "@/components/admin/monitoring/monitoring-feed-admin";
import { requireReisMonitoringAccess } from "@/lib/reis/monitoring-access";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReisMonitoringFeedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await requireReisMonitoringAccess(params.campaign);
  return <MonitoringFeedAdmin campaignId={campaignId} /