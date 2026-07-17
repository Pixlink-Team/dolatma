import { getBillboardUploadActivityDate } from "@/lib/billboards";
import {
  getSafeCreatedTimestamp,
  getTehranOffsetDateIso,
  timestampToTehranDateIso,
} from "@/lib/safe-dates";
import type { PublicCampaignData } from "@/lib/types";

export interface UploadActivityPoint {
  date: string;
  total: number;
  posters: number;
  videos: number;
  billboards: number;
  socialPosts: number;
  sitePublications: number;
  activities: number;
  broadcastReports: number;
  meetings: number;
  files: number;
}

export interface UploadActivitySummary {
  today: number;
  yesterday: number;
  last7Days: number;
  series: UploadActivityPoint[];
}

function emptyPoint(date: string): UploadActivityPoint {
  return {
    date,
    total: 0,
    posters: 0,
    videos: 0,
    billboards: 0,
    socialPosts: 0,
    sitePublications: 0,
    activities: 0,
    broadcastReports: 0,
    meetings: 0,
    files: 0,
  };
}

function dateKey(value?: string | null): string {
  return timestampToTehranDateIso(value);
}

type UploadField = Exclude<keyof UploadActivityPoint, "date" | "total">;

export function buildUploadActivityStats(data: PublicCampaignData, days = 14): UploadActivitySummary {
  const buckets = new Map<string, UploadActivityPoint>();

  const add = (createdAt: string | null | undefined, field: UploadField) => {
    const date = dateKey(createdAt);
    if (!date) return;
    const point = buckets.get(date) ?? emptyPoint(date);
    point[field]++;
    point.total++;
    buckets.set(date, point);
  };

  for (const poster of data.posters) add(getSafeCreatedTimestamp(poster), "posters");
  for (const video of data.videos) add(getSafeCreatedTimestamp(video), "videos");
  for (const billboard of data.billboards) {
    const activityDate = getBillboardUploadActivityDate(billboard);
    if (activityDate) add(activityDate, "billboards");
  }
  for (const post of data.socialPosts) add(getSafeCreatedTimestamp(post), "socialPosts");
  for (const post of data.sitePublications) add(getSafeCreatedTimestamp(post), "sitePublications");
  for (const activity of data.activities) add(getSafeCreatedTimestamp(activity), "activities");
  for (const activity of data.pressPublications) add(getSafeCreatedTimestamp(activity), "activities");
  for (const report of data.broadcastReports) add(getSafeCreatedTimestamp(report), "broadcastReports");
  for (const meeting of data.meetings) add(meeting.meetingDate, "meetings");
  for (const file of data.files) add(getSafeCreatedTimestamp(file), "files");

  const today = getTehranOffsetDateIso(0);
  const yesterday = getTehranOffsetDateIso(-1);

  const series: UploadActivityPoint[] = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = getTehranOffsetDateIso(-index);
    series.push(buckets.get(date) ?? emptyPoint(date));
  }

  return {
    today: buckets.get(today)?.total ?? 0,
    yesterday: buckets.get(yesterday)?.total ?? 0,
    last7Days: series.slice(-7).reduce((sum, point) => sum + point.total, 0),
    series,
  };
}
