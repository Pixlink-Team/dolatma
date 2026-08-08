import { RapidResponseCaseDetailAdmin } from "@/components/admin/monitoring/rapid-response-case-detail-admin";
import { requireReisMonitoringAccess } from "@/lib/reis/monitoring-access";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReisMonitoringCaseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { campaignId } = await requireReisMonitoringAccess(query.campaign);
  return <RapidResponseCaseDetailAdmin campaignId={campaignId} caseId={id} />;
}
