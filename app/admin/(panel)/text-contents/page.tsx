import { TextContentsAdmin } from "@/components/admin/text-contents-admin";
import { getAdminData } from "@/lib/data-access/admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { getAdminBulkEditProps } from "@/lib/admin-bulk-edit-props";
import { canScoreContent } from "@/lib/auth/access";
import { getAuthSession } from "@/lib/auth/get-session";
import { requireContributorAccess } from "@/lib/auth/require-contributor-access";
import type { TextContent } from "@/lib/types";
import { redirect } from "next/navigation";

interface TextContentsPageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function TextContentsPage({ searchParams }: TextContentsPageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);

  if (!campaignId) redirect("/admin");
  await requireContributorAccess(campaignId, "textContents");

  const session = await getAuthSession();
  const canScore = Boolean(session && canScoreContent(session));
  const [data, bulkProps] = await Promise.all([
    getAdminData(campaignId, ["textContents"]),
    getAdminBulkEditProps(),
  ]);
  if (!data.settings) redirect("/admin");

  return (
    <TextContentsAdmin
      campaignId={campaignId}
      initialItems={(data.textContents ?? []) as TextContent[]}
      contentPlans={data.settings?.contentPlans ?? []}
      contentTopics={data.settings?.contentTopics ?? []}
      canScore={canScore}
      isFullAdmin={bulkProps.isFullAdmin}
      users={bulkProps.users}
    />
  );
}
