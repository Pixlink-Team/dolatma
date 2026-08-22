import Link from "next/link";
import { Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardBentoGrid } from "@/components/admin/dashboard-bento-grid";
import { DashboardCompletenessCards } from "@/components/admin/dashboard-completeness-cards";
import { DashboardDirectivesPanel } from "@/components/admin/dashboard-directives-panel";
import { EditSuggestionsPanel } from "@/components/admin/edit-suggestions-panel";
import { getAdminData } from "@/lib/data-access/admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { DASHBOARD_STAT_DEFINITIONS } from "@/lib/admin-dashboard-stats";
import { resolveAdminBillboards } from "@/lib/billboards";
import type { Billboard, CampaignSettings } from "@/lib/types";
import { BulkContentImport } from "@/components/admin/bulk-content-import";
import { OnboardingProgressCard } from "@/components/admin/onboarding-progress-card";
import { canManageAllContent, canManageDirectives } from "@/lib/auth/access";
import { getSessionHomeDeviceId } from "@/lib/auth/device-access";
import { getAuthSession, getOwnerFilter, isFullAdmin } from "@/lib/auth/get-session";
import { getAllUsers } from "@/lib/data-access/admin";
import { buildUserLeaderboard } from "@/lib/city-leaderboard";
import { findUserLeaderboardEntry } from "@/lib/company-supervision";
import {
  hasContributorPermission,
  type ContributorPermissionKey,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import {
  CONTENT_MESSAGE_TYPE_LABELS,
} from "@/lib/content-messages/types";
import type { ReviewableContentType } from "@/lib/content-review/types";
import {
  pgCountUnreadContentMessages,
  pgListReceivedContentMessages,
} from "@/lib/db/content-messages-repository";
import { pgListContentReviews, pgCountContentReviews } from "@/lib/db/content-review-repository";
import { pgListBestPractices } from "@/lib/db/repository-best-practices";
import { pgListDirectivesForUserInbox } from "@/lib/db/repository-directives";
import { pgGetUserPermissionsForCampaign } from "@/lib/db/repository-extended";
import {
  buildCategoryCompleteness,
  buildEditSuggestions,
  type CategoryCompletenessSummary,
  type EditSuggestionContentType,
} from "@/lib/edit-suggestions";
import { evaluateDeviceOnboarding } from "@/lib/onboarding/progress";
import type { OnboardingProgress } from "@/lib/onboarding/types";
import { buildLeaderboardSourceFromAdmin } from "@/lib/performance-overview";
import { withFileAccessTokensDeep } from "@/lib/uploads";
import { isOrgUserRole } from "@/lib/user-roles";
import { formatPersianNumber, adminHref, isPostgresConfigured } from "@/lib/utils";

const REVIEW_TYPE_LABELS: Record<ReviewableContentType, string> = {
  billboard: "تبلیغات محیطی",
  poster: "پوستر و عکس",
  video: "ویدیو",
  activity: "اقدام",
  social_post: "شبکه اجتماعی",
  site_publication: "انتشار سایت",
};

function resolveContentTitle(
  contentType: string,
  contentId: string,
  data: Awaited<ReturnType<typeof getAdminData>>
): string {
  const matchTitle = (rows: Array<{ id: string; title?: string }> | undefined) =>
    rows?.find((row) => row.id === contentId)?.title?.trim() || null;

  switch (contentType) {
    case "billboard":
      return matchTitle(data.billboards) ?? "تبلیغات محیطی";
    case "poster":
      return matchTitle(data.posters) ?? "پوستر";
    case "video":
      return matchTitle(data.videos) ?? "ویدیو";
    case "activity":
      return matchTitle(data.activities) ?? "اقدام";
    case "social_post":
    case "site_publication":
      return matchTitle(data.socialPosts) ?? "محتوا";
    default:
      return "محتوا";
  }
}

const PERMISSION_TO_CONTENT_TYPE: Partial<
  Record<ContributorPermissionKey, EditSuggestionContentType>
> = {
  billboards: "billboard",
  posters: "poster",
  videos: "video",
  files: "file",
  rawMedia: "rawMedia",
  sitePublications: "sitePublication",
  socialPosts: "socialPost",
  broadcast: "broadcast",
  meetings: "meeting",
  activities: "activity",
};

interface AdminDashboardProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardProps) {
  const params = await searchParams;
  const session = await getAuthSession();
  const canManageAll = Boolean(session && canManageAllContent(session));
  const { campaignId } = await resolveAdminCampaignId(params.campaign);

  if (!campaignId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">داشبورد</h1>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            راستایی برای حساب شما تعریف نشده است. با مدیر تماس بگیرید.
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = await getAdminData(campaignId);
  if (!data.settings) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">داشبورد</h1>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            راستا انتخاب‌شده در دسترس نیست. با مدیر تماس بگیرید.
          </CardContent>
        </Card>
      </div>
    );
  }
  const ownerUserId = session ? await getOwnerFilter(session) : undefined;

  const features = data.settings.features;
  let contributorPermissions: ContributorPermissions | null = null;
  if (!canManageAll && session?.userId) {
    // No membership row ⇒ deny all section cards (do not fall back to all-true defaults).
    contributorPermissions = await pgGetUserPermissionsForCampaign(
      session.userId,
      campaignId
    );
  }

  const billboards = data.settings
    ? await resolveAdminBillboards(
        data.settings as CampaignSettings,
        (data.billboards ?? []) as Billboard[],
        ownerUserId
      )
    : [];

  const completenessByType = new Map<EditSuggestionContentType, CategoryCompletenessSummary>();
  const completenessInput = {
    campaignId,
    ownerUserId: canManageAll ? undefined : session?.userId,
    posters: data.posters,
    posterVersions: data.posterVersions,
    videos: data.videos,
    videoVersions: data.videoVersions,
    socialPosts: data.socialPosts ?? [],
    billboards,
    files: data.files ?? [],
    rawMedia: data.rawMedia ?? [],
    broadcastReports: data.broadcastReports ?? [],
    meetings: data.meetings ?? [],
    activities: data.activities ?? [],
  };
  for (const summary of buildCategoryCompleteness(completenessInput)) {
    completenessByType.set(summary.contentType, summary);
  }

  const editSuggestions = session?.userId
    ? buildEditSuggestions({
        ...completenessInput,
        ownerUserId: session.userId,
      })
    : [];

  const bestPractices = isPostgresConfigured()
    ? await pgListBestPractices(campaignId, "approved")
    : [];
  const bestPracticesCount = bestPractices.length;
  const dashboardData = { ...data, bestPracticesCount };

  const stats = DASHBOARD_STAT_DEFINITIONS.filter((definition) =>
    canManageAll
      ? definition.featureKey
        ? features[definition.featureKey]
        : true
      : hasContributorPermission(contributorPermissions, definition.permissionKey)
  ).map((definition) => {
    const contentType = PERMISSION_TO_CONTENT_TYPE[definition.permissionKey];
    return {
      label: definition.label,
      value: definition.getCount(dashboardData, billboards),
      href: adminHref(definition.href, campaignId),
      icon: definition.icon,
      priority: definition.priority,
      group: definition.group,
      completeness: contentType ? completenessByType.get(contentType) : undefined,
      showOwnerHint: !canManageAll,
    };
  });

  const pendingSubmissions = data.submissions.filter((s) => s.status === "pending").length;
  const showSubmissionsAlert = canManageAll
    ? features.submissions
    : hasContributorPermission(contributorPermissions, "submissions");
  const editSuggestionsStorageKey = session?.userId
    ? `edit-suggestions:${campaignId}:${session.userId}`
    : `edit-suggestions:${campaignId}`;

  const canManageDirectivesForUser = Boolean(
    session && canManageDirectives(session, contributorPermissions)
  );
  const inboxDirectives =
    session?.userId && isPostgresConfigured()
      ? withFileAccessTokensDeep(
          await pgListDirectivesForUserInbox(campaignId, session.userId)
        )
      : [];
  const bulkImportUsers = session && isFullAdmin(session) ? await getAllUsers() : [];

  const scoreEntry =
    session?.userId
      ? findUserLeaderboardEntry(
          buildUserLeaderboard(
            buildLeaderboardSourceFromAdmin({
              billboards,
              posters: data.posters,
              posterVersions: data.posterVersions,
              videos: data.videos,
              videoVersions: data.videoVersions,
              socialPosts: data.socialPosts,
              activities: data.activities,
              files: data.files,
            })
          ),
          session.userId
        )
      : null;

  const [returnedReviews, returnedContentCount] = isPostgresConfigured()
    ? await Promise.all([
        pgListContentReviews({
          campaignId,
          statuses: ["needs_revision", "resubmitted"],
          ownerUserId,
          limit: 5,
        }),
        pgCountContentReviews({
          campaignId,
          statuses: ["needs_revision", "resubmitted"],
          ownerUserId,
        }),
      ])
    : [[], 0];

  const [receivedMessages, unreadMessageCount] =
    session?.userId && isPostgresConfigured()
      ? await Promise.all([
          pgListReceivedContentMessages({
            recipientUserId: session.userId,
            limit: 40,
          }),
          pgCountUnreadContentMessages(session.userId),
        ])
      : [[], 0];

  const campaignMessages = receivedMessages.filter(
    (message) => message.campaignId === campaignId
  );

  let onboardingProgress: OnboardingProgress | null = null;
  if (
    session &&
    isOrgUserRole(session.role) &&
    !canManageAll &&
    isPostgresConfigured()
  ) {
    const homeDeviceId = await getSessionHomeDeviceId(session);
    if (homeDeviceId) {
      const ownerIds =
        typeof ownerUserId === "string"
          ? [ownerUserId]
          : Array.isArray(ownerUserId)
            ? ownerUserId
            : session.userId
              ? [session.userId]
              : undefined;
      onboardingProgress = await evaluateDeviceOnboarding({
        deviceId: homeDeviceId,
        campaignId,
        features,
        permissions: contributorPermissions,
        ownerUserIds: ownerIds,
        issuerUserId: session.userId,
      });
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">داشبورد</h1>
          <p className="text-muted-foreground text-sm">
            {canManageAll ? data.settings.title : `${data.settings.title} — آمار آپلودهای شما`}
          </p>
        </div>
        {session && isFullAdmin(session) && (
          <Link href={adminHref("/admin/settings", campaignId)}>
            <Badge variant="outline" className="gap-1 cursor-pointer">
              <Settings className="h-3 w-3" />
              تنظیمات
            </Badge>
          </Link>
        )}
      </div>

      {onboardingProgress &&
      onboardingProgress.totalCount > 0 &&
      onboardingProgress.percent < 100 ? (
        <OnboardingProgressCard progress={onboardingProgress}>
          <EditSuggestionsPanel
            suggestions={editSuggestions}
            storageKey={editSuggestionsStorageKey}
            embedded
          />
        </OnboardingProgressCard>
      ) : onboardingProgress == null || onboardingProgress.totalCount === 0 ? (
        <EditSuggestionsPanel
          suggestions={editSuggestions}
          storageKey={editSuggestionsStorageKey}
        />
      ) : null}

      <DashboardBentoGrid
        campaignId={campaignId}
        directivesSlot={
          <DashboardDirectivesPanel
            campaignId={campaignId}
            canManage={canManageDirectivesForUser}
            inboxDirectives={inboxDirectives}
            alwaysVisible
            className="h-full"
          />
        }
        bestPractices={{
          count: bestPracticesCount,
          items: bestPractices.slice(0, 3).map((item) => ({
            id: item.id,
            title: item.title || "اقدام برتر",
            meta: item.suggestedScore != null
              ? `امتیاز پیشنهادی: ${formatPersianNumber(item.suggestedScore)}`
              : null,
          })),
        }}
        scores={
          scoreEntry
            ? {
                activityScore: scoreEntry.score,
                ratingScore: scoreEntry.ratingScore,
                totalUploads: scoreEntry.totalUploads,
                rank: scoreEntry.rank > 0 ? scoreEntry.rank : null,
              }
            : {
                activityScore: 0,
                ratingScore: 0,
                totalUploads: 0,
                rank: null,
              }
        }
        returnedContent={{
          count: returnedContentCount,
          items: returnedReviews.slice(0, 3).map((review) => ({
            id: review.id,
            title: resolveContentTitle(review.contentType, review.contentId, data),
            meta:
              review.rejectionReason?.trim() ||
              REVIEW_TYPE_LABELS[review.contentType] ||
              null,
          })),
        }}
        messages={{
          unreadCount: unreadMessageCount,
          totalCount: campaignMessages.length,
          items: campaignMessages.slice(0, 3).map((message) => ({
            id: message.id,
            title: message.contentTitle || "پیام",
            meta:
              message.body.trim() ||
              CONTENT_MESSAGE_TYPE_LABELS[message.contentType] ||
              null,
          })),
        }}
      />

      <div className="min-w-0 space-y-3">
        {stats.length > 0 ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold sm:text-lg">وضعیت بخش‌ها</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  گروه‌بندی مثل منو (تولید / نشر و انتشار)؛ ناقص‌ها در هر گروه بالاتر دیده می‌شوند.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-700">
                  کامل
                </span>
                <span className="rounded-full bg-amber-400/20 px-2 py-1 text-amber-800">
                  ناقص جزئی
                </span>
                <span className="rounded-full bg-red-500/15 px-2 py-1 text-red-700">
                  ناقص
                </span>
              </div>
            </div>
            <DashboardCompletenessCards cards={stats} />
          </>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {canManageAll
                ? "هیچ بخشی برای این راستا فعال نیست. از تنظیمات راستا بخش‌های مورد نظر را فعال کنید."
                : "هیچ بخشی برای شما در این راستا فعال نیست. با مدیر تماس بگیرید."}
            </CardContent>
          </Card>
        )}
      </div>

      {showSubmissionsAlert && pendingSubmissions > 0 ? (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm">
              {formatPersianNumber(pendingSubmissions)} ارسال در انتظار بررسی
            </p>
            <Link href={adminHref("/admin/submissions", campaignId)}>
              <Badge variant="warning" className="cursor-pointer">
                مشاهده
              </Badge>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {session && isFullAdmin(session) ? (
        <BulkContentImport
          users={bulkImportUsers}
          posterCategories={data.posterCategories ?? []}
          videoCategories={data.videoCategories ?? []}
        />
      ) : null}
    </div>
  );
}
