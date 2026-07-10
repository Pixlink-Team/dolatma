import { redirect } from "next/navigation";
import { getAdminData } from "@/lib/data-access/admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { PostersAdmin } from "@/components/admin/posters-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function PostersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin/campaigns");
  const data = await getAdminData(campaignId);
  return (
    <PostersAdmin
      campaignId={campaignId}
      initialCategories={data.posterCategories}
      initialPosters={data.posters}
      initialVersions={data.posterVersions}
      contentPlans={data.settings?.contentPlans ?? []}
    />
  );
}
