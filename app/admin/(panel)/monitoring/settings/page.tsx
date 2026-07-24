import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { MonitoringSettingsAdmin } from "@/components/admin/monitoring/monitoring-settings-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MonitoringSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");
  return <MonitoringSettingsAdmin campaignId={campaignId} />;
}
