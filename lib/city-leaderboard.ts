import { isoFromGregorian } from "@/lib/jalali";
import { normalizeImportedProvince } from "@/lib/iran-locations";
import { getSafeUploadTimestamp, isSameDay } from "@/lib/safe-dates";
import type { Ownable, PublicCampaignData } from "@/lib/types";

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
}

export interface ProvinceLeaderboardEntry extends ProvinceLeaderboardMetrics {
  rank: number;
  province: string;
  provinceKey: string;
}

export interface ProvinceContributorEntry {
  rank: number;
  userName: string;
  province: string;
  provinceKey: string;
  totalUploads: number;
  score: number;
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
  const date = new Date();
  return isoFromGregorian(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function resolveProvince(item: Ownable & { province?: string | null }): string {
  const raw = item.ownerProvince?.trim() || item.province?.trim() || "";
  return (normalizeImportedProvince(raw) ?? raw) || "نامشخص";
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
  };
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

  current[field]++;
  current.totalUploads++;
  current.score += SCORE_WEIGHTS[field];

  if (isSameDay(getSafeUploadTimestamp(item), todayIso())) {
    current.todayUploads++;
  }

  map.set(province, current);
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
  };

  current.totalUploads++;
  current.score += SCORE_WEIGHTS[field];
  map.set(contributorKey, current);
}

export function buildProvinceLeaderboard(data: PublicCampaignData): ProvinceLeaderboardEntry[] {
  const map = new Map<string, ProvinceLeaderboardMetrics & { province: string }>();

  if (data.sections.billboards) {
    for (const item of data.billboards) addItem(map, item, "billboards");
  }
  if (data.sections.posters) {
    for (const item of data.posters) addItem(map, item, "posters");
  }
  if (data.sections.videos) {
    for (const item of data.videos) addItem(map, item, "videos");
  }
  if (data.sections.socialPosts) {
    for (const item of data.socialPosts) addItem(map, item, "socialPosts");
  }
  if (data.sections.sitePublications) {
    for (const item of data.sitePublications) addItem(map, item, "sitePublications");
  }
  if (data.sections.activities) {
    for (const item of data.activities) addItem(map, item, "activities");
    for (const item of data.pressPublications) addItem(map, item, "activities");
  }
  if (data.sections.files) {
    for (const item of data.files) addItem(map, item, "files");
  }

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
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score || b.totalUploads - a.totalUploads)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function buildProvinceContributorLeaderboard(
  data: PublicCampaignData
): ProvinceContributorEntry[] {
  const map = new Map<string, ProvinceContributorEntry>();

  const addAll = <T extends Ownable & { createdAt?: string | null; province?: string | null }>(
    items: T[],
    field: MetricField
  ) => {
    for (const item of items) addContributor(map, item, field);
  };

  if (data.sections.billboards) addAll(data.billboards, "billboards");
  if (data.sections.posters) addAll(data.posters, "posters");
  if (data.sections.videos) addAll(data.videos, "videos");
  if (data.sections.socialPosts) addAll(data.socialPosts, "socialPosts");
  if (data.sections.sitePublications) addAll(data.sitePublications, "sitePublications");
  if (data.sections.activities) {
    addAll(data.activities, "activities");
    addAll(data.pressPublications, "activities");
  }
  if (data.sections.files) addAll(data.files, "files");

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
