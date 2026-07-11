import { isoFromGregorian } from "@/lib/jalali";
import { isCampaignContentFilterActive } from "@/lib/campaign-content-filter";
import { countsAsTodayBillboardUpload } from "@/lib/billboards";
import { filterItemsByOwnerLocation, type OwnerLocationFilter } from "@/lib/owner-location-filter";
import { getSafeUploadTimestamp, safeDatePrefix } from "@/lib/safe-dates";
import type { Billboard, Ownable, PublicCampaignData, SocialMediaPost } from "@/lib/types";

export interface KpiTodayDeltas {
  billboards: number;
  posters: number;
  videos: number;
  socialFollowers: number;
  socialPostViews: number;
  socialPosts: number;
  sitePublications: number;
  activities: number;
  pressPublications: number;
  submissions: number;
  files: number;
}

function todayIso(): string {
  const date = new Date();
  return isoFromGregorian(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function isToday(value?: string | null): boolean {
  const date = safeDatePrefix(value);
  return Boolean(date) && date === todayIso();
}

function resolveItemDate<T extends Ownable & { createdAt?: string | null; updatedAt?: string | null }>(
  item: T,
  getItemDate?: (item: T) => string | undefined
): string {
  return getItemDate?.(item) ?? getSafeUploadTimestamp(item);
}

function countCreatedToday<T extends Ownable & { createdAt?: string | null; updatedAt?: string | null }>(
  items: T[],
  filter: OwnerLocationFilter,
  getItemDate?: (item: T) => string | undefined
): number {
  const scoped = isCampaignContentFilterActive(filter)
    ? filterItemsByOwnerLocation(items, filter, getItemDate)
    : items;

  return scoped.filter((item) => isToday(resolveItemDate(item, getItemDate))).length;
}

function sumSocialPostViewsToday(
  posts: SocialMediaPost[],
  filter: OwnerLocationFilter
): number {
  const scoped = isCampaignContentFilterActive(filter)
    ? filterItemsByOwnerLocation(posts, filter)
    : posts;

  return scoped
    .filter((post) => isToday(getSafeUploadTimestamp(post)))
    .reduce((sum, post) => sum + post.views, 0);
}

function countBillboardsToday(billboards: Billboard[], filter: OwnerLocationFilter): number {
  const scoped = isCampaignContentFilterActive(filter)
    ? filterItemsByOwnerLocation(billboards, filter, (billboard) => getSafeUploadTimestamp(billboard))
    : billboards;

  return scoped.filter((billboard) => countsAsTodayBillboardUpload(billboard)).length;
}

export function computeKpiTodayDeltas(
  data: PublicCampaignData,
  filter: OwnerLocationFilter
): KpiTodayDeltas {
  const { sections } = data;

  const activitiesToday = sections.activities
    ? countCreatedToday(data.activities, filter)
    : 0;
  const pressToday = sections.pressPublications
    ? countCreatedToday(data.pressPublications, filter)
    : 0;

  return {
    billboards: sections.billboards ? countBillboardsToday(data.billboards, filter) : 0,
    posters: sections.posters ? countCreatedToday(data.posters, filter) : 0,
    videos: sections.videos ? countCreatedToday(data.videos, filter) : 0,
    socialFollowers: sections.socialAnalytics
      ? countCreatedToday(data.socialAnalytics.platforms, filter)
      : 0,
    socialPostViews: sections.socialPosts ? sumSocialPostViewsToday(data.socialPosts, filter) : 0,
    socialPosts: sections.socialPosts ? countCreatedToday(data.socialPosts, filter) : 0,
    sitePublications: sections.sitePublications
      ? countCreatedToday(data.sitePublications, filter)
      : 0,
    // Keep activities separate from press so KPI cards do not double-count.
    activities: activitiesToday,
    pressPublications: pressToday,
    submissions: sections.submissions ? countCreatedToday(data.submissions, filter) : 0,
    files: sections.files ? countCreatedToday(data.files, filter) : 0,
  };
}
