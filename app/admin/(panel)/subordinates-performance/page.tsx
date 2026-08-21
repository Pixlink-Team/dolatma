import { redirect } from "next/navigation";
import { PerformanceAdmin } from "@/components/admin/performance-admin";
import { Card, CardContent } from "@/components/ui/card";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import {
  canViewSubtreePerformance,
  isBroadPanelUser,
} from "@/lib/auth/access";
import {
  getAuthSession,
  getSubordinatesOwnerFilter,
  isFullAdmin,
} from "@/lib/auth/get-session";
import { contentPlansFromTopics } from "@/lib/content-topics";
import { getAdminData } from "@/lib/data-access/admin";
import { buildLeaderboardSourceFromAdmin } from "@/lib/performance-overview";
import { isOrgUserRole } from "@/lib/user-roles";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function SubordinatesPerformancePage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session || !canViewSubtreePerformance(session)) {
    redirect("/admin");
  }

  // Admin / client / reis already have the full performance page.
  if (isFullAdmin(session) || isBroadPanelUser(session)) {
    const params = await searchParams;
    const q = params.campaign ? `?campaign=${encodeURIComponent(params.campaign)}` : "";
    redirect(`/admin/performance${q}`);
  }

  if (!isOrgUserRole(session.role)) {
    redirect("/admin");
  }

  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");

  const ownerScope = await getSubordinatesOwnerFilter(session);
  if (ownerScope === null || (Array.isArray(ownerScope) && ownerScope.length === 0)) {
    return (
      <Card dir="rtl">
        <CardContent className="space-y-2 p-8 text-right">
          <h1 className="text-xl font-bold">مشاهده عملکرد زیردستان</h1>
          <p className="text-sm text-muted-foreground">
            هنوز کاربری در زیرمجموعه شما ثبت نشده است. پس از افزودن زیردستان، آمار آن‌ها اینجا نمایش
            داده می‌شود.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = await getAdminData(
    campaignId,
    [
      "settings",
      "billboards",
      "posters",
      "posterVersions",
      "videos",
      "videoVersions",
      "files",
      "socialPosts",
      "activities",
    ],
    ownerScope
  );
  if (!data.settings) redirect("/admin");

  const source = buildLeaderboardSourceFromAdmin({
    billboards: data.billboards,
    posters: data.posters,
    posterVersions: data.posterVersions,
    videos: data.videos,
    videoVersions: data.videoVersions,
    socialPosts: data.socialPosts,
    activities: data.activities,
    files: data.files,
  });

  const contentPlans =
    data.settings.contentTopics && data.settings.contentTopics.length > 0
      ? contentPlansFromTopics(data.settings.contentTopics)
      : data.settings.contentPlans ?? [];

  return (
    <PerformanceAdmin
      source={source}
      campaignId={campaignId}
      campaignTitle={data.settings.title}
      campaignSlug={data.settings.slug}
      contentPlans={contentPlans}
      pageTitle="مشاهده عملکرد زیردستان"
      pageDescription={`نمای آماری کاربران زیرمجموعه شما در کمپین «${data.settings.title}» — فقط زیردستان نمایش داده می‌شوند`}
    />
  );
}
