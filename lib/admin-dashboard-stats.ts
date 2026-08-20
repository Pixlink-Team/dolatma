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
}

export interface DashboardStatDefinition {
  permissionKey: ContributorPermissionKey;
  featureKey: keyof CampaignFeatures;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Lower = more important in dashboard sort/layout (1 = highest). */
  priority: number;
  getCount: (data: AdminDashboardData, billboards: Billboard[]) => number;
}

export const DASHBOARD_STAT_DEFINITIONS: DashboardStatDefinition[] = [
  {
    permissionKey: "billboards",
    featureKey: "billboards",
    label: "تبلیغات محیطی",
    href: "/admin/billboards",
    icon: LayoutGrid,
    priority: 1,
    getCount: (_, billboards) => billboards.length,
  },
  {
    permissionKey: "posters",
    featureKey: "posters",
    label: "پوستر و عکس",
    href: "/admin/posters",
    icon: ImageIcon,
    priority: 2,
    getCount: (data) => data.posters.length,
  },
  {
    permissionKey: "videos",
    featureKey: "videos",
    label: "ویدیوها",
    href: "/admin/videos",
    icon: Video,
    priority: 3,
    getCount: (data) => data.videos.length,
  },
  {
    permissionKey: "socialPosts",
    featureKey: "socialPosts",
    label: "پست شبکه اجتماعی",
    href: "/admin/social-posts",
    icon: Images,
    priority: 4,
    getCount: (data) => splitSocialPosts(data.socialPosts ?? []).socialPosts.length,
  },
  {
    permissionKey: "sitePublications",
    featureKey: "sitePublications",
    label: "سایت",
    href: "/admin/site-publications",
    icon: Globe,
    priority: 5,
    getCount: (data) => splitSocialPosts(data.socialPosts ?? []).sitePublications.length,
  },
  {
    permissionKey: "sitePublications",
    featureKey: "sitePublications",
    label: "خبرگزاری",
    href: "/admin/news-agencies",
    icon: Globe,
    priority: 6,
    getCount: (data) => splitSocialPosts(data.socialPosts ?? []).newsAgencyPublications.length,
  },
  {
    permissionKey: "broadcast",
    featureKey: "broadcastReports",
    label: "صدا و سیما",
    href: "/admin/broadcast",
    icon: Radio,
    priority: 7,
    getCount: (data) => (data.broadcastReports ?? []).length,
  },
  {
    permissionKey: "activities",
    featureKey: "activities",
    label: "اقدامات",
    href: "/admin/activities",
    icon: Sparkles,
    priority: 8,
    getCount: (data) => (data.activities ?? []).length,
  },
  {
    permissionKey: "meetings",
    featureKey: "meetings",
    label: "جلسات و مصوبات",
    href: "/admin/meetings",
    icon: ClipboardList,
    priority: 9,
    getCount: (data) => (data.meetings ?? []).length,
  },
  {
    permissionKey: "socialPosts",
    featureKey: "socialAnalytics",
    label: "شبکه‌های اجتماعی",
    href: "/admin/social-analytics",
    icon: Share2,
    priority: 10,
    getCount: (data) => (data.socialPlatformStats ?? []).length,
  },
  {
    permissionKey: "files",
    featureKey: "files",
    label: "فایل‌ها",
    href: "/admin/files",
    icon: FileStack,
    priority: 11,
    getCount: (data) => (data.files ?? []).length,
  },
  {
    permissionKey: "submissions",
    featureKey: "submissions",
    label: "مشارکت‌ها",
    href: "/admin/submissions",
    icon: FileText,
    priority: 12,
    getCount: (data) => data.submissions.length,
  },
  {
    permissionKey: "analytics",
    featureKey: "analytics",
    label: "سایت‌ها",
    href: "/admin/analytics",
    icon: Globe,
    priority: 13,
    getCount: (data) => (data.companyWebsites ?? []).length,
  },
  {
    permissionKey: "smsReports",
    featureKey: "smsReports",
    label: "ارسال پیام انبوه",
    href: "/admin/sms-reports",
    icon: Send,
    priority: 14,
    getCount: (data) => (data.smsReports ?? []).length,
  },
];
