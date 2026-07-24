import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { RapidResponseCasesAdmin } from "@/components/admin/monitoring/rapid-response-cases-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function RapidResponseCasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");
  return <RapidResponseCasesAdmin campaignId={campaignId} />;
}
