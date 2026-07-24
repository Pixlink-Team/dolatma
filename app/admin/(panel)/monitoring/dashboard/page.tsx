import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { MonitoringDashboardAdmin } from "@/components/admin/monitoring/monitoring-dashboard-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MonitoringDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");
  return <MonitoringDashboardAdmin campaignId={campaignId} />;
}
