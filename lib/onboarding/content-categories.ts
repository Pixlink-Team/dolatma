import type { CampaignFeatures } from "@/lib/types";
import type { ContributorPermissions } from "@/lib/contributor-permissions";
import { hasContributorPermission } from "@/lib/contributor-permissions";

/** Uploadable content categories checked by the onboarding content step. */
export interface OnboardingContentCategoryDef {
  key: string;
  label: string;
  href: string;
  featureKey: keyof CampaignFeatures;
  permissionKey: keyof ContributorPermissions;
}

export const ONBOARDING_CONTENT_CATEGORIES: OnboardingContentCategoryDef[] = [
  {
    key: "billboards",
    label: "تبلیغات محیطی",
    href: "/admin/billboards",
    featureKey: "billboards",
    permissionKey: "billboards",
  },
  {
    key: "posters",
    label: "پوستر و عکس",
    href: "/admin/posters",
    featureKey: "posters",
    permissionKey: "posters",
  },
  {
    key: "videos",
    label: "ویدیوها",
    href: "/admin/videos",
    featureKey: "videos",
    permissionKey: "videos",
  },
  {
    key: "files",
    label: "فایل‌ها",
    href: "/admin/files",
    featureKey: "files",
    permissionKey: "files",
  },
  {
    key: "rawMedia",
    label: "راش تصاویر",
    href: "/admin/raw-media",
    featureKey: "rawMedia",
    permissionKey: "rawMedia",
  },
  {
    key: "sitePublications",
    label: "سایت / خبرگزاری",
    href: "/admin/site-publications",
    featureKey: "sitePublications",
    permissionKey: "sitePublications",
  },
  {
    key: "socialPosts",
    label: "پست شبکه اجتماعی",
    href: "/admin/social-posts",
    featureKey: "socialPosts",
    permissionKey: "socialPosts",
  },
  {
    key: "broadcast",
    label: "صدا و سیما",
    href: "/admin/broadcast",
    featureKey: "broadcastReports",
    permissionKey: "broadcast",
  },
  {
    key: "meetings",
    label: "جلسات و مصوبات",
    href: "/admin/meetings",
    featureKey: "meetings",
    permissionKey: "meetings",
  },
  {
    key: "activities",
    label: "اقدامات",
    href: "/admin/activities",
    featureKey: "activities",
    permissionKey: "activities",
  },
  {
    key: "submissions",
    label: "مشارکت‌ها",
    href: "/admin/submissions",
    featureKey: "submissions",
    permissionKey: "submissions",
  },
];

export function resolveRequiredContentCategories(input: {
  features: CampaignFeatures;
  permissions?: ContributorPermissions | null;
  /** When true, ignore contributor permissions (admin / device overview). */
  ignorePermissions?: boolean;
}): OnboardingContentCategoryDef[] {
  return ONBOARDING_CONTENT_CATEGORIES.filter((category) => {
    if (!input.features[category.featureKey]) return false;
    if (input.ignorePermissions) return true;
    if (!input.permissions) return true;
    return hasContributorPermission(input.permissions, category.permissionKey);
  });
}
