import { OrganizationMediaIntelligenceAdmin } from "@/components/admin/monitoring/organization-media-intelligence-admin";
import { requireReisMonitoringAccess } from "@/lib/reis/monitoring-access";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReisMonitoringOrganizationPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { campaignId } = await requireReisMonitoringAccess(query.campaign);
  return (
    <OrganizationMediaIntelligenceAdmin campaignId={campaignId} organizationId={id} />
  );
}
