import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { RapidResponseCaseDetailAdmin } from "@/components/admin/monitoring/rapid-response-case-detail-admin";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaign?: string }>;
}

export default async function RapidResponseCaseDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(query.campaign);
  if (!campaignId) redirect("/admin");
  return <RapidResponseCaseDetailAdmin campaignId={campaignId} caseId={id} />;
}
