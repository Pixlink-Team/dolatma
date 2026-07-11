import { redirect } from "next/navigation";
import { getAdminData } from "@/lib/data-access/admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { requireContributorAccess } from "@/lib/auth/require-contributor-access";
import { canScoreContent } from "@/lib/auth/access";
import { getAuthSession } from "@/lib/auth/get-session";
import { ActivitiesAdmin } from "@/components/admin/activities-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ActivitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin/campaigns");
  await requireContributorAccess(campaignId, "activities");
  const session = await getAuthSession();
  const canScore = Boolean(session && canScoreContent(session));
  const data = await getAdminData(campaignId);
  return (
    <ActivitiesAdmin
      campaignId={campaignId}
      initialActivities={data.activities ?? []}
      contentPlans={data.settings?.contentPlans ?? []}
      contentTopics={data.settings?.contentTopics ?? []}
      canScore={canScore}
    />
  );
}
