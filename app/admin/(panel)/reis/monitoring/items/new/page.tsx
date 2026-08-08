import { MonitoringItemFormAdmin } from "@/components/admin/monitoring/monitoring-item-form-admin";
import { requireReisMonitoringAccess } from "@/lib/reis/monitoring-access";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReisMonitoringNewItemPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await requireReisMonitoringAccess(params.campaign);
  return <MonitoringItemFormAdmin campaignId={campaignId} /