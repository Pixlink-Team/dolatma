import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ImageIcon,
  Send,
} from "lucide-react";
import { DASHBOARD_STAT_DEFINITIONS, type DashboardStatDefinition } from "@/lib/admin-dashboard-stats";
import type { ContributorPermissionKey } from "@/lib/contributor-permissions";
import type { CampaignFeatures } from "@/lib/types";

export type AdminDashboardGroupKey = "assets" | "production" | "publishing";

export interface AdminDashboardGroupDefinition {
  key: AdminDashboardGroupKey;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  sectionHrefs: string[];
}

export const ADMIN_DASHBOARD_GROUPS: AdminDashboardGroupDefinition[] = [
  {
    key: "assets",
    label: "دارایی‌ها",
    description: "صفحات، سایت‌ها، بیلبوردها و ظرفیت‌های دستگاه/کاربر",
    href: "/admin/capacity-map",
    icon: Building2,
    sectionHrefs: [
      "/admin/capacity-map",
      "/admin/analytics",
      "/admin/social-analytics",
      "/admin/billboards",
      "/admin/ministries",
    ],
  },
  {
    key: "production",
    label: "تولید",
    description: "پوستر، ویدیو، فایل و راش تصویر",
    href: "/admin/posters",
    icon: ImageIcon,
    sectionHrefs: ["/admin/posters", "/admin/videos", "/admin/files", "/admin/raw-media"],
  },
  {
    key: "publishing",
    label: "نشر و انتشار",
    description: "پست‌ها، سایت، صداوسیما، پیام، مطبوعات و اقدامات",
    href: "/admin/social-posts",
    icon: Send,
    sectionHrefs: [
      "/admin/site-publications",
      "/admin/social-posts",
      "/admin/press-publications",
      "/admin/activities",
      "/admin/broadcast",
      "/admin/sms-reports",
      "/admin/meetings",
      "/admin/submissions",
    ],
  },
];

export function groupDashboardStats(
  stats: Array<{
    label: string;
    value: number;
    href: string;
    icon: LucideIcon;
  }>
) {
  return ADMIN_DASHBOARD_GROUPS.map((group) => {
    const items = stats.filter((stat) =>
      group.sectionHrefs.some((href) => stat.href.includes(href))
    );
    return {
      ...group,
      items,
      total: items.reduce((sum, item) => sum + item.value, 0),
    };
  }).filter((group) => group.items.length > 0);
}

export function getDashboardDefinitionsForGroup(
  groupKey: AdminDashboardGroupKey
): DashboardStatDefinition[] {
  const group = ADMIN_DASHBOARD_GROUPS.find((item) => item.key === groupKey);
  if (!group) return [];
  return DASHBOARD_STAT_DEFINITIONS.filter((definition) =>
    group.sectionHrefs.includes(definition.href)
  );
}

export function canSeeDashboardGroup(
  groupKey: AdminDashboardGroupKey,
  options: {
    canManageAll: boolean;
    features: CampaignFeatures;
    hasPermission: (key: ContributorPermissionKey) => boolean;
  }
): boolean {
  const defs = getDashboardDefinitionsForGroup(groupKey);
  if (defs.length === 0) {
    return groupKey === "assets" && options.canManageAll;
  }
  return defs.some((definition) =>
    options.canManageAll
      ? options.features[definition.featureKey]
      : options.hasPermission(definition.permissionKey)
  );
}
