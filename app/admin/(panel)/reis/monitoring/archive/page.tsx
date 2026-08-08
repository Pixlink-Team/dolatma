import { MonitoringArchiveAdmin } from "@/components/admin/monitoring/monitoring-archive-admin";
import { requireReisMonitoringAccess } from "@/lib/reis/monitoring-access";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReisMonitoringArchivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await requireReisMonitoringAccess(params.campaign);
  return <MonitoringArchiveAdmin campaignId={campaignId} />;
}
