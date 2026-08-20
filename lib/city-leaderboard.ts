import { normalizeImportedProvince } from "@/lib/iran-locations";
import { countsAsTodayBillboardUpload } from "@/lib/billboards";
import {
  getSafeCreatedTimestamp,
  getTehranCalendarDateIso,
  isSameDay,
} from "@/lib/safe-dates";
import type { Billboard, Ownable, PublicCampaignData } from "@/lib/types";
import type { UserCompanyType } from "@/lib/user-company-types";
import type { UserRegion } from "@/lib/user-regions";

/**
 * Minimal shape the leaderboard builders actually read. `PublicCampaignData`
 * satisfies this structurally, but admin-only views (e.g. the performance
 * page) can build a lean object without settings/kpis/etc.
 */
export type LeaderboardSourceData = Pick<
  PublicCampaignData,
  | "sections"
  | "billboards"
  | "posters"
  | "videos"
  | "socialPosts"
  | "sitePublications"
  | "activities"
  | "pressPublications"
  | "files"
>;

export interface ProvinceLeaderboardMetrics {
  billboards: number;
  posters: number;
  videos: number;
  socialPosts: number;
  sitePublications: number;
  activities: number;
  files: number;
  todayUploads: number;
  totalUploads: number;
  score: number;
  /** Sum of Ownable.score values across content items. */
  ratingScore: number;
  pendingScore: number;
  billboardScore: number;
  posterScore: number;
  videoScore: number;
  socialScore: number;
  pendingBillboardScore: number;
  pendingPosterScore: number;
  pendingVideoScore: number;
  pendingSocialScore: number;
  /** Sum of billboard areaSqm values. */
  totalAreaSqm: number;
}

export interface ProvinceLeaderboardEntry extends ProvinceLeaderboardMetrics {
  rank: number;
  province: string;
  provinceKey: string;
}

export interface MinistryLeaderboardEntry extends ProvinceLeaderboardMetrics {
  rank: number;
  ministry: string;
  ministryKey: string;
}

export interface OrganizationLeaderboardEntry extends ProvinceLeaderboardMetrics {
  rank: number;
  organization: string;
  organizationKey: string;
  ministry: string;
}

export interface ProvinceContributorEntry {
  rank: number;
  userName: string;
  province: string;
  provinceKey: string;
  totalUploads: number;
  score: number;
  ratingScore?: number;
}

export interface MinistryContributorEntry {
  rank: number;
  userName: string;
  ministry: string;
  ministryKey: string;
  totalUploads: number;
  score: number;
  ratingScore?: number;
}

export interface UserLeaderboardEntry extends ProvinceLeaderboardMetrics {
  rank: number;
  userName: string;
  userKey: string;
  province: string;
  city: string;
  ministry: string;
  companyType: UserCompanyType | null;
  region: UserRegion | null;
}

const SCORE_WEIGHTS = {
  billboards: 5,
  posters: 3,
  videos: 4,
  socialPosts: 2,
  sitePublications: 2,
  activities: 3,
  files: 1,
} as const;

type MetricField = keyof typeof SCORE_WEIGHTS;

function todayIso(): string {
  return getTehranCalendarDateIso();
}

function resolveProvince(item: Ownable & { province?: string | null }): string {
  const raw = item.ownerProvince?.trim() || item.province?.trim() || "";
  return (normalizeImportedProvince(raw) ?? raw) || "نامشخص";
}

function resolveMinistry(item: Ownable): { ministryKey: string; ministry: string } {
  const ministryId = item.ownerMinistryId?.trim();
  const ministryName = item.ownerMinistryName?.trim() || "بدون وزارتخانه";
  return {
    ministryKey: ministryId || `name:${ministryName}`,
    ministry: ministryName,
  };
}

function resolveOrganization(item: Ownable): {
  organizationKey: string;
  organization: string;
  ministry: string;
} {
  const { ministryKey, ministry } = resolveMinistry(item);
  const organizationId = item.ownerOrganizationId?.trim();
  const organizationName = item.ownerOrganizationName?.trim();

  if (!organizationId && !organizationName) {
    return {
      organizationKey: `ministry:${ministryKey}`,
      organization: ministry,
      ministry,
    };
  }

  return {
    organizationKey: organizationId || `${ministryKey}::${organizationName}`,
    organization: organizationName || "زیرمجموعه",
    ministry,
  };
}

function resolveUserKey(item: Ownable): { userKey: string; userName: string } {
  const userName = item.ownerName?.trim() || "کاربر";
  const userKey = item.ownerUserId ?? item.ownerEmail ?? userName;
  return { userKey, userName };
}

function resolvePrimaryLabel(counts: Map<string, number>, fallback = "نامشخص"): string {
  let label = fallback;
  let maxCount = 0;

  for (const [name, count] of counts) {
    if (count > maxCount) {
      label = name;
      maxCount = count;
    }
  }

  return label;
}

function resolvePrimaryProvince(counts: Map<string, number>): string {
  return resolvePrimaryLabel(counts, "نامشخص");
}

function emptyMetrics(): ProvinceLeaderboardMetrics {
  return {
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
  };
}

function countsAsTodayUpload<T extends Ownable & { createdAt?: string | null }>(
  item: T,
  field: MetricField
): boolean {
  if (field === "billboards" && "id" in item) {
    return countsAsTodayBillboardUpload(item as unknown as Billboard);
  }
  return isSameDay(getSafeCreatedTimestamp(item), todayIso());
}

function addItem<T extends Ownable & { createdAt?: string | null; province?: string | null }>(
  map: Map<string, ProvinceLeaderboardMetrics & { province: string }>,
  item: T,
  field: MetricField
) {
  const province = resolveProvince(item);
  const current = map.get(province) ?? {
    ...emptyMetrics(),
    province,
  };

  applyMetric(current, item, field);
  map.set(province, current);
}

function addMinistryItem<T extends Ownable & { createdAt?: string | null }>(
  map: Map<string, ProvinceLeaderboardMetrics & { ministry: string }>,
  item: T,
  field: MetricField
) {
  const { ministryKey, ministry } = resolveMinistry(item);
  const current = map.get(ministryKey) ?? {
    ...emptyMetrics(),
    ministry,
  };

  applyMetric(current, item, field);
  map.set(ministryKey, current);
}

function addOrganizationItem<T extends Ownable & { createdAt?: string | null }>(
  map: Map<
    string,
    ProvinceLeaderboardMetrics & { organization: string; ministry: string }
  >,
  item: T,
  field: MetricField
) {
  const { organizationKey, organization, ministry } = resolveOrganization(item);
  const current = map.get(organizationKey) ?? {
    ...emptyMetrics(),
    organization,
    ministry,
  };

  applyMetric(current, item, field);
  map.set(organizationKey, current);
}

function applyMetric<T extends Ownable & { createdAt?: string | null }>(
  current: ProvinceLeaderboardMetrics,
  item: T,
  field: MetricField
) {
  current[field]++;
  current.totalUploads++;
  current.score += SCORE_WEIGHTS[field];
  if (typeof item.score === "number" && Number.isFinite(item.score)) {
    current.ratingScore += item.score;
  }

  if (field === "billboards") {
    const area = Number((item as { areaSqm?: number | null }).areaSqm || 0);
    if (Number.isFinite(area) && area > 0) {
      current.totalAreaSqm += area;
    }
  }

  if (countsAsTodayUpload(item, field)) {
    current.todayUploads++;
  }
}

function addContributor<T extends Ownable & { createdAt?: string | null; province?: string | null }>(
  map: Map<string, ProvinceContributorEntry>,
  item: T,
  field: MetricField
) {
  const province = resolveProvince(item);
  const userName = item.ownerName?.trim() || "کاربر";
  const contributorKey = `${province}::${item.ownerUserId ?? item.ownerEmail ?? userName}`;

  const current = map.get(contributorKey) ?? {
    rank: 0,
    userName,
    province,
    provinceKey: province,
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
  };

  current.totalUploads++;
  current.score += SCORE_WEIGHTS[field];
  if (typeof item.score === "number" && Number.isFinite(item.score)) {
    current.ratingScore = (current.ratingScore ?? 0) + item.score;
  }
  map.set(contributorKey, current);
}

function addMinistryContributor<T extends Ownable & { createdAt?: string | null }>(
  map: Map<string, MinistryContributorEntry>,
  item: T,
  field: MetricField
) {
  const { ministryKey, ministry } = resolveMinistry(item);
  const userName = item.ownerName?.trim() || "کاربر";
  const contributorKey = `${ministryKey}::${item.ownerUserId ?? item.ownerEmail ?? userName}`;

  const current = map.get(contributorKey) ?? {
    rank: 0,
    userName,
    ministry,
    ministryKey,
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
  };

  current.totalUploads++;
  current.score += SCORE_WEIGHTS[field];
  if (typeof item.score === "number" && Number.isFinite(item.score)) {
    current.ratingScore = (current.ratingScore ?? 0) + item.score;
  }
  map.set(contributorKey, current);
}

type UserAccumulator = ProvinceLeaderboardMetrics & {
  userName: string;
  provinceCounts: Map<string, number>;
  ministryCounts: Map<string, number>;
};

function addUserItem<T extends Ownable & { createdAt?: string | null; province?: string | null }>(
  map: Map<string, UserAccumulator>,
  item: T,
  field: MetricField
) {
  const { userKey, userName } = resolveUserKey(item);
  const province = resolveProvince(item);
  const { ministry } = resolveMinistry(item);
  const current = map.get(userKey) ?? {
    ...emptyMetrics(),
    userName,
    provinceCounts: new Map<string, number>(),
    ministryCounts: new Map<string, number>(),
  };

  applyMetric(current, item, field);
  current.provinceCounts.set(province, (current.provinceCounts.get(province) ?? 0) + 1);
  current.ministryCounts.set(ministry, (current.ministryCounts.get(ministry) ?? 0) + 1);
  map.set(userKey, current);
}

function collectLeaderboardItems(
  data: LeaderboardSourceData,
  add: <T extends Ownable & { createdAt?: string | null; province?: string | null }>(
    items: T[],
    field: MetricField
  ) => void
) {
  if (data.sections.billboards) add(data.billboards, "billboards");
  if (data.sections.posters) add(data.posters, "posters");
  if (data.sections.videos) add(data.videos, "videos");
  if (data.sections.socialPosts) add(data.socialPosts, "socialPosts");
  if (data.sections.sitePublications) add(data.sitePublications, "sitePublications");
  if (data.sections.activities) {
    add(data.activities, "activities");
    add(data.pressPublications, "activities");
  }
  if (data.sections.files) add(data.files, "files");
}

export function buildProvinceLeaderboard(data: LeaderboardSourceData): ProvinceLeaderboardEntry[] {
  const map = new Map<string, ProvinceLeaderboardMetrics & { province: string }>();

  collectLeaderboardItems(data, (items, field) => {
    for (const item of items) addItem(map, item, field);
  });

  return [...map.entries()]
    .map(([provinceKey, metrics]) => ({
      provinceKey,
      province: metrics.province,
      billboards: metrics.billboards,
      posters: metrics.posters,
      videos: metrics.videos,
      socialPosts: metrics.socialPosts,
      sitePublications: metrics.sitePublications,
      activities: metrics.activities,
      files: metrics.files,
      todayUploads: metrics.todayUploads,
      totalUploads: metrics.totalUploads,
      score: metrics.score,
      ratingScore: metrics.ratingScore,
      pendingScore: metrics.pendingScore ?? 0,
      billboardScore: metrics.billboardScore ?? 0,
      posterScore: metrics.posterScore ?? 0,
      videoScore: metrics.videoScore ?? 0,
      socialScore: metrics.socialScore ?? 0,
      pendingBillboardScore: metrics.pendingBillboardScore ?? 0,
      pendingPosterScore: metrics.pendingPosterScore ?? 0,
      pendingVideoScore: metrics.pendingVideoScore ?? 0,
      pendingSocialScore: metrics.pendingSocialScore ?? 0,
      totalAreaSqm: metrics.totalAreaSqm,
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score || b.totalUploads - a.totalUploads)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function buildMinistryLeaderboard(data: LeaderboardSourceData): MinistryLeaderboardEntry[] {
  const map = new Map<string, ProvinceLeaderboardMetrics & { ministry: string }>();

  collectLeaderboardItems(data, (items, field) => {
    for (const item of items) addMinistryItem(map, item, field);
  });

  return [...map.entries()]
    .map(([ministryKey, metrics]) => ({
      ministryKey,
      ministry: metrics.ministry,
      billboards: metrics.billboards,
      posters: metrics.posters,
      videos: metrics.videos,
      socialPosts: metrics.socialPosts,
      sitePublications: metrics.sitePublications,
      activities: metrics.activities,
      files: metrics.files,
      todayUploads: metrics.todayUploads,
      totalUploads: metrics.totalUploads,
      score: metrics.score,
      ratingScore: metrics.ratingScore,
      pendingScore: metrics.pendingScore ?? 0,
      billboardScore: metrics.billboardScore ?? 0,
      posterScore: metrics.posterScore ?? 0,
      videoScore: metrics.videoScore ?? 0,
      socialScore: metrics.socialScore ?? 0,
      pendingBillboardScore: metrics.pendingBillboardScore ?? 0,
      pendingPosterScore: metrics.pendingPosterScore ?? 0,
      pendingVideoScore: metrics.pendingVideoScore ?? 0,
      pendingSocialScore: metrics.pendingSocialScore ?? 0,
      totalAreaSqm: metrics.totalAreaSqm,
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score || b.totalUploads - a.totalUploads)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function buildOrganizationLeaderboard(
  data: LeaderboardSourceData
): OrganizationLeaderboardEntry[] {
  const map = new Map<
    string,
    ProvinceLeaderboardMetrics & { organization: string; ministry: string }
  >();

  collectLeaderboardItems(data, (items, field) => {
    for (const item of items) addOrganizationItem(map, item, field);
  });

  return [...map.entries()]
    .map(([organizationKey, metrics]) => ({
      organizationKey,
      organization: metrics.organization,
      ministry: metrics.ministry,
      billboards: metrics.billboards,
      posters: metrics.posters,
      videos: metrics.videos,
      socialPosts: metrics.socialPosts,
      sitePublications: metrics.sitePublications,
      activities: metrics.activities,
      files: metrics.files,
      todayUploads: metrics.todayUploads,
      totalUploads: metrics.totalUploads,
      score: metrics.score,
      ratingScore: metrics.ratingScore,
      pendingScore: metrics.pendingScore ?? 0,
      billboardScore: metrics.billboardScore ?? 0,
      posterScore: metrics.posterScore ?? 0,
      videoScore: metrics.videoScore ?? 0,
      socialScore: metrics.socialScore ?? 0,
      pendingBillboardScore: metrics.pendingBillboardScore ?? 0,
      pendingPosterScore: metrics.pendingPosterScore ?? 0,
      pendingVideoScore: metrics.pendingVideoScore ?? 0,
      pendingSocialScore: metrics.pendingSocialScore ?? 0,
      totalAreaSqm: metrics.totalAreaSqm,
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score || b.totalUploads - a.totalUploads)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function buildUserLeaderboard(data: LeaderboardSourceData): UserLeaderboardEntry[] {
  const map = new Map<string, UserAccumulator>();

  collectLeaderboardItems(data, (items, field) => {
    for (const item of items) addUserItem(map, item, field);
  });

  return [...map.entries()]
    .map(([userKey, metrics]) => ({
      userKey,
      userName: metrics.userName,
      province: resolvePrimaryProvince(metrics.provinceCounts),
      city: "",
      ministry: resolvePrimaryLabel(metrics.ministryCounts, "بدون وزارتخانه"),
      companyType: null,
      region: null,
      billboards: metrics.billboards,
      posters: metrics.posters,
      videos: metrics.videos,
      socialPosts: metrics.socialPosts,
      sitePublications: metrics.sitePublications,
      activities: metrics.activities,
      files: metrics.files,
      todayUploads: metrics.todayUploads,
      totalUploads: metrics.totalUploads,
      score: metrics.score,
      ratingScore: metrics.ratingScore,
      pendingScore: metrics.pendingScore ?? 0,
      billboardScore: metrics.billboardScore ?? 0,
      posterScore: metrics.posterScore ?? 0,
      videoScore: metrics.videoScore ?? 0,
      socialScore: metrics.socialScore ?? 0,
      pendingBillboardScore: metrics.pendingBillboardScore ?? 0,
      pendingPosterScore: metrics.pendingPosterScore ?? 0,
      pendingVideoScore: metrics.pendingVideoScore ?? 0,
      pendingSocialScore: metrics.pendingSocialScore ?? 0,
      totalAreaSqm: metrics.totalAreaSqm,
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score || b.totalUploads - a.totalUploads)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function buildUserRatingLeaderboard(data: LeaderboardSourceData): UserLeaderboardEntry[] {
  return buildUserLeaderboard(data)
    .slice()
    .sort((a, b) => b.ratingScore - a.ratingScore || b.totalUploads - a.totalUploads)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}


export type UserLeaderboardSortMode = "activity" | "rating" | "count";

/** Sort users by content count (totalUploads), then score. */
export function buildUserContentCountLeaderboard(
  data: LeaderboardSourceData
): UserLeaderboardEntry[] {
  return buildUserLeaderboard(data)
    .slice()
    .sort((a, b) => {
      if (b.totalUploads !== a.totalUploads) return b.totalUploads - a.totalUploads;
      if (b.score !== a.score) return b.score - a.score;
      return a.userName.localeCompare(b.userName, "fa");
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function buildUserLeaderboardByMode(
  data: LeaderboardSourceData,
  mode: UserLeaderboardSortMode
): UserLeaderboardEntry[] {
  if (mode === "rating") return buildUserRatingLeaderboard(data);
  if (mode === "count") return buildUserContentCountLeaderboard(data);
  return buildUserLeaderboard(data);
}

export interface UserContentScoreItem {
  id: string;
  title: string;
  typeLabel: string;
  contentType: string;
  thumbnailUrl?: string | null;
  score: number | null;
}

function resolveUserKeyMatch(item: Ownable, userKey: string): boolean {
  if (item.ownerUserId && item.ownerUserId === userKey) return true;
  if (item.ownerEmail && item.ownerEmail === userKey) return true;
  if ((item.ownerName?.trim() || "کاربر") === userKey) return true;
  return false;
}

export function collectUserContentItems(
  data: LeaderboardSourceData,
  userKey: string
): UserContentScoreItem[] {
  const items: UserContentScoreItem[] = [];

  const push = <T extends Ownable & { id: string; title: string }>(
    list: T[],
    typeLabel: string,
    contentType: string,
    getThumb?: (item: T) => string | null | undefined
  ) => {
    for (const item of list) {
      if (!resolveUserKeyMatch(item, userKey)) continue;
      items.push({
        id: item.id,
        title: item.title,
        typeLabel,
        contentType,
        thumbnailUrl: getThumb?.(item) ?? null,
        score: typeof item.score === "number" ? item.score : null,
      });
    }
  };

  if (data.sections.billboards) {
    push(data.billboards, "تبلیغات محیطی", "billboard", (item) => item.thumbnailUrl);
  }
  if (data.sections.posters) {
    push(data.posters, "پوستر", "poster");
  }
  if (data.sections.videos) {
    push(data.videos, "ویدیو", "video");
  }
  if (data.sections.socialPosts) {
    push(data.socialPosts, "پست اجتماعی", "social_post", (item) => item.coverImageUrl);
  }
  if (data.sections.sitePublications) {
    push(data.sitePublications, "انتشار سایت", "site_publication", (item) => item.coverImageUrl);
  }
  if (data.sections.activities) {
    push(data.activities, "اقدام", "activity", (item) => item.imageUrl);
    push(data.pressPublications, "رسانه چاپی", "activity", (item) => item.imageUrl);
  }
  if (data.sections.files) {
    push(data.files, "فایل", "file");
  }

  return items.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

export function collectLeaderboardBillboards(
  data: LeaderboardSourceData,
  filter: {
    provinceKey?: string;
    ministryKey?: string;
    organizationKey?: string;
    userKey?: string;
  }
): Billboard[] {
  if (!data.sections.billboards) return [];

  return data.billboards.filter((item) => {
    if (filter.provinceKey && resolveProvince(item) !== filter.provinceKey) return false;
    if (filter.ministryKey && resolveMinistry(item).ministryKey !== filter.ministryKey) {
      return false;
    }
    if (
      filter.organizationKey &&
      resolveOrganization(item).organizationKey !== filter.organizationKey
    ) {
      return false;
    }
    if (filter.userKey && !resolveUserKeyMatch(item, filter.userKey)) return false;
    return true;
  });
}

export function buildProvinceContributorLeaderboard(
  data: LeaderboardSourceData
): ProvinceContributorEntry[] {
  const map = new Map<string, ProvinceContributorEntry>();

  const addAll = <T extends Ownable & { createdAt?: string | null; province?: string | null }>(
    items: T[],
    field: MetricField
  ) => {
    for (const item of items) addContributor(map, item, field);
  };

  collectLeaderboardItems(data, addAll);

  return [...map.values()]
    .sort((a, b) => b.score - a.score || b.totalUploads - a.totalUploads)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function buildMinistryContributorLeaderboard(
  data: LeaderboardSourceData
): MinistryContributorEntry[] {
  const map = new Map<string, MinistryContributorEntry>();

  collectLeaderboardItems(data, (items, field) => {
    for (const item of items) addMinistryContributor(map, item, field);
  });

  return [...map.values()]
    .sort((a, b) => b.score - a.score || b.totalUploads - a.totalUploads)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function getProvinceRankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

// Backward-compatible aliases
export const buildCityLeaderboard = buildProvinceLeaderboard;
export const buildCityContributorLeaderboard = buildProvinceContributorLeaderboard;
export const getCityRankBadge = getProvinceRankBadge;
export type CityLeaderboardEntry = ProvinceLeaderboardEntry;
export type CityContributorEntry = ProvinceContributorEntry;
