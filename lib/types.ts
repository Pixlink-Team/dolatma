export type CampaignStatus = "live" | "completed" | "draft";
export type ItemStatus = "draft" | "published" | "final" | "revised" | "pending" | "approved" | "rejected" | "completed";
export type MediaCategoryType = "poster" | "video";
export type VersionStatus = "draft" | "revised" | "final";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type TrafficSource = "instagram" | "telegram" | "direct" | "google" | "referral" | "other";
/** Browser/client device class used in analytics metrics. */
export type AnalyticsDeviceType = "mobile" | "desktop" | "tablet";
/** @deprecated Prefer AnalyticsDeviceType — kept for temporary compatibility. */
export type ClientDeviceType = AnalyticsDeviceType;
export type AdminRole =
  | "admin"
  | "client"
  | "org_user"
  /** @deprecated Migrated to org_user — kept for old sessions/rows during transition. */
  | "contributor"
  /** @deprecated Migrated to org_user + org_role=primary. */
  | "ministry_parent"
  /** @deprecated Migrated to org_user + org_role. */
  | "sub_user";

export type OrgRole = import("./org-roles").OrgRole;

/** Upstream authority for directives and user accounts. */
export type DirectiveAuthorityLevel = import("./directive-authority").DirectiveAuthorityLevel;
export type SocialPlatform = "instagram" | "x" | "telegram" | "linkedin" | "youtube" | "aparat" | "rubika" | "eitaa" | "soroush" | "bale" | "other";
export type SocialPostPlatform = SocialPlatform | "site";
export type ActivityType =
  | "magazine"
  | "newspaper"
  | "tract"
  | "booth"
  | "field"
  | "poetry"
  | "painting"
  | "exhibition"
  | "other";
export type SocialContentType = "image" | "text" | "video" | "carousel" | "story" | "reel" | "audio";
export type SessionRole = AdminRole;

export interface Ministry {
  id: string;
  /** Short display title, e.g. بهداشت و درمان */
  name: string;
  /** Formal organization name */
  fullName?: string | null;
  description?: string | null;
  isActive?: boolean;
  createdAt: string;
  /** Subordinate organizations under this ministry (when loaded). */
  organizations?: MinistryOrganization[];
}

/** Subordinate organization / agency under a ministry. */
export interface MinistryOrganization {
  id: string;
  ministryId: string;
  ministryName?: string | null;
  name: string;
  fullName?: string | null;
  isActive?: boolean;
  createdAt: string;
  /**
   * Device-tree parent (from `devices.parent_id`).
   * Legacy org table is flat under ministry; nesting lives on the device tree.
   */
  parentId?: string | null;
}

/** Unified organizational entity (ministry, org, municipality, …). */
export type DeviceType =
  | "ministry"
  | "organization"
  | "directorate"
  | "company"
  | "governorate"
  | "municipality"
  | "other";

export type DeviceActivityScope = "national" | "provincial" | "city" | "regional";
export type DeviceStatus = "active" | "inactive" | "suspended";

export type DeviceOfficialRole =
  | "primary"
  | "deputy"
  | "pr"
  | "campaign_exec"
  | "supervisor";

export type DeviceStaffGender = "male" | "female";

export type DeviceStaffEducation =
  | "below_diploma"
  | "diploma"
  | "associate"
  | "bachelor"
  | "master"
  | "doctorate"
  | "seminary"
  | "other";

export type DeviceCapacityType =
  | "website"
  | "app"
  | "social"
  | "ad_network"
  | "news_network"
  | "sms_panel"
  | "billboards"
  | "urban_tv"
  | "venues"
  | "creative_team"
  | "field_staff"
  | "call_center"
  | "contractors"
  | "other";

/** Ordered list used by forms, maps, and DB guards. */
export const DEVICE_CAPACITY_TYPES: DeviceCapacityType[] = [
  "website",
  "app",
  "social",
  "ad_network",
  "news_network",
  "sms_panel",
  "billboards",
  "urban_tv",
  "venues",
  "creative_team",
  "field_staff",
  "call_center",
  "contractors",
  "other",
];

export type DeviceReadinessStatus =
  | "ready"
  | "needs_completion"
  | "high_risk"
  | "inactive";

export interface DeviceSocialLinks {
  instagram?: string;
  telegram?: string;
  x?: string;
  linkedin?: string;
  youtube?: string;
  aparat?: string;
  [key: string]: string | undefined;
}

export interface Device {
  id: string;
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  type: DeviceType;
  parentId?: string | null;
  parentName?: string | null;
  province?: string | null;
  city?: string | null;
  activityScope: DeviceActivityScope;
  mission?: string | null;
  address?: string | null;
  phones: string[];
  website?: string | null;
  socialLinks: DeviceSocialLinks;
  status: DeviceStatus;
  isActive: boolean;
  /** Public page URL segment; null means no public page. */
  publicSlug?: string | null;
  /** Whether a page-view password is set (hash never sent to clients). */
  hasPagePassword?: boolean;
  createdAt: string;
  updatedAt: string;
  childrenCount?: number;
  usersCount?: number;
}

export interface DeviceOfficial {
  id: string;
  deviceId: string;
  roleType: DeviceOfficialRole;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  contactNote?: string | null;
  startedAt: string;
  endedAt?: string | null;
  isActive: boolean;
  userId?: string | null;
  createdAt: string;
}

/** Individual staff member registered on a device passport. */
export interface DeviceStaff {
  id: string;
  deviceId: string;
  firstName: string;
  lastName: string;
  mobile: string;
  gender: DeviceStaffGender;
  birthDate?: string | null;
  position: string;
  education: DeviceStaffEducation;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Type-specific structured fields for capacity reporting (JSONB). */
export type CapacityDetailsPayload = Record<string, unknown>;

/** Origin of an auto-synced capacity row (campaign content → device assets). */
export type DeviceCapacitySourceType = "company_website" | "social_platform_stat";

export interface DeviceCapacity {
  id: string;
  deviceId: string;
  capacityType: DeviceCapacityType;
  title: string;
  description?: string | null;
  isActive: boolean;
  ownerName?: string | null;
  coverageScope?: string | null;
  /** Asset location (may differ from device HQ). */
  province?: string | null;
  city?: string | null;
  address?: string | null;
  /** Structured metrics keyed by capacityType. */
  details?: CapacityDetailsPayload;
  /** When set, this capacity was synced from campaign content. */
  sourceType?: DeviceCapacitySourceType | null;
  sourceId?: string | null;
  lastUpdatedAt: string;
  createdAt: string;
}

export interface DeviceDirectiveStats {
  received: number;
  seen: number;
  unseen: number;
  confirmed: number;
  /** Submitted commitment / action plans for received directives. */
  actionPlans: number;
}

export interface DeviceContentStats {
  billboards: number;
  posters: number;
  videos: number;
  socialPosts: number;
  activities: number;
  files: number;
  totalUploads: number;
  score: number;
}

export interface DeviceCampaignHistoryItem {
  campaignId: string;
  campaignTitle: string;
  campaignSlug: string;
  directivesReceived: number;
  directivesSeen: number;
  directivesConfirmed: number;
  actionPlans: number;
  contentUploads: number;
}

export interface DeviceReadiness {
  status: DeviceReadinessStatus;
  score: number;
  reason: string;
  factors: {
    hasPrimaryOfficial: boolean;
    hasDeputyOfficial: boolean;
    hasActiveUsers: boolean;
    profileComplete: boolean;
    hasCapacity: boolean;
    directiveResponseOk: boolean;
    actionPlanOk: boolean;
  };
}

export interface DevicePassport {
  device: Device;
  parent: Device | null;
  /** Ancestor chain from root down to immediate parent (excludes current device). */
  ancestors: Device[];
  children: Device[];
  officials: DeviceOfficial[];
  staff: DeviceStaff[];
  capacities: DeviceCapacity[];
  users: AdminUser[];
  directiveStats: DeviceDirectiveStats;
  contentStats: DeviceContentStats;
  campaignHistory: DeviceCampaignHistoryItem[];
  readiness: DeviceReadiness;
}

export interface CampaignFeatures {
  billboards: boolean;
  posters: boolean;
  videos: boolean;
  analytics: boolean;
  socialAnalytics: boolean;
  socialPosts: boolean;
  sitePublications: boolean;
  broadcastReports: boolean;
  meetings: boolean;
  activities: boolean;
  pressPublications: boolean;
  submissions: boolean;
  files: boolean;
  rawMedia: boolean;
  forms: boolean;
  /** Manual logs of SMS / bulk messages sent to audiences. */
  smsReports: boolean;
}

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "date"
  | "file";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  accept?: string;
}

/** Sections with a configurable content form builder. */
export type ContentFormSectionKey =
  | "billboards"
  | "posters"
  | "videos"
  | "files"
  | "rawMedia"
  | "sitePublications"
  | "socialPosts"
  | "pressPublications"
  | "activities"
  | "broadcast"
  | "meetings";

export type ContentSystemWidget =
  | "image"
  | "title"
  | "description"
  | "planLabels"
  | "notes"
  | "score"
  | "category"
  | "provinceCity"
  | "axis"
  | "areaSqm"
  | "address"
  | "map"
  | "periods"
  | "video"
  | "videoType"
  | "cover"
  | "document"
  | "rawFile"
  | "mediaKind"
  | "link"
  | "publishedDate"
  | "platform"
  | "contentType"
  | "engagement"
  | "media"
  | "activityType"
  | "activityDate"
  | "location"
  | "mediaItems"
  | "isCreative"
  | "pdf"
  | "reportDate"
  | "meetingDate"
  | "audio"
  | "discussionSummary"
  | "attendees"
  | "tasks"
  | "decisions";

export interface ContentFormField {
  id: string;
  /** Stable key: system widget name or custom_* */
  key: string;
  kind: "system" | "custom";
  /** Required when kind is system. */
  widget?: ContentSystemWidget;
  /** Used for custom fields; system fields keep a nominal type. */
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  accept?: string;
}

export interface SectionContentForm {
  sectionKey: ContentFormSectionKey;
  title: string;
  fields: ContentFormField[];
  updatedAt: string;
}

export type CampaignFormStatus = "draft" | "published" | "archived";

export interface CampaignForm {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  fields: FormField[];
  status: CampaignFormStatus;
  sortOrder: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  responseCount?: number;
}

export type CampaignFormResponseStatus = "submitted" | "reviewed";

export interface CampaignFormResponse extends Ownable {
  id: string;
  formId: string;
  campaignId: string;
  answers: Record<string, unknown>;
  status: CampaignFormResponseStatus;
  createdAt: string;
  updatedAt: string;
  formTitle?: string;
}

export type AnalyticsSource = "manual" | "metabase" | "hybrid";
export type AnalyticsChannel = "site" | "social";
export type BillboardSource = "manual" | "api";

export interface MetabaseConfig {
  url: string;
  username: string;
  password: string;
  questionId?: number;
  dashboardId?: number;
  embedSecret?: string;
}

export interface ChannelAnalyticsConfig {
  source: AnalyticsSource;
  metabase?: MetabaseConfig | null;
}

export interface AnalyticsConfig {
  site: ChannelAnalyticsConfig;
  social: ChannelAnalyticsConfig;
}

/** Reserved for future campaign billboard settings. */
export type BillboardConfig = Record<string, unknown>;

export type SmsProviderId = "none" | "kavenegar" | "melipayamak" | "custom";

export interface SmsProviderSettings {
  enabled: boolean;
  provider: SmsProviderId;
  apiKey?: string | null;
  sender?: string | null;
}

export interface SmsProviderSettingsPublic {
  enabled: boolean;
  provider: SmsProviderId;
  sender: string;
  hasApiKey: boolean;
  configured: boolean;
}

/** Configurable copy shown on the admin login screen. */
export interface LoginPageSettings {
  eyebrow: string;
  title: string;
  subtitle: string;
  footer: string;
}

export interface CampaignSettings {
  id: string;
  slug: string;
  title: string;
  /** Short line used under the title and for link previews when sharing. */
  tagline?: string | null;
  description: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  coverImageUrl?: string | null;
  /** Browser tab / bookmark icon; falls back to default site favicon when empty. */
  faviconUrl?: string | null;
  published: boolean;
  features: CampaignFeatures;
  analyticsConfig: AnalyticsConfig;
  billboardConfig: BillboardConfig;
  /** Field-based auto scoring rules per content type. */
  scoringRules?: CampaignScoringRules;
  /** Campaign content plan names configured by admin (e.g. مهتاب، سامان). Legacy flat list. */
  contentPlans?: string[];
  /** Hierarchical topics with optional subtopics (موضوع / زیرموضوع). */
  contentTopics?: import("./content-topics").ContentTopic[];
  /** Public label for admin-owned content groups (no contributor user). */
  adminOwnerLabel?: string | null;
  meetingsViewPasswordHash?: string | null;
  /** Public campaign page password (bcrypt hash). Never expose to clients. */
  pageViewPasswordHash?: string | null;
  updatedAt: string;
}

export interface CampaignListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  coverImageUrl?: string | null;
}

export interface Ownable {
  ownerUserId?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerProvince?: string | null;
  ownerCity?: string | null;
  ownerMinistryId?: string | null;
  ownerMinistryName?: string | null;
  ownerOrganizationId?: string | null;
  ownerOrganizationName?: string | null;
  /** Legacy single topic — prefer planLabels. */
  planLabel?: string | null;
  /** Multiple topic/subtopic tokens (e.g. "مهتاب" or "مهتاب|هفته اول"). */
  planLabels?: string[];
  /** Final score = autoScore + manualScore (public / sort / leaderboard). */
  score?: number | null;
  /** Score computed from campaign scoring rules. */
  autoScore?: number | null;
  /** Manual bonus set by admin/client. */
  manualScore?: number | null;
}

export type ScoreableContentType =
  | "billboard"
  | "poster"
  | "video"
  | "file"
  | "raw_media"
  | "social_post"
  | "site_publication"
  | "activity"
  | "broadcast"
  | "meeting";

export type ScoringRuleKind = "filled" | "equals" | "range";

export interface ScoringRule {
  id: string;
  field: string;
  kind: ScoringRuleKind;
  points: number;
  /** Target value for `equals` rules. */
  value?: string;
  /** Inclusive lower bound for `range` (number or ISO date string). */
  min?: number | string;
  /** Inclusive upper bound for `range` (number or ISO date string). */
  max?: number | string;
}

/** Per content-type scoring rules stored on the campaign. */
export type CampaignScoringRules = Partial<Record<ScoreableContentType, ScoringRule[]>>;

export interface ScoreBreakdownEntry {
  ruleId: string;
  field: string;
  points: number;
  matched: boolean;
}

export interface BillboardDisplayPeriod {
  id: string;
  billboardId: string;
  title?: string | null;
  startDate: string;
  endDate: string;
  billboardImageUrl: string;
  confirmationImageUrl?: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface Billboard extends Ownable {
  id: string;
  campaignId: string;
  title: string;
  description?: string | null;
  province?: string | null;
  city: string;
  location: string;
  date: string;
  thumbnailUrl: string;
  imageUrl?: string | null;
  externalUrl: string;
  latitude?: number | null;
  longitude?: number | null;
  source?: BillboardSource;
  externalId?: string | null;
  category?: string | null;
  areaSqm?: number | null;
  status: ItemStatus;
  tags: string[];
  notes?: string | null;
  /** Custom form-builder field values. */
  metadata?: Record<string, unknown>;
  published: boolean;
  sortOrder: number;
  displayPeriods?: BillboardDisplayPeriod[];
  code?: string | null;
  displayDateRange?: string | null;
  providerName?: string | null;
  qualityTierLabel?: string | null;
  billboardTypeLabel?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaCategory {
  id: string;
  campaignId: string;
  type: MediaCategoryType;
  title: string;
  description?: string | null;
  sortOrder: number;
  published: boolean;
  createdAt: string;
}

export interface Poster extends Ownable {
  id: string;
  campaignId: string;
  categoryId: string;
  title: string;
  description?: string | null;
  published: boolean;
  sortOrder: number;
  planLabel?: string | null;
  /** Custom form-builder field values. */
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PosterVersion {
  id: string;
  posterId: string;
  versionNumber: number;
  imageUrl: string;
  thumbnailUrl: string;
  notes?: string | null;
  status: VersionStatus;
  isFinal: boolean;
  date: string;
  createdAt: string;
}

export interface Video extends Ownable {
  id: string;
  campaignId: string;
  categoryId: string;
  title: string;
  description?: string | null;
  published: boolean;
  sortOrder: number;
  planLabel?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoVersion {
  id: string;
  videoId: string;
  versionNumber: number;
  videoUrl: string;
  thumbnailUrl: string;
  duration?: string | null;
  notes?: string | null;
  status: VersionStatus;
  isFinal: boolean;
  date: string;
  createdAt: string;
}

export interface AnalyticsMetric extends Ownable {
  id: string;
  campaignId: string;
  channel: AnalyticsChannel;
  date: string;
  visitors: number;
  uniqueVisitors: number;
  pageViews: number;
  avgSessionDuration: number;
  source?: TrafficSource | null;
  device?: AnalyticsDeviceType | null;
  page?: string | null;
  city?: string | null;
  createdAt: string;
}

/** Company website listing shown instead of site visitor analytics. */
export interface CompanyWebsite extends Ownable {
  id: string;
  campaignId: string;
  title: string;
  url: string;
  companyName?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignSubmission extends Ownable {
  id: string;
  campaignId: string;
  externalUuid?: string | null;
  submissionType: string;
  participantName: string;
  participantPhone?: string | null;
  participantEmail?: string | null;
  title: string;
  text: string;
  mediaUrl?: string | null;
  status: SubmissionStatus;
  published: boolean;
  /** Admin-provided reason shown to the owner when status is "rejected". */
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFile extends Ownable {
  id: string;
  campaignId: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  published: boolean;
  sortOrder: number;
  planLabel?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RawMediaKind = "image" | "video";

export interface RawMediaUpload extends Ownable {
  id: string;
  campaignId: string;
  title: string;
  description?: string | null;
  mediaKind: RawMediaKind;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  published: boolean;
  sortOrder: number;
  planLabel?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RawMediaStorageSummary {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  fileCount: number;
  percentUsed: number;
}

import type { ContributorPermissions } from "@/lib/contributor-permissions";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  /** Organizational position on the home device (org_user only). */
  orgRole?: OrgRole | null;
  province?: string | null;
  city?: string | null;
  /** Geographic zone set by admin/client: north/south/east/west. */
  region?: import("./user-regions").UserRegion | null;
  /** Mobile phone for SMS (optional until SMS provider is configured). */
  phone?: string | null;
  /** Account manager name set by the user in their profile. */
  accountManagerName?: string | null;
  /** Alternate crisis contact name (from user profile). */
  alternateContactName?: string | null;
  /** Alternate crisis contact phone (from user profile). */
  alternateContactPhone?: string | null;
  /** Government ministry this user belongs to (parent + sub-users). */
  ministryId?: string | null;
  ministryName?: string | null;
  /**
   * Optional subordinate organization under the ministry.
   * Null means the user is attached to the ministry itself.
   */
  organizationId?: string | null;
  organizationName?: string | null;
  /** Unified device assignment (organization preferred over ministry). */
  deviceId?: string | null;
  deviceName?: string | null;
  /** Parent org user for subtree hierarchy. */
  parentUserId?: string | null;
  parentUserName?: string | null;
  /** Upstream authority level for this account. */
  authorityLevel?: DirectiveAuthorityLevel;
  /** Free-text label when authorityLevel is "other". */
  authorityOther?: string | null;
  campaignIds: string[];
  campaignPermissions: Record<string, ContributorPermissions>;
  createdAt: string;
}

export interface UserCapacity {
  id: string;
  userId: string;
  capacityType: DeviceCapacityType;
  title: string;
  description?: string | null;
  isActive: boolean;
  ownerName?: string | null;
  coverageScope?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  details?: CapacityDetailsPayload;
  lastUpdatedAt: string;
  createdAt: string;
}

export type DirectiveBlockerCategory =
  | "budget"
  | "approval_delay"
  | "missing_file"
  | "missing_capacity"
  | "technical"
  | "other";

export interface DirectiveBlocker {
  id: string;
  directiveId: string;
  userId: string;
  userName?: string | null;
  category: DirectiveBlockerCategory;
  note: string;
  createdAt: string;
}

export type BestPracticeStatus = "pending" | "approved" | "rejected";

export interface BestPractice {
  id: string;
  campaignId: string;
  contentType: ScoreableContentType;
  contentId: string;
  title: string;
  suggestedScore?: number | null;
  status: BestPracticeStatus;
  suggestedBy?: string | null;
  suggestedByName?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  createdAt: string;
}

export type DirectiveFunnelStage =
  | "sent"
  | "delivered"
  | "seen"
  | "accepted"
  | "planned"
  | "executed"
  | "verified";

export interface CapacityMapItem {
  source: "device" | "user";
  id: string;
  capacityType: DeviceCapacityType;
  title: string;
  description?: string | null;
  isActive: boolean;
  ownerName?: string | null;
  coverageScope?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  details?: CapacityDetailsPayload;
  /** Resolved location for map filters (asset first, else owner). */
  mapProvince?: string | null;
  mapCity?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
  userId?: string | null;
  userName?: string | null;
  lastUpdatedAt: string;
}

export type DirectivePriority = "normal" | "urgent";
export type DirectiveAudienceType = "all" | "region" | "users" | "ministry_city";
export type DirectiveSmsStatus = "pending" | "sent" | "failed" | "no_phone" | "skipped";

export interface DirectiveAttachment {
  id: string;
  directiveId: string;
  /** Display title for this attachment (required for clarity in broad directives). */
  title: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  createdAt: string;
}

export interface DirectiveRecipient {
  directiveId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: AdminRole;
  userPhone?: string | null;
  alternateContactName?: string | null;
  alternateContactPhone?: string | null;
  accountManagerName?: string | null;
  smsStatus: DirectiveSmsStatus;
  smsError?: string | null;
  smsSentAt?: string | null;
  seenAt?: string | null;
  confirmed: boolean;
  hasActionPlan?: boolean;
  actionPlanId?: string | null;
  executedAt?: string | null;
  executionVerifiedAt?: string | null;
  executionVerifiedBy?: string | null;
  /** Content rows tagged with this directive's topic (when linkContentTopic). */
  contentCreatedCount?: number;
  contentPublishedCount?: number;
}

/** Per-user content production stats under a directive topic. */
export interface DirectiveTopicContentStat {
  userId: string;
  createdCount: number;
  publishedCount: number;
}

/** Device commitment after acknowledging a directive (تعهد و برنامه اقدام). */
export interface DirectiveActionPlan {
  id: string;
  directiveId: string;
  userId: string;
  userName?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
  studiedAcknowledged: boolean;
  isExecutable: boolean;
  notExecutableReason: string;
  plannedActions: string;
  capacityIds: string[];
  capacityTitles: string[];
  capacityNotes: string;
  volumeDescription: string;
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
  scheduleNotes: string;
  executorName: string;
  executorRole: string;
  executorPhone: string;
  obstacles: string;
  supportNeeded: string;
  status: "submitted";
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectiveActionPlanInput {
  studiedAcknowledged: boolean;
  isExecutable: boolean;
  notExecutableReason?: string;
  plannedActions?: string;
  capacityIds?: string[];
  capacityNotes?: string;
  volumeDescription?: string;
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
  scheduleNotes?: string;
  executorName?: string;
  executorRole?: string;
  executorPhone?: string;
  obstacles?: string;
  supportNeeded?: string;
}

export interface CampaignDirective {
  id: string;
  campaignId: string;
  createdByUserId?: string | null;
  createdByName?: string | null;
  title: string;
  body: string;
  priority: DirectivePriority;
  /** Upstream authority that issued this directive. */
  authorityLevel?: DirectiveAuthorityLevel;
  /** Free-text label when authorityLevel is "other". */
  authorityOther?: string | null;
  /** @deprecated Prefer endDate. Kept for older rows. */
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  /** Official letter (PDF or image) for this directive. */
  letterFileUrl?: string | null;
  letterFileName?: string | null;
  letterMimeType?: string | null;
  letterFileSize?: number;
  /** Optional action button: none | external URL | internal panel section. */
  ctaKind?: import("./directive-cta").DirectiveCtaKind;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  ctaTarget?: import("./directive-cta").DirectiveInternalTarget | null;
  audienceType: DirectiveAudienceType;
  audienceRegion?: import("./user-regions").UserRegion | null;
  /** Target ministry when audienceType is ministry_city. */
  audienceMinistryId?: string | null;
  audienceMinistryName?: string | null;
  /**
   * Optional subordinate organization when audienceType is ministry_city.
   * Null means the whole ministry (all orgs under it).
   */
  audienceOrganizationId?: string | null;
  audienceOrganizationName?: string | null;
  /**
   * Target provinces when audienceType is ministry_city.
   * Stored in DB column `audience_cities` (legacy name).
   */
  audienceProvinces?: string[];
  published: boolean;
  publishedAt?: string | null;
  /** Soft-archive timestamp; null means active. */
  archivedAt?: string | null;
  /** Crisis / urgent broadcast mode for this directive. */
  crisisMode?: boolean;
  /** Minutes before escalating unconfirmed crisis recipients. */
  escalationAfterMinutes?: number;
  /** When crisis escalation SMS was last sent (idempotent). */
  escalatedAt?: string | null;
  /** Topic label used for national calendar conflict detection. */
  topic?: string;
  /**
   * When true, `topic` is also ensured as a campaign content topic
   * so recipients can tag produced content for tracking.
   */
  linkContentTopic?: boolean;
  /** normal = classic form; smart = ساخت هوشمند wizard. */
  creationMode?: import("./directive-smart").DirectiveCreationMode;
  missionType?: import("./directive-smart").DirectiveMissionType | null;
  smartPayload?: import("./directive-smart").SmartDirectivePayload | null;
  aiUnderstandingConfirmedAt?: string | null;
  sortOrder: number;
  attachments: DirectiveAttachment[];
  /** Present for managers; optional summary counts. */
  seenCount?: number;
  unseenCount?: number;
  recipientCount?: number;
  /** Present when loading the current user's inbox row. */
  confirmed?: boolean;
  seenAt?: string | null;
  /** Whether the current user submitted a commitment / action plan. */
  hasActionPlan?: boolean;
  /** Managers: count of submitted action plans for this directive. */
  actionPlanCount?: number;
  /** Current user's execution timestamp when loading inbox. */
  executedAt?: string | null;
  /** Current user's execution verification timestamp. */
  executionVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Urgency level for directive operations workspace (separate from priority). */
export type DirectiveUrgency = "low" | "normal" | "high" | "critical";

export type DirectiveWorkspaceAssetCategory =
  | "reference"
  | "ready_text"
  | "print"
  | "video"
  | "social"
  | "brand_guide"
  | "training"
  | "approval";

export type DirectiveAssetEventType = "downloaded" | "published";
export type DirectiveReplacementAlertStatus = "pending" | "acked" | "replaced";

export interface DirectiveWorkspaceKpi {
  id: string;
  title: string;
  target: number;
  unit: string;
}

export interface DirectiveWorkspaceFaqItem {
  id: string;
  question: string;
  answer: string;
}

/** Operations-room metadata for a single directive (دستورکار). */
export interface DirectiveWorkspaceMeta {
  directiveId: string;
  objective: string;
  expectedResults: string;
  urgency: DirectiveUrgency;
  mandatoryActions: string[];
  suggestedActions: string[];
  kpis: DirectiveWorkspaceKpi[];
  brandGuide: string;
  executionGuide: string;
  approvalRequirements: string;
  centralOwnerUserId?: string | null;
  centralOwnerLabel?: string | null;
  centralOwnerName?: string | null;
  faq: DirectiveWorkspaceFaqItem[];
  targetMinistryIds: string[];
  targetOrganizationIds: string[];
  targetProvinces: string[];
  targetCities: string[];
}

export interface DirectiveWorkspaceAssetVersion {
  id: string;
  assetId: string;
  versionNumber: number;
  contentText?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize: number;
  changeNote: string;
  createdByUserId?: string | null;
  createdByName?: string | null;
  isCurrent: boolean;
  createdAt: string;
}

export interface DirectiveWorkspaceAsset {
  id: string;
  directiveId: string;
  category: DirectiveWorkspaceAssetCategory;
  title: string;
  description: string;
  printSize?: string | null;
  sortOrder: number;
  currentVersion: DirectiveWorkspaceAssetVersion | null;
  versions: DirectiveWorkspaceAssetVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface DirectiveReplacementAlert {
  id: string;
  directiveId: string;
  directiveTitle: string;
  campaignId: string;
  assetId: string;
  assetTitle: string;
  assetCategory: DirectiveWorkspaceAssetCategory;
  oldVersionId: string;
  oldVersionNumber: number;
  newVersionId: string;
  newVersionNumber: number;
  userId: string;
  userName?: string | null;
  ministryId?: string | null;
  ministryName?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  status: DirectiveReplacementAlertStatus;
  createdAt: string;
  ackedAt?: string | null;
}

export interface DirectiveWorkspaceBundle {
  directive: CampaignDirective;
  meta: DirectiveWorkspaceMeta;
  assets: DirectiveWorkspaceAsset[];
  pendingAlertCount: number;
}

export interface AuthSession {
  type: "env_admin" | "db_user";
  userId: string | null;
  role: SessionRole;
  /** Loaded from DB for org_user sessions (not stored in cookie). */
  orgRole?: OrgRole | null;
  /** Effective subtree management flags (OR across campaign memberships). */
  manageSubtreeUsers?: boolean;
  manageSubtreeDirectives?: boolean;
  scoreSubtreeContent?: boolean;
  manageSubtreeDevices?: boolean;
  email?: string;
  name?: string;
  /** Bumped on logout so previous cookies become invalid. */
  sessionVersion: number;
}

export interface SocialPlatformStat extends Ownable {
  id: string;
  campaignId: string;
  platform: SocialPlatform;
  /** Optional display name to distinguish multiple channels on the same platform. */
  title?: string | null;
  followers: number;
  posts: number;
  profileUrl?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SocialAnalyticsSummary {
  platforms: SocialPlatformStat[];
  totalFollowers: number;
  totalPosts: number;
  hasData: boolean;
}

/** One published link + views row inside a group social distribution. */
export interface SocialPostLinkEntry {
  id: string;
  link: string;
  views: number;
  /** Optional per-link platform when the same content is posted to multiple networks. */
  platform?: SocialPlatform;
}

export interface SocialMediaPost extends Ownable {
  id: string;
  campaignId: string;
  platform: SocialPostPlatform;
  title: string;
  coverImageUrl?: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  link: string;
  /** When set (group distribution), each entry is a separate published link; `views` is the sum. */
  linkEntries?: SocialPostLinkEntry[];
  contentType: SocialContentType;
  mediaUrl?: string | null;
  description?: string | null;
  publishedDate: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastStatusRow {
  label: string;
  count: number;
  rawLabel?: string;
}

export interface BroadcastCityRow {
  name: string;
  count: number;
  rawName?: string;
}

export interface BroadcastBillboardRow {
  location: string;
  quality: string;
  rawLocation?: string;
  rawQuality?: string;
}

export interface BroadcastReportSummary {
  totalBillboards?: number;
  totalCities?: number;
  temporaryCount?: number;
  clientName?: string;
  reportDateTime?: string;
  notes?: string;
  statusBreakdown?: BroadcastStatusRow[];
  cityBreakdown?: BroadcastCityRow[];
  billboards?: BroadcastBillboardRow[];
  parsedAt?: string;
  parseError?: string;
}

export interface BroadcastReport extends Ownable {
  id: string;
  campaignId: string;
  title: string;
  reportDate: string;
  pdfUrl: string;
  fileName: string;
  summaryData: BroadcastReportSummary;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Manual documentation of an SMS / bulk message send action. */
export interface SmsSendReport extends Ownable {
  id: string;
  campaignId: string;
  title: string;
  sendDate: string;
  recipientCount: number;
  messageBody: string;
  evidenceFileUrl?: string | null;
  evidenceFileName?: string | null;
  evidenceMimeType?: string | null;
  evidenceFileSize?: number;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityMediaItem {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
}

export interface CampaignActivity extends Ownable {
  id: string;
  campaignId: string;
  title: string;
  activityType: ActivityType;
  activityDate: string;
  location: string;
  link?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaItems: ActivityMediaItem[];
  description?: string | null;
  /** Marked as a creative field action for review and filtering. */
  isCreative: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingTask {
  id: string;
  meetingId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingDecision {
  id: string;
  meetingId: string;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMeeting {
  id: string;
  campaignId: string;
  ownerUserId?: string | null;
  ownerName?: string | null;
  ownerProvince?: string | null;
  ownerCity?: string | null;
  title: string;
  meetingDate: string;
  location: string;
  imageUrl?: string | null;
  discussionSummary: string;
  attendees: string[];
  audioUrl?: string | null;
  viewPasswordHash?: string | null;
  published: boolean;
  sortOrder: number;
  planLabel?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingWithTasks extends CampaignMeeting {
  tasks: MeetingTask[];
  decisions: MeetingDecision[];
}

export interface MeetingPublicPreview {
  id: string;
  campaignId: string;
  ownerUserId?: string | null;
  ownerName?: string | null;
  title: string;
  meetingDate: string;
  imageUrl?: string | null;
  summaryPreview: string;
  hasPassword: boolean;
  sortOrder: number;
}

export interface MeetingPublicDetail {
  id: string;
  title: string;
  meetingDate: string;
  location: string;
  imageUrl?: string | null;
  discussionSummary: string;
  attendees: string[];
  audioUrl?: string | null;
  tasks: Pick<MeetingTask, "id" | "title" | "completed" | "sortOrder">[];
  decisions: Pick<MeetingDecision, "id" | "title" | "sortOrder">[];
}

export interface DataOwnerGroup<T> {
  ownerKey: string;
  ownerLabel: string;
  ownerUserId: string | null;
  ownerProvince?: string | null;
  ownerCity?: string | null;
  ownerMinistryId?: string | null;
  ownerMinistryName?: string | null;
  ownerOrganizationId?: string | null;
  ownerOrganizationName?: string | null;
  items: T[];
}

export interface PosterWithVersions extends Poster {
  versions: PosterVersion[];
  category?: MediaCategory;
}

export interface VideoWithVersions extends Video {
  versions: VideoVersion[];
  category?: MediaCategory;
}

export interface CampaignKPIs {
  totalBillboards: number;
  totalPosters: number;
  totalVideos: number;
  totalCompanyWebsites: number;
  totalSocialFollowers: number;
  totalSocialPosts: number;
  totalSocialPostViews: number;
  totalSitePublications: number;
  totalBroadcastReports: number;
  totalMeetings: number;
  totalActivities: number;
  totalPressPublications: number;
  totalParticipants: number;
  totalFiles: number;
}

export interface AnalyticsSummary {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  avgSessionDuration: number;
  trafficSources: { source: string; count: number }[];
  deviceSplit: { device: string; count: number }[];
  topPages: { page: string; views: number }[];
  visitorLocations: { city: string; count: number }[];
  visitsOverTime: { date: string; visitors: number; pageViews: number }[];
  metabaseEmbedUrl?: string | null;
  hasData: boolean;
}

export interface SubmissionSummary {
  totalParticipants: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  rejectedSubmissions: number;
  participationByDate: { date: string; count: number }[];
  hasData: boolean;
}

export interface SectionVisibility {
  billboards: boolean;
  posters: boolean;
  videos: boolean;
  analytics: boolean;
  socialAnalytics: boolean;
  socialPosts: boolean;
  sitePublications: boolean;
  broadcastReports: boolean;
  meetings: boolean;
  activities: boolean;
  pressPublications: boolean;
  submissions: boolean;
  files: boolean;
  rawMedia: boolean;
}

export interface PublicCampaignData {
  settings: CampaignSettings;
  kpis: CampaignKPIs;
  sections: SectionVisibility;
  billboards: Billboard[];
  billboardGroups: DataOwnerGroup<Billboard>[];
  posterCategories: MediaCategory[];
  posters: PosterWithVersions[];
  posterGroups: DataOwnerGroup<PosterWithVersions>[];
  videoCategories: MediaCategory[];
  videos: VideoWithVersions[];
  videoGroups: DataOwnerGroup<VideoWithVersions>[];
  companyWebsites: CompanyWebsite[];
  companyWebsiteGroups: DataOwnerGroup<CompanyWebsite>[];
  socialAnalytics: SocialAnalyticsSummary;
  socialPosts: SocialMediaPost[];
  socialPostGroups: DataOwnerGroup<SocialMediaPost>[];
  sitePublications: SocialMediaPost[];
  sitePublicationGroups: DataOwnerGroup<SocialMediaPost>[];
  broadcastReports: BroadcastReport[];
  broadcastReportGroups: DataOwnerGroup<BroadcastReport>[];
  meetings: MeetingPublicPreview[];
  meetingGroups: DataOwnerGroup<MeetingPublicPreview>[];
  meetingsHasPassword: boolean;
  activities: CampaignActivity[];
  activityGroups: DataOwnerGroup<CampaignActivity>[];
  pressPublications: CampaignActivity[];
  pressPublicationGroups: DataOwnerGroup<CampaignActivity>[];
  submissions: CampaignSubmission[];
  submissionGroups: DataOwnerGroup<CampaignSubmission>[];
  submissionSummary: SubmissionSummary;
  files: CampaignFile[];
  fileGroups: DataOwnerGroup<CampaignFile>[];
  rawMedia: RawMediaUpload[];
  rawMediaGroups: DataOwnerGroup<RawMediaUpload>[];
  rawMediaStorage: RawMediaStorageSummary;
  lastUpdated: string;
}
