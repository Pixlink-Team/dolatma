import type { LucideIcon } from "lucide-react";
import {
  Award,
  ClipboardList,
  FileStack,
  FileText,
  Globe,
  ImageIcon,
  Images,
  LayoutGrid,
  Radio,
  Send,
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
  SmsSendReport,
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
  smsReports?: SmsSendReport[];
  /** Approved best-practice cards count (optional; filled on dashboard). */
  bestPracticesCount?: number;
}

/** Aligns with admin sidebar nav groups (تولید / نشر و انتشار / دارایی‌ها). */
export type DashboardStatGroupKey = "production" | "publishing" | "assets" | "other";

export const DASHBOARD_STAT_GROUP_LABELS: Record<DashboardStatGroupKey, string> = {
  production: "تولید",
  publishing: "نشر و انتشار",
  assets: "دارایی‌های دیجیتال",
  other: "سایر",
};

export interface DashboardStatDefinition {
  permissionKey: ContributorPermissionKey;
  /**
   * Campaign feature gate for full admins.
   * When omitted, the card is always shown for admins (permission-only sections).
   */
  featureKey?: keyof CampaignFeatures;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Lower = more important in dashboard sort/layout (1 = highest). */
  priority: number;
  group: DashboardStatGroupKey;
  getCount: (data: AdminDashboardData, billboards: Billboard[]) => number;
}

export const DASHBOARD_STAT_DEFINITIONS: DashboardStatDefinition[] = [
  // —— تولید (same order as sidebar production group)
  {
    permissionKey: "posters",
    featureKey: "posters",
    label: "پوستر و عکس",
    href: "/admin/posters",
    icon: ImageIcon,
    priority: 1,
    group: "production",
    getCount: (data) => data.posters.length,
  },
  {
    permissionKey: "videos",
    featureKey: "videos",
    label: "ویدیوها",
    href: "/admin/videos",
    icon: Video,
    priority: 2,
    group: "production",
    getCount: (data) => data.videos.length,
  },
  {
    permissionKey: "files",
    featureKey: "files",
    label: "فایل‌ها",
    href: "/admin/files",
    icon: FileStack,
    priority: 3,
    group: "production",
    getCount: (data) => (data.files ?? []).length,
  },
  {
    permissionKey: "meetings",
    featureKey: "meetings",
    label: "جلسات و مصوبات",
    href: "/admin/meetings",
    icon: ClipboardList,
    priority: 4,
    group: "production",
    getCount: (data) => (data.meetings ?? []).length,
  },
  // —— نشر و انتشار (same order as sidebar publishing group)
  {
    permissionKey: "billboards",
    featureKey: "billboards",
    label: "تبلیغات محیطی",
    href: "/admin/billboards",
    icon: LayoutGrid,
    priority: 5,
    group: "publishing",
    getCount: (_, billboards) => billboards.length,
  },
  {
    permissionKey: "socialPosts",
    featureKey: "socialPosts",
    label: "پست شبکه اجتماعی",
    href: "/admin/social-posts",
    icon: Images,
    priority: 6,
    group: "publishing",
    getCount: (data) => splitSocialPosts(data.socialPosts ?? []).socialPosts.length,
  },
  {
    permissionKey: "sitePublications",
    featureKey: "sitePublications",
    label: "سایت",
    href: "/admin/site-publications",
    icon: Globe,
    priority: 7,
    group: "publishing",
    getCount: (data) => splitSocialPosts(data.socialPosts ?? []).sitePublications.length,
  },
  {
    permissionKey: "sitePublications",
    featureKey: "sitePublications",
    label: "خبرگزاری",
    href: "/admin/news-agencies",
    icon: Globe,
    priority: 8,
    group: "publishing",
    getCount: (data) => splitSocialPosts(data.socialPosts ?? []).newsAgencyPublications.length,
  },
  {
    permissionKey: "broadcast",
    featureKey: "broadcastReports",
    label: "صدا و سیما",
    href: "/admin/broadcast",
    icon: Radio,
    priority: 9,
    group: "publishing",
    getCount: (data) => (data.broadcastReports ?? []).length,
  },
  {
    permissionKey: "activities",
    featureKey: "activities",
    label: "اقدامات",
    href: "/admin/activities",
    icon: Sparkles,
    priority: 10,
    group: "publishing",
    getCount: (data) => (data.activities ?? []).length,
  },
  {
    permissionKey: "smsReports",
    featureKey: "smsReports",
    label: "ارسال پیام انبوه",
    href: "/admin/sms-reports",
    icon: Send,
    priority: 11,
    group: "publishing",
    getCount: (data) => (data.smsReports ?? []).length,
  },
  {
    permissionKey: "submissions",
    featureKey: "submissions",
    label: "مشارکت‌ها",
    href: "/admin/submissions",
    icon: FileText,
    priority: 12,
    group: "publishing",
    getCount: (data) => data.submissions.length,
  },
  // —— دارایی‌های دیجیتال
  {
    permissionKey: "analytics",
    featureKey: "analytics",
    label: "سایت‌ها",
    href: "/admin/analytics",
    icon: Globe,
    priority: 13,
    group: "assets",
    getCount: (data) => (data.companyWebsites ?? []).length,
  },
  {
    permissionKey: "socialPosts",
    featureKey: "socialAnalytics",
    label: "شبکه‌های اجتماعی",
    href: "/admin/social-analytics",
    icon: Share2,
    priority: 14,
    group: "assets",
    getCount: (data) => (data.socialPlatformStats ?? []).length,
  },
  // —— سایر (ungrouped in sidebar)
  {
    permissionKey: "bestPractices",
    label: "بهترین اقدامات",
    href: "/admin/best-practices",
    icon: Award,
    priority: 15,
    group: "other",
    getCount: (data) => data.bestPracticesCount ?? 0,
  },
];
