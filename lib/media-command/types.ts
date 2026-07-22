import type { MediaPlatformId } from "@/lib/media-command/platforms";

export type MediaAccountStatus =
  | "connected"
  | "needs_reconnect"
  | "token_expired"
  | "access_error"
  | "disabled"
  | "pending_approval";

export type MediaAccountPermission =
  | "view_stats"
  | "create_draft"
  | "publish"
  | "schedule"
  | "manage_comments"
  | "reply"
  | "approve_content"
  | "receive_central"
  | "direct_central_publish";

export type MediaContentStatus =
  | "draft"
  | "pending_review"
  | "needs_revision"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "partial_publish"
  | "publish_error"
  | "cancelled"
  | "expired";

export type MediaPublishMode = "normal" | "central" | "urgent" | "crisis";

export type MediaPublishOrderMode =
  | "direct_central"
  | "local_approval"
  | "publish_pack"
  | "content_mission";

export type MediaPublishOrderStatus =
  | "draft"
  | "sent"
  | "in_progress"
  | "completed"
  | "expired"
  | "cancelled";

export type MediaInteractionStatus =
  | "new"
  | "seen"
  | "assigned"
  | "reviewing"
  | "suggested_reply_ready"
  | "replied"
  | "escalated"
  | "closed"
  | "needs_official_reply"
  | "media_crisis";

export type MediaInteractionKind =
  | "comment"
  | "message"
  | "mention"
  | "feedback";

export type MediaLibraryCategory =
  | "approved_messages"
  | "official_images"
  | "videos"
  | "design_templates"
  | "logos"
  | "citable_stats"
  | "faq"
  | "official_replies"
  | "occasional"
  | "campaign_packs"
  | "past_success"
  | "local_content"
  | "publishable_files";

export interface MediaAccount {
  id: string;
  campaignId: string;
  platform: MediaPlatformId;
  accountName: string;
  organizationName: string;
  avatarUrl: string | null;
  status: MediaAccountStatus;
  lastSyncedAt: string | null;
  lastPublishedAt: string | null;
  recentErrorCount: number;
  allowsCentralPublish: boolean;
  requiresLocalApproval: boolean;
  activePermissions: MediaAccountPermission[];
  ownerUserId: string | null;
  ownerName: string | null;
  accessUserIds: string[];
  accessUserNames: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MediaContentVariant {
  id: string;
  contentId: string;
  platform: MediaPlatformId;
  bodyText: string;
  title: string;
  description: string;
  hashtags: string[];
  link: string | null;
  mediaUrls: string[];
  coverImageUrl: string | null;
  scheduledAt: string | null;
  previewNote: string | null;
}

export interface MediaContentTarget {
  id: string;
  contentId: string;
  accountId: string;
  accountName: string;
  platform: MediaPlatformId;
  status: MediaContentStatus;
  publishedAt: string | null;
  errorMessage: string | null;
  variantId: string | null;
}

export interface MediaContentEvent {
  id: string;
  contentId: string;
  eventType: string;
  actorUserId: string | null;
  actorName: string | null;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface MediaContent {
  id: string;
  campaignId: string;
  internalTitle: string;
  topic: string;
  audience: string;
  mainMessage: string;
  baseText: string;
  mediaUrls: string[];
  videoUrl: string | null;
  attachmentUrls: string[];
  link: string | null;
  hashtags: string[];
  callToAction: string;
  sensitivityLevel: "low" | "medium" | "high" | "critical";
  expiresAt: string | null;
  status: MediaContentStatus;
  publishMode: MediaPublishMode;
  directiveId: string | null;
  directiveTitle: string | null;
  ownerUserId: string | null;
  ownerName: string | null;
  approverUserId: string | null;
  approverName: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  variants: MediaContentVariant[];
  targets: MediaContentTarget[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaPublishOrder {
  id: string;
  campaignId: string;
  title: string;
  objective: string;
  mainMessage: string;
  approvedContent: string;
  directiveId: string | null;
  directiveTitle: string | null;
  mode: MediaPublishOrderMode;
  status: MediaPublishOrderStatus;
  priority: "low" | "normal" | "high" | "urgent";
  sensitivityLevel: "low" | "medium" | "high" | "critical";
  targetPlatforms: MediaPlatformId[];
  targetAccountIds: string[];
  targetProvinces: string[];
  publishAt: string | null;
  deadlineAt: string | null;
  allowsLocalization: boolean;
  requiresLocalApproval: boolean;
  expectedEvidence: string;
  referenceUrls: string[];
  suggestedVariants: Record<string, string>;
  ownerUserId: string | null;
  ownerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaInteraction {
  id: string;
  campaignId: string;
  accountId: string | null;
  accountName: string | null;
  platform: MediaPlatformId;
  kind: MediaInteractionKind;
  authorName: string;
  body: string;
  relatedContentId: string | null;
  relatedContentTitle: string | null;
  status: MediaInteractionStatus;
  importance: "low" | "normal" | "high" | "urgent";
  topicTag: string | null;
  sentiment: "positive" | "neutral" | "negative" | "mixed" | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
  suggestedReply: string | null;
  finalReply: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaLibraryItem {
  id: string;
  campaignId: string;
  title: string;
  category: MediaLibraryCategory;
  versionLabel: string;
  fileUrl: string | null;
  bodyText: string;
  validUntil: string | null;
  accessLevel: "public" | "campaign" | "restricted";
  canEdit: boolean;
  canPublish: boolean;
  suitablePlatforms: MediaPlatformId[];
  ownerUserId: string | null;
  ownerName: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaDashboardSummary {
  connectedAccounts: number;
  brokenAccounts: number;
  publishedContents: number;
  scheduledContents: number;
  pendingApproval: number;
  newOrders: number;
  unansweredInteractions: number;
  publishErrors: number;
  missionCompletionRate: number;
}

export interface MediaTodayTask {
  id: string;
  kind:
    | "pending_approval"
    | "urgent_order"
    | "unanswered_comment"
    | "scheduled_today"
    | "reconnect_account"
    | "smart_suggestion"
    | "mission_deadline";
  title: string;
  description: string;
  href: string;
  urgency: "low" | "normal" | "high";
}

export interface MediaSmartSuggestion {
  id: string;
  title: string;
  reason: string;
  relatedCampaignOrDirective: string;
  actionLabel: string;
  actionHref: string;
  deadlineAt: string | null;
}

export interface MediaCommandBundle {
  summary: MediaDashboardSummary;
  todayTasks: MediaTodayTask[];
  suggestions: MediaSmartSuggestion[];
  accounts: MediaAccount[];
  contents: MediaContent[];
  orders: MediaPublishOrder[];
  interactions: MediaInteraction[];
  library: MediaLibraryItem[];
  recentEvents: MediaContentEvent[];
}
