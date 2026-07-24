import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { OrganizationMediaIntelligenceAdmin } from "@/components/admin/monitoring/organization-media-intelligence-admin";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaign?: string }>;
}

export default async function OrganizationMediaIntelligencePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(query.campaign);
  if (!campaignId) redirect("/admin");
  return (
    <OrganizationMediaIntelligenceAdmin campaignId={campaignId} organizationId={id} />
  );
}
