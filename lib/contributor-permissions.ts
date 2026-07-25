export interface ContributorPermissions {
  billboards: boolean;
  posters: boolean;
  videos: boolean;
  files: boolean;
  rawMedia: boolean;
  analytics: boolean;
  socialPosts: boolean;
  sitePublications: boolean;
  broadcast: boolean;
  meetings: boolean;
  activities: boolean;
  submissions: boolean;
  directives: boolean;
  forms: boolean;
  mediaCommand: boolean;
  monitoring: boolean;
}

export type ContributorPermissionKey = keyof ContributorPermissions;

export const defaultContributorPermissions = (): ContributorPermissions => ({
  billboards: true,
  posters: true,
  videos: true,
  files: true,
  rawMedia: true,
  analytics: true,
  socialPosts: true,
  sitePublications: true,
  broadcast: true,
  meetings: true,
  activities: true,
  submissions: true,
  directives: true,
  // Forms are admin/client-only; never granted to regular users.
  forms: false,
  mediaCommand: true,
  monitoring: true,
});

/** Permissions shown when editing users. Excludes admin-only tools like forms. */
export const contributorPermissionLabels: Partial<
  Record<ContributorPermissionKey, string>
> = {
  billboards: "تبلیغات محیطی",
  posters: "پوسترها",
  videos: "ویدیوها",
  files: "فایل‌ها",
  rawMedia: "راش تصویر",
  analytics: "سایت‌های شرکت‌ها",
  socialPosts: "پست‌ها و شبکه‌های اجتماعی",
  sitePublications: "انتشار در سایت",
  broadcast: "پخش صدا و سیما",
  meetings: "جلسات و مصوبات",
  activities: "اقدامات",
  submissions: "مشارکت‌ها",
  directives: "دستورکارها",
  mediaCommand: "میز فرمان رسانه‌ای",
  monitoring: "رصد و واکنش سریع",
};

export function normalizeContributorPermissions(
  value: unknown
): ContributorPermissions {
  const defaults = defaultContributorPermissions();
  if (!value || typeof value !== "object") return defaults;

  const record = value as Partial<ContributorPermissions>;
  return {
    billboards: record.billboards ?? defaults.billboards,
    posters: record.posters ?? defaults.posters,
    videos: record.videos ?? defaults.videos,
    files: record.files ?? defaults.files,
    rawMedia: record.rawMedia ?? defaults.rawMedia,
    analytics: record.analytics ?? defaults.analytics,
    socialPosts: record.socialPosts ?? defaults.socialPosts,
    sitePublications: record.sitePublications ?? defaults.sitePublications,
    broadcast: record.broadcast ?? defaults.broadcast,
    meetings: record.meetings ?? defaults.meetings,
    activities: record.activities ?? defaults.activities,
    submissions: record.submissions ?? defaults.submissions,
    directives: record.directives ?? defaults.directives,
    // Always deny — forms UI is admin/client-only.
    forms: false,
    mediaCommand: record.mediaCommand ?? defaults.mediaCommand,
    monitoring: record.monitoring ?? defaults.monitoring,
  };
}

export function hasContributorPermission(
  permissions: ContributorPermissions | null | undefined,
  key: ContributorPermissionKey
): boolean {
  // Deny by default when permissions are missing (no campaign membership / not loaded yet).
  if (!permissions) return false;
  return Boolean(permissions[key]);
}

/** All section flags off — used when a user has no campaign access row. */
export const deniedContributorPermissions = (): ContributorPermissions => ({
  billboards: false,
  posters: false,
  videos: false,
  files: false,
  rawMedia: false,
  analytics: false,
  socialPosts: false,
  sitePublications: false,
  broadcast: false,
  meetings: false,
  activities: false,
  submissions: false,
  directives: false,
  forms: false,
  mediaCommand: false,
  monitoring: false,
});
