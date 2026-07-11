import { FilesAdmin } from "@/components/admin/files-admin";
import { getAdminData } from "@/lib/data-access/admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { canScoreContent } from "@/lib/auth/access";
import { getAuthSession } from "@/lib/auth/get-session";
import type { CampaignFile } from "@/lib/types";
import { redirect } from "next/navigation";

interface FilesPageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);

  if (!campaignId) redirect("/admin/campaigns");

  const session = await getAuthSession();
  const canScore = Boolean(session && canScoreContent(session));
  const data = await getAdminData(campaignId);
  if (!data.settings) redirect("/admin/campaigns");

  return (
    <FilesAdmin
      campaignId={campaignId}
      initialFiles={(data.files ?? []) as CampaignFile[]}
      contentPlans={data.settings?.contentPlans ?? []}
      contentTopics={data.settings?.contentTopics ?? []}
      canScore={canScore}
    />
  );
}
