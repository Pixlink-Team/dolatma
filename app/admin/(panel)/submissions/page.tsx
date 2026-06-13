import { redirect } from "next/navigation";
import { getAdminData } from "@/lib/data-access/admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { SubmissionsAdmin } from "@/components/admin/submissions-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function SubmissionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin/campaigns");
  const data = await getAdminData(campaignId);
  return <SubmissionsAdmin initialSubmissions={data.submissions} />;
}
