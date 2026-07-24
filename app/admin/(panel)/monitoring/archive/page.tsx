import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { MonitoringArchiveAdmin } from "@/components/admin/monitoring/monitoring-archive-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MonitoringArchivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");
  return <MonitoringArchiveAdmin campaignId={campaignId} />;
}
