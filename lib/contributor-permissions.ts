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
  /** Panel management: campaign (راستا) settings page. */
  campaignSettings: boolean;
  /** Panel management: site updates changelog. */
  siteUpdates: boolean;
  /** Panel management: section tutorials admin page. */
  sectionTutorials: boolean;
  /** Panel management: national calendar page. */
  nationalCalendar: boolean;
  /** Scoped management: create/edit users under own device subtree. */
  manageSubtreeUsers: boolean;
  /** Scoped management: issue directives to subtree audience. */
  manageSubtreeDirectives: boolean;
  /** Scoped management: score content owned within subtree. */
  scoreSubtreeContent: boolean;
  /** Scoped management: mutate devices inside subtree. */
  manageSubtreeDevices: boolean;
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
  // Panel management sections stay off unless admin grants them.
  forms: false,
  mediaCommand: true,
  monitoring: true,
  campaignSettings: false,
  siteUpdates: false,
  sectionTutorials: false,
  // Keep open by default — previously always visible; admin can revoke per user.
  nationalCalendar: true,
  manageSubtreeUsers: false,
  manageSubtreeDirectives: false,
  scoreSubtreeContent: false,
  manageSubtreeDevices: false,
});

/** Content section permissions shown when editing users. */
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

/** Panel management toggles (hidden from org users unless admin enables). */
export const panelManagementKeys = [
  "forms",
  "campaignSettings",
  "siteUpdates",
  "sectionTutorials",
  "nationalCalendar",
] as const satisfies readonly ContributorPermissionKey[];

export type PanelManagementKey = (typeof panelManagementKeys)[number];

export const panelManagementPermissionLabels: Record<PanelManagementKey, string> = {
  forms: "فرم‌ها",
  campaignSettings: "تنظیمات راستا",
  siteUpdates: "آپدیت‌های سایت",
  sectionTutorials: "آموزش بخش‌ها",
  nationalCalendar: "تقویم ملی",
};

export const subtreeManagementKeys = [
  "manageSubtreeUsers",
  "manageSubtreeDirectives",
  "scoreSubtreeContent",
  "manageSubtreeDevices",
] as const satisfies readonly ContributorPermissionKey[];

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
    forms: record.forms ?? defaults.forms,
    mediaCommand: record.mediaCommand ?? defaults.mediaCommand,
    monitoring: record.monitoring ?? defaults.monitoring,
    campaignSettings: record.campaignSettings ?? defaults.campaignSettings,
    siteUpdates: record.siteUpdates ?? defaults.siteUpdates,
    sectionTutorials: record.sectionTutorials ?? defaults.sectionTutorials,
    nationalCalendar: record.nationalCalendar ?? defaults.nationalCalendar,
    manageSubtreeUsers: record.manageSubtreeUsers ?? defaults.manageSubtreeUsers,
    manageSubtreeDirectives:
      record.manageSubtreeDirectives ?? defaults.manageSubtreeDirectives,
    scoreSubtreeContent: record.scoreSubtreeContent ?? defaults.scoreSubtreeContent,
    manageSubtreeDevices: record.manageSubtreeDevices ?? defaults.manageSubtreeDevices,
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
  campaignSettings: false,
  siteUpdates: false,
  sectionTutorials: false,
  nationalCalendar: false,
  manageSubtreeUsers: false,
  manageSubtreeDirectives: false,
  scoreSubtreeContent: false,
  manageSubtreeDevices: false,
});
