import { MonitoringDashboardAdmin } from "@/components/admin/monitoring/monitoring-dashboard-admin";
import { requireReisMonitoringAccess } from "@/lib/reis/monitoring-access";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReisMonitoringDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await requireReisMonitoringAccess(params.campaign);
  return <MonitoringDashboardAdmin campaignId={campaignId} /