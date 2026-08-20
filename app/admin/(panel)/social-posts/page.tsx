import { redirect } from "next/navigation";
import { getAdminData } from "@/lib/data-access/admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { getAdminBulkEditProps } from "@/lib/admin-bulk-edit-props";
import { requireContributorAccess } from "@/lib/auth/require-contributor-access";
import { canScoreContent } from "@/lib/auth/access";
import { getAuthSession } from "@/lib/auth/get-session";
import { SocialPostsAdmin } from "@/components/admin/social-posts-admin";
import { parseAdminListQuery } from "@/lib/admin-list-query";
import type { AdminContentSort } from "@/components/admin/admin-content-filter-bar";

interface PageProps {
  searchParams: Promise<{ campaign?: string; sortBy?: string; sortOrder?: string; q?: string }>;
}

function resolveInitialSort(sortBy?: string, sortOrder?: string): AdminContentSort {
  if (sortBy === "title") return "title";
  if (sortOrder === "asc") return "oldest";
  if (sortBy === "default") return "default";
  return "newest";
}

export default async function SocialPostsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");
  await requireContributorAccess(campaignId, "socialPosts");
  const session = await getAuthSession();
  const canScore = Boolean(session && canScoreContent(session));
  const listQuery = parseAdminListQuery(params, { sortBy: "updatedAt", sortOrder: "desc" });
  const [data, bulkProps] = await Promise.all([
    getAdminData(campaignId, ["socialPosts"]),
    getAdminBulkEditProps(),
  ]);
  return (
    <SocialPostsAdmin
      campaignId={campaignId}
      initialPosts={data.socialPosts ?? []}
      contentPlans={data.settings?.contentPlans ?? []}
      contentTopics={data.settings?.contentTopics ?? []}
      canScore={canScore}
      isFullAdmin={bulkProps.isFullAdmin}
      users={bulkProps.users}
      initialSortOrder={resolveInitialSort(listQuery.sortBy, listQuery.sortOrder)}
    />
  );
}
