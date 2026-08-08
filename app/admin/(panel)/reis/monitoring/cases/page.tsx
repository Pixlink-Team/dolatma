import { RapidResponseCasesAdmin } from "@/components/admin/monitoring/rapid-response-cases-admin";
import { requireReisMonitoringAccess } from "@/lib/reis/monitoring-access";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReisMonitoringCasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await requireReisMonitoringAccess(params.campaign);
  return <RapidResponseCasesAdmin campaignId={campaignId} />;
}
