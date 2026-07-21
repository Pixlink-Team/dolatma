import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  FileStack,
  FileText,
  Globe,
  ImageIcon,
  Images,
  LayoutGrid,
  Radio,
  Share2,
  Sparkles,
  Video,
} from "lucide-react";
import type { ContributorPermissionKey } from "@/lib/contributor-permissions";
import { splitSocialPosts } from "@/lib/social-posts";
import type {
  Billboard,
  BroadcastReport,
  CampaignActivity,
  CampaignFile,
  CampaignFeatures,
  CampaignMeeting,
  CampaignSubmission,
  CompanyWebsite,
  Poster,
  SocialMediaPost,
  SocialPlatformStat,
  Video as CampaignVideo,
} from "@/lib/types";

export interface AdminDashboardData {
  posters: Poster[];
  videos: CampaignVideo[];
  files?: CampaignFile[];
  submissions: CampaignSubmission[];
  companyWebsites?: CompanyWebsite[];
  socialPosts?: SocialMediaPost[];
  socialPlatformStats?: SocialPlatformStat[];
  broadcastReports?: BroadcastReport[];
  meetings?: CampaignMeeting[];
  activities?: CampaignActivity[];
}

export interface DashboardStatDefinition {
  permissionKey: ContributorPermissionKey;
  featureKey: keyof CampaignFeatures;
  label: string;
  href: string;
  icon: LucideIcon;
  getCount: (data: AdminDashboardData, billboards: Billboard[]) => number;
}

export const DASHBOARD_STAT_DEFINITIONS: DashboardStatDefinition[] = [
  {
    permissionKey: "billboards",
    featureKey: "billboards",
    label: "تبلیغات محیطی",
    href: "/admin/billboards",
    icon: LayoutGrid,
    getCount: (_, billboards) => billboards.length,
  },
  {
    permissionKey: "posters",
    featureKey: "posters",
    label: "پوسترها",
    href: "/admin/posters",
    icon: ImageIcon,
    getCount: (data) => data.posters.length,
  },
  {
    permissionKey: "videos",
    featureKey: "videos",
    label: "ویدیوها",
    href: "/admin/videos",
    icon: Video,
    getCount: (data) => data.videos.length,
  },
  {
    permissionKey: "files",
    featureKey: "files",
    label: "فایل‌ها",
    href: "/admin/files",
    icon: FileStack,
    getCount: (data) => (data.files ?? []).length,
  },
  {
    permissionKey: "submissions",
    featureKey: "submissions",
    label: "مشارکت‌ها",
    href: "/admin/submissions",
    icon: FileText,
    getCount: (data) => data.submissions.length,
  },
  {
    permissionKey: "analytics",
    featureKey: "analytics",
    label: "سایت‌های شرکت‌ها",
    href: "/admin/analytics",
    icon: Globe,
    getCount: (data) => (data.companyWebsites ?? []).length,
  },
  {
    permissionKey: "sitePublications",
    featureKey: "sitePublications",
    label: "انتشار در سایت",
    href: "/admin/site-publications",
    icon: Globe,
    getCount: (data) => splitSocialPosts(data.socialPosts ?? []).sitePublications.length,
  },
  {
    permissionKey: "socialPosts",
    featureKey: "socialAnalytics",
    label: "شبکه‌های اجتماعی",
    href: "/admin/social-analytics",
    icon: Share2,
    getCount: (data) => (data.socialPlatformStats ?? []).length,
  },
  {
    permissionKey: "socialPosts",
    featureKey: "socialPosts",
    label: "پست‌های شبکه اجتماعی",
    href: "/admin/social-posts",
    icon: Images,
    getCount: (data) => splitSocialPosts(data.socialPosts ?? []).socialPosts.length,
  },
  {
    permissionKey: "broadcast",
    featureKey: "broadcastReports",
    label: "پخش صدا و سیما",
    href: "/admin/broadcast",
    icon: Radio,
    getCount: (data) => (data.broadcastReports ?? []).length,
  },
  {
    permissionKey: "meetings",
    featureKey: "meetings",
    label: "جلسات و مصوبات",
    href: "/admin/meetings",
    icon: ClipboardList,
    getCount: (data) => (data.meetings ?? []).length,
  },
  {
    permissionKey: "activities",
    featureKey: "activities",
    label: "اقدامات",
    href: "/admin/activities",
    icon: Sparkles,
    getCount: (data) => (data.activities ?? []).length,
  },
];
