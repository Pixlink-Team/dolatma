import type { AuthSession } from "@/lib/types";
import { canManageAllContent, canScoreContent, canSendContentMessages } from "@/lib/auth/access";
import { listContentReviewsAction } from "@/lib/actions/content-review-actions";
import { buildUserLeaderboard, buildUserLeaderboardByMode } from "@/lib/city-leaderboard";
import {
  collectCompanySupervisionItems,
  filterLeaderboardSourceByUser,
  findUserLeaderboardEntry,
  toCompanyExcelSource,
  zeroPeriodLeaderboardEntry,
  type CompanySupervisionContentType,
} from "@/lib/company-supervision";
import { contentPlansFromTopics } from "@/lib/content-topics";
import { getAdminData } from "@/lib/data-access/admin";
import { pgGetUserById } from "@/lib/db/repository-extended";
import { buildLeaderboardSourceFromAdmin } from "@/lib/performance-overview";
import {
  filterLeaderboardSourceForPerformance,
  getPerformancePeriodLabel,
  isPerformanceLeaderboardFilterActive,
  parsePerformanceSortMode,
  performanceFilterFromQuery,
  type PerformanceContentCategory,
  type PerformanceLeaderboardFilter,
} from "@/lib/performance-filters";
import type { UserLeaderboardEntry } from "@/lib/city-leaderboard";
import { isPostgresConfigured } from "@/lib/utils";

export type CompanySupervisionViewMode = "admin" | "self";

export type CompanySupervisionPageQuery = {
  date?: string;
  from?: string;
  to?: string;
  category?: string;
  province?: string;
  city?: string;
  companyType?: string;
  region?: string;
  topics?: string;
  sort?: string;
};

function contentTypeFromCategory(
  category: PerformanceContentCategory
): CompanySupervisionContentType | "all" {
  if (category === "all") return "all";
  return category;
}

function emptyIdentityFromProfile(input: {
  userKey: string;
  userName: string;
  province?: string | null;
  city?: string | null;
  ministry?: string | null;
  companyType?: UserLeaderboardEntry["companyType"];
  region?: UserLeaderboardEntry["region"];
}): UserLeaderboardEntry {
  return zeroPeriodLeaderboardEntry({
    rank: 0,
    userKey: input.userKey,
    userName: input.userName,
    province: input.province?.trim() || "نامشخص",
    city: input.city?.trim() || "نامشخص",
    ministry: input.ministry?.trim() || "بدون وزارتخانه",
    companyType: input.companyType ?? null,
    region: input.region ?? null,
    billboards: 0,
    posters: 0,
    videos: 0,
    socialPosts: 0,
    sitePublications: 0,
    activities: 0,
    files: 0,
    todayUploads: 0,
    totalUploads: 0,
    score: 0,
    ratingScore: 0,
    pendingScore: 0,
    billboardScore: 0,
    posterScore: 0,
    videoScore: 0,
    socialScore: 0,
    pendingBillboardScore: 0,
    pendingPosterScore: 0,
    pendingVideoScore: 0,
    pendingSocialScore: 0,
    totalAreaSqm: 0,
  });
}

async function resolveFallbackIdentity(
  userKey: string,
  session: AuthSession
): Promise<UserLeaderboardEntry | null> {
  if (isPostgresConfigured()) {
    const user = await pgGetUserById(userKey);
    if (user) {
      return emptyIdentityFromProfile({
        userKey: user.id,
        userName: user.name,
        province: user.province,
        city: user.city,
        ministry: user.ministryName || user.organizationName || user.deviceName,
        companyType: user.companyType ?? null,
        region: user.region ?? null,
      });
    }
  }

  if (session.userId === userKey) {
    return emptyIdentityFromProfile({
      userKey,
      userName: session.name?.trim() || session.email?.trim() || "کاربر",
    });
  }

  return null;
}

export async function loadCompanySupervisionPage(input: {
  campaignId: string;
  userKey: string;
  session: AuthSession;
  query: CompanySupervisionPageQuery;
  viewMode: CompanySupervisionViewMode;
}) {
  const { campaignId, userKey, session, query, viewMode } = input;

  const [data, reviewsResult] = await Promise.all([
    getAdminData(campaignId, [
      "settings",
      "billboards",
      "posters",
      "posterVersions",
      "videos",
      "videoVersions",
      "files",
      "socialPosts",
      "activities",
    ]),
    listContentReviewsAction({ campaignId }),
  ]);

  if (!data.settings) {
    return { ok: false as const, reason: "no_campaign" as const };
  }

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

  const rankingFilter: PerformanceLeaderboardFilter = performanceFilterFromQuery(query);
  const sortMode = parsePerformanceSortMode(query.sort);
  const periodSource = filterLeaderboardSourceForPerformance(source, rankingFilter);
  const periodEntries = buildUserLeaderboardByMode(periodSource, sortMode);
  const allEntries = buildUserLeaderboard(source);
  const periodEntry = findUserLeaderboardEntry(periodEntries, userKey);
  const identity = findUserLeaderboardEntry(allEntries, userKey);
  const filterActive = isPerformanceLeaderboardFilterActive(rankingFilter);
  let entry = filterActive
    ? periodEntry
      ? {
          ...periodEntry,
          userName: identity?.userName ?? periodEntry.userName,
          province: identity?.province || periodEntry.province,
          city: identity?.city || periodEntry.city,
          companyType: identity?.companyType ?? periodEntry.companyType,
          region: identity?.region ?? periodEntry.region,
        }
      : identity
        ? zeroPeriodLeaderboardEntry(identity)
        : null
    : (identity ?? periodEntry);

  if (!entry) {
    entry = await resolveFallbackIdentity(userKey, session);
  }

  if (!entry) {
    return { ok: false as const, reason: "not_found" as const, campaignId };
  }

  const items = collectCompanySupervisionItems({
    campaignId,
    userKey,
    source,
    reviews: reviewsResult.success ? reviewsResult.reviews ?? [] : [],
  });
  const userSource = filterLeaderboardSourceByUser(source, userKey);
  const contentPlans =
    data.settings.contentTopics && data.settings.contentTopics.length > 0
      ? contentPlansFromTopics(data.settings.contentTopics)
      : data.settings.contentPlans ?? [];

  const canScore = viewMode === "self" ? false : canScoreContent(session);
  const canManageReviews = viewMode === "self" ? false : canManageAllContent(session);
  const canSendMessage = viewMode === "self" ? false : canSendContentMessages(session);

  return {
    ok: true as const,
    props: {
      campaignId,
      campaignTitle: data.settings.title,
      campaignSlug: data.settings.slug,
      entry,
      items,
      excelSource: toCompanyExcelSource(userSource),
      contentPlans,
      contentTopics: data.settings.contentTopics ?? [],
      canScore,
      canManageReviews,
      canSendMessage,
      viewMode,
      periodLabel: getPerformancePeriodLabel(rankingFilter),
      initialContentType: contentTypeFromCategory(rankingFilter.contentCategory),
      initialFilter: {
        datePreset: rankingFilter.datePreset,
        dateFrom: rankingFilter.dateFrom,
        dateTo: rankingFilter.dateTo,
        province: rankingFilter.province,
        city: rankingFilter.city,
        planLabels: rankingFilter.planLabels,
        companyType: rankingFilter.companyType,
      },
    },
  };
}
