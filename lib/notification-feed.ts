import type { Billboard, CampaignActivity, Poster, SocialMediaPost, Video } from "@/lib/types";

export type NotificationRange = "day" | "week" | "month";

export interface NotificationFeedItem {
  key: string;
  title: string;
  ownerName?: string | null;
  typeLabel: string;
  date: string;
  createdAt: string;
}

function startOfRange(range: NotificationRange): Date {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "day") return start;
  if (range === "week") {
    start.setDate(start.getDate() - 7);
    return start;
  }
  start.setMonth(start.getMonth() - 1);
  return start;
}

export function buildNotificationFeed(input: {
  posters: Poster[];
  videos: Video[];
  billboards: Billboard[];
  activities: CampaignActivity[];
  socialPosts: SocialMediaPost[];
}): NotificationFeedItem[] {
  const items: NotificationFeedItem[] = [];

  for (const poster of input.posters) {
    items.push({
      key: `poster:${poster.id}`,
      title: poster.title,
      ownerName: poster.ownerName,
      typeLabel: "پوستر",
      date: poster.createdAt.slice(0, 10),
      createdAt: poster.createdAt,
    });
  }

  for (const video of input.videos) {
    items.push({
      key: `video:${video.id}`,
      title: video.title,
      ownerName: video.ownerName,
      typeLabel: "ویدیو",
      date: video.createdAt.slice(0, 10),
      createdAt: video.createdAt,
    });
  }

  for (const billboard of input.billboards) {
    items.push({
      key: `billboard:${billboard.id}`,
      title: billboard.title,
      ownerName: billboard.ownerName,
      typeLabel: "تبلیغات محیطی",
      date: billboard.createdAt.slice(0, 10),
      createdAt: billboard.createdAt,
    });
  }

  for (const activity of input.activities) {
    items.push({
      key: `activity:${activity.id}`,
      title: activity.title,
      ownerName: activity.ownerName,
      typeLabel: "اقدام / مجله",
      date: activity.createdAt.slice(0, 10),
      createdAt: activity.createdAt,
    });
  }

  for (const post of input.socialPosts) {
    items.push({
      key: `social:${post.id}`,
      title: post.title,
      ownerName: post.ownerName,
      typeLabel: "شبکه اجتماعی",
      date: post.createdAt.slice(0, 10),
      createdAt: post.createdAt,
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function filterNotificationFeed(
  feed: NotificationFeedItem[],
  range: NotificationRange
): NotificationFeedItem[] {
  const start = startOfRange(range).toISOString();
  return feed.filter((item) => item.createdAt >= start);
}
