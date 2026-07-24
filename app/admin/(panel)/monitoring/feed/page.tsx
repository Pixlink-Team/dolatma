import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { MonitoringFeedAdmin } from "@/components/admin/monitoring/monitoring-feed-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MonitoringFeedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");
  return <MonitoringFeedAdmin campaignId={campaignId} />;
}
