import type { LeaderboardSourceData } from "@/lib/city-leaderboard";
import { splitPressActivities } from "@/lib/press-publications";
import { splitSocialPosts } from "@/lib/social-posts";
import type {
  Billboard,
  CampaignActivity,
  CampaignFile,
  PosterWithVersions,
  SocialMediaPost,
  VideoWithVersions,
} from "@/lib/types";

export type AdminPerformanceSourceInput = {
  billboards?: Billboard[] | null;
  posters?: PosterWithVersions[] | null;
  videos?: VideoWithVersions[] | null;
  socialPosts?: SocialMediaPost[] | null;
  activities?: CampaignActivity[] | null;
  files?: CampaignFile[] | null;
};

/** Build leaderboard input from admin campaign data (includes drafts, unlike the public page). */
export function buildLeaderboardSourceFromAdmin(
  data: AdminPerformanceSourceInput
): LeaderboardSourceData {
  const { sitePublications, socialPosts } = splitSocialPosts(data.socialPosts ?? []);
  const { pressPublications, fieldActivities } = splitPressActivities(data.activities ?? []);

  return {
    sections: {
      billboards: true,
      posters: true,
      videos: true,
      analytics: false,
      socialAnalytics: false,
      socialPosts: true,
      sitePublications: true,
      broadcastReports: false,
      meetings: false,
      activities: true,
      pressPublications: true,
      submissions: false,
      files: true,
      rawMedia: false,
    },
    billboards: data.billboards ?? [],
    posters: data.posters ?? [],
    videos: data.videos ?? [],
    socialPosts,
    sitePublications,
    activities: fieldActivities,
    pressPublications,
    files: data.files ?? [],
  };
}
