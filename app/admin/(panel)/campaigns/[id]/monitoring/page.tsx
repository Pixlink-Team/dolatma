import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { CampaignMonitoringAdmin } from "@/components/admin/monitoring/campaign-monitoring-admin";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaign?: string }>;
}

export default async function CampaignMonitoringPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  // Prefer the campaign from the route segment; fall back to query/default.
  const resolved = await resolveAdminCampaignId(query.campaign ?? id);
  const campaignId = id || resolved.campaignId;
  if (!campaignId) redirect("/admin");
  return <CampaignMonitoringAdmin campaignId={campaignId} />;
}
