import Link from "next/link";
import { Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { canManageDirectives } from "@/lib/auth/access";
import { getSessionHomeDeviceId } from "@/lib/auth/device-access";
import { getAuthSession, getOwnerFilter, isFullAdmin } from "@/lib/auth/get-session";
import { getAllUsers } from "@/lib/data-access/admin";
import {
  hasContributorPermission,
  type ContributorPermissionKey,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
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
import { withFileAccessTokensDeep } from "@/lib/uploads";
import { isOrgUserRole } from "@/lib/user-roles";
import { formatPersianNumber, adminHref, isPostgresConfigured } from "@/lib/utils";

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
  const canManageAll = Boolean(session && isFullAdmin(session));
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

  const stats = DASHBOARD_STAT_DEFINITIONS.filter((definition) =>
    canManageAll
      ? features[definition.featureKey]
      : hasContributorPermission(contributorPermissions, definition.permissionKey)
  ).map((definition) => {
    const contentType = PERMISSION_TO_CONTENT_TYPE[definition.permissionKey];
    return {
      label: definition.label,
      value: definition.getCount(data, billboards),
      href: adminHref(definition.href, campaignId),
      icon: definition.icon,
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
  const bulkImportUsers = canManageAll ? await getAllUsers() : [];

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
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">داشبورد</h1>
          <p className="text-muted-foreground text-sm">
            {canManageAll ? data.settings.title : `${data.settings.title} — آمار آپلودهای شما`}
          </p>
        </div>
        {canManageAll && (
          <Link href={adminHref("/admin/settings", campaignId)}>
            <Badge variant="outline" className="gap-1 cursor-pointer">
              <Settings className="h-3 w-3" />
              تنظیمات
            </Badge>
          </Link>
        )}
      </div>

      {onboardingProgress && onboardingProgress.totalCount > 0 ? (
        <OnboardingProgressCard progress={onboardingProgress} />
      ) : null}

      {canManageAll ? (
        <BulkContentImport
          users={bulkImportUsers}
          posterCategories={data.posterCategories ?? []}
          videoCategories={data.videoCategories ?? []}
        />
      ) : null}

      <DashboardDirectivesPanel
        campaignId={campaignId}
        canManage={canManageDirectivesForUser}
        inboxDirectives={inboxDirectives}
      />

      <EditSuggestionsPanel
        suggestions={editSuggestions}
        storageKey={editSuggestionsStorageKey}
      />

      {stats.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-700">کامل = سبز</span>
            <span className="rounded-full bg-amber-400/20 px-2 py-1 text-amber-800">ناقص جزئی = زرد</span>
            <span className="rounded-full bg-red-500/15 px-2 py-1 text-red-700">ناقص کامل = قرمز</span>
          </div>
          <DashboardCompletenessCards cards={stats} />
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {canManageAll
              ? "هیچ بخشی برای این راستا فعال نیست. از تنظیمات راستا بخش‌های مورد نظر را فعال کنید."
              : "هیچ بخشی برای شما در این راستا فعال نیست. با مدیر تماس بگیرید."}
          </CardContent>
        </Card>
      )}

      {showSubmissionsAlert && pendingSubmissions > 0 && (
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
      )}
    </div>
  );
}
