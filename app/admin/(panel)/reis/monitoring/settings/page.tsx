import { MonitoringSettingsAdmin } from "@/components/admin/monitoring/monitoring-settings-admin";
import { requireReisMonitoringAccess } from "@/lib/reis/monitoring-access";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReisMonitoringSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await requireReisMonitoringAccess(params.campaign);
  return <MonitoringSettingsAdmin campaignId={campaignId} /