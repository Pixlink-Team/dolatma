/** Domain types for media monitoring & rapid response module. */

export type KeywordType =
  | "organization"
  | "manager"
  | "project"
  | "service"
  | "sensitive_topic"
  | "hashtag"
  | "location"
  | "custom";

export type MediaSourceType =
  | "news_agency"
  | "website"
  | "newspaper"
  | "instagram_page"
  | "telegram_channel"
  | "x_account"
  | "influencer"
  | "journalist"
  | "official_account"
  | "other";

export type IngestionType = "manual" | "automatic";

export type Sentiment = "positive" | "neutral" | "negative" | "mixed";

export type MonitoredItemStatus =
  | "new"
  | "under_review"
  | "verified"
  | "irrelevant"
  | "duplicate"
  | "monitoring"
  | "converted_to_case"
  | "archived"
  | "closed";

export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_more_information";

export type UrgencyLevel = "low" | "normal" | "high" | "critical" | "immediate";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type TrendType = "emerging" | "growing" | "stable" | "declining" | "viral";

export type TrendStatus =
  | "active"
  | "under_review"
  | "converted_to_case"
  | "archived"
  | "closed";

export type CaseCreatedByType =
  | "monitoring_team"
  | "automatic_system"
  | "organization"
  | "central_command";

export type CaseStatus =
  | "draft"
  | "awaiting_review"
  | "open"
  | "assigned"
  | "action_required"
  | "content_in_production"
  | "awaiting_approval"
  | "publishing"
  | "impact_monitoring"
  | "resolved"
  | "closed"
  | "rejected"
  | "overdue";

export type ResponseType =
  | "official_response"
  | "clarification"
  | "denial"
  | "expert_explanation"
  | "visual_content"
  | "video_content"
  | "interview"
  | "viral_distribution"
  | "legal_response"
  | "monitor_only"
  | "combined";

export type ActionType =
  | "research"
  | "prepare_response"
  | "create_text"
  | "create_image"
  | "create_video"
  | "official_statement"
  | "publish"
  | "republish"
  | "influencer_distribution"
  | "media_outreach"
  | "legal_review"
  | "management_approval"
  | "monitor_result"
  | "other";

export type ActionStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "awaiting_approval"
  | "completed"
  | "rejected"
  | "overdue"
  | "cancelled";

export type NotificationChannel = "in_app" | "sms" | "email" | "push";

export type NotificationDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "read"
  | "skipped";

export type ArchiveType =
  | "negative_news"
  | "trend"
  | "rapid_response_case"
  | "lesson"
  | "source_profile";

export type MonitoringRole =
  | "super_admin"
  | "central_command_manager"
  | "monitoring_manager"
  | "monitoring_operator"
  | "organization_manager"
  | "public_relations_manager"
  | "shift_officer"
  | "content_manager"
  | "analyst"
  | "viewer";

export type OrganizationType =
  | "ministry"
  | "organization"
  | "agency"
  | "provincial"
  | "municipal"
  | "other";

export interface MonitoringOrganization {
  id: string;
  name: string;
  shortName: string;
  logo: string | null;
  parentOrganizationId: string | null;
  organizationType: OrganizationType;
  ministryId: string | null;
  provinceId: string | null;
  cityId: string | null;
  importanceScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringKeyword {
  id: string;
  organizationId: string;
  keyword: string;
  keywordType: KeywordType;
  isNegativeSensitive: boolean;
  priority: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaSource {
  id: string;
  name: string;
  sourceType: MediaSourceType;
  platform: string;
  url: string | null;
  username: string | null;
  profileImage: string | null;
  followerCount: number;
  credibilityScore: number;
  influenceScore: number;
  provinceId: string | null;
  cityId: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoredItem {
  id: string;
  organizationId: string;
  sourceId: string | null;
  campaignId: string | null;
  directiveId: string | null;
  title: string;
  summary: string;
  fullText: string;
  sourceUrl: string | null;
  thumbnail: string | null;
  platform: string;
  publishedAt: string | null;
  detectedAt: string;
  ingestionType: IngestionType;
  externalId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  sentiment: Sentiment;
  relevanceScore: number;
  negativityScore: number;
  riskScore: number;
  urgencyLevel: UrgencyLevel;
  status: MonitoredItemStatus;
  reviewStatus: ReviewStatus;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  repostCount: number;
  engagementCount: number;
  growthRate: number;
  geographicScope: string | null;
  provinceId: string | null;
  cityId: string | null;
  firstDetectedBy: string | null;
  assignedReviewerId: string | null;
  relatedCampaignId: string | null;
  relatedInstructionId: string | null;
  duplicateOfId: string | null;
  matchedKeyword: string | null;
  expertNotes: string | null;
  aiAnalysisJson: Record<string, unknown> | null;
  suggestedResponseType: ResponseType | null;
  responseDeadlineHours: number | null;
  createdAt: string;
  updatedAt: string;
  /** Joined fields */
  organizationName?: string;
  sourceName?: string;
}

export interface Trend {
  id: string;
  organizationId: string;
  campaignId: string | null;
  title: string;
  description: string;
  keywords: string[];
  hashtags: string[];
  sentiment: Sentiment;
  trendType: TrendType;
  growthPercentage: number;
  mentionCount: number;
  estimatedReach: number;
  riskScore: number;
  startedAt: string | null;
  peakAt: string | null;
  status: TrendStatus;
  relatedMonitoredItemIds: string[];
  relatedCampaignId: string | null;
  sparkline: number[];
  createdAt: string;
  updatedAt: string;
  organizationName?: string;
}

export interface RapidResponseCase {
  id: string;
  caseNumber: string;
  organizationId: string;
  monitoredItemId: string | null;
  campaignId: string | null;
  directiveId: string | null;
  title: string;
  description: string;
  sourceType: string;
  createdByType: CaseCreatedByType;
  caseStatus: CaseStatus;
  riskLevel: RiskLevel;
  urgencyLevel: UrgencyLevel;
  responseType: ResponseType;
  deadline: string | null;
  responseDeadlineHours: number | null;
  assignedOrganizationId: string | null;
  assignedManagerId: string | null;
  assignedPublicRelationsManagerId: string | null;
  assignedShiftOfficerId: string | null;
  supervisingCenterId: string | null;
  commandText: string | null;
  requiredActions: string[];
  expectedOutput: string | null;
  publishChannels: string[];
  republishOrganizations: string[];
  aiSummary: string | null;
  aiRecommendation: string | null;
  aiAnalysisJson: Record<string, unknown> | null;
  negativeReach: number;
  responseReach: number;
  coverageRatio: number;
  effectivenessScore: number | null;
  sentimentBefore: Sentiment | null;
  sentimentAfter: Sentiment | null;
  openedAt: string | null;
  firstActionAt: string | null;
  firstPublishAt: string | null;
  peakGrowthAt: string | null;
  narrativeControlledAt: string | null;
  alertSentAt: string | null;
  closedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  organizationName?: string;
  assignedManagerName?: string;
}

export interface ResponseAction {
  id: string;
  rapidResponseCaseId: string;
  title: string;
  description: string;
  actionType: ActionType;
  assignedOrganizationId: string | null;
  assignedUserId: string | null;
  status: ActionStatus;
  priority: number;
  deadline: string | null;
  startedAt: string | null;
  completedAt: string | null;
  resultDescription: string | null;
  proofUrl: string | null;
  contentId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUserName?: string;
}

/** Action row enriched with parent case context (manager / reis overview). */
export interface ActiveResponseAction extends ResponseAction {
  caseTitle: string;
  caseNumber: string;
  commandText: string | null;
  caseStatus: CaseStatus;
  caseRiskLevel: RiskLevel;
  caseUrgencyLevel: UrgencyLevel;
  organizationName?: string;
}

export interface RapidResponseCaseWithActions extends RapidResponseCase {
  actions: ResponseAction[];
}

export interface ReisMonitoringOverview {
  stats: MonitoringDashboardData["stats"];
  urgentAlerts: MonitoringDashboardData["urgentAlerts"];
  activeActions: ActiveResponseAction[];
  openCases: RapidResponseCaseWithActions[];
}

export interface CaseMetricSnapshot {
  id: string;
  rapidResponseCaseId: string;
  recordedAt: string;
  negativeViews: number;
  negativeReach: number;
  negativeMentions: number;
  negativeShares: number;
  responseViews: number;
  responseReach: number;
  responseMentions: number;
  responseShares: number;
  negativeSentimentPercentage: number;
  positiveSentimentPercentage: number;
  officialNarrativeShare: number;
  growthRate: number;
  platformMetricsJson: Record<string, unknown>;
}

export interface MonitoringNotification {
  id: string;
  userId: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  organizationId: string | null;
  rapidResponseCaseId: string | null;
  monitoredItemId: string | null;
  notificationType: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  status: NotificationDeliveryStatus;
  priority: UrgencyLevel;
  sentAt: string | null;
  readAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface MonitoringArchive {
  id: string;
  organizationId: string;
  monitoredItemId: string | null;
  trendId: string | null;
  rapidResponseCaseId: string | null;
  archiveType: ArchiveType;
  topic: string;
  subTopic: string | null;
  finalClassification: string | null;
  finalRiskScore: number | null;
  finalSentiment: Sentiment | null;
  responseSummary: string | null;
  finalResult: string | null;
  lessonsLearned: string | null;
  aiAnalysis: string | null;
  tags: string[];
  archivedAt: string;
  archivedBy: string | null;
  organizationName?: string;
  title?: string;
}

export interface CaseAuditEvent {
  id: string;
  rapidResponseCaseId: string | null;
  monitoredItemId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  eventType: string;
  summary: string;
  metadataJson: Record<string, unknown>;
  createdAt: string;
}

export interface CaseContentAsset {
  id: string;
  rapidResponseCaseId: string;
  title: string;
  contentType: string;
  bodyText: string;
  fileUrl: string | null;
  productionStatus: string;
  approvalStatus: string;
  createdBy: string | null;
  approvedBy: string | null;
  versionLabel: string;
  publishUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CasePublication {
  id: string;
  rapidResponseCaseId: string;
  channel: string;
  accountName: string;
  url: string | null;
  publishedAt: string | null;
  viewCount: number;
  engagementCount: number;
  status: string;
  publishingOrganization: string | null;
  createdAt: string;
}

export interface CampaignMonitoringSettings {
  id: string;
  campaignId: string;
  keywords: string[];
  hashtags: string[];
  slogans: string[];
  spokespersonNames: string[];
  organizationNames: string[];
  targetPlatforms: string[];
  targetProvinces: string[];
  targetAudience: string | null;
  competitorNarratives: string[];
  negativeKeywords: string[];
  startDate: string | null;
  endDate: string | null;
  baselinePeriodDays: number;
  monitoringStatus: "draft" | "active" | "paused" | "completed";
  updatedAt: string;
}

export interface DirectiveMonitoringSettings {
  id: string;
  directiveId: string;
  monitoringKind: "campaign" | "crisis" | "event" | "policy" | "announcement" | "other";
  keywords: string[];
  negativeKeywords: string[];
  targetPlatforms: string[];
  monitoringStatus: "draft" | "active" | "paused" | "completed";
  updatedAt: string;
}

export interface RiskScoringWeights {
  viewCount: number;
  growthRate: number;
  shareCount: number;
  engagementRate: number;
  sourceInfluenceScore: number;
  sourceCredibilityScore: number;
  negativityScore: number;
  topicSensitivity: number;
  geographicSpread: number;
  numberOfPlatforms: number;
  numberOfInfluentialAccounts: number;
  organizationImportance: number;
  viralityProbability: number;
}

export interface MonitoringSystemSettings {
  riskWeights: RiskScoringWeights;
  alertThresholds: {
    medium: number;
    high: number;
    critical: number;
  };
  escalationMatrix: Record<UrgencyLevel, string[]>;
  smsRecipients: Array<{ name: string; phone: string; role: string }>;
  providerId: "mock" | "manual" | "daytac";
  aiEnabled: boolean;
  pollingIntervalMinutes: number;
  duplicateWindowHours: number;
  scheduleCron: string;
}

export interface RiskScoreResult {
  riskScore: number;
  riskLevel: RiskLevel;
  riskReasons: string[];
  suggestedUrgency: UrgencyLevel;
  suggestedResponseDeadlineHours: number;
}

export interface EffectivenessScoreResult {
  effectivenessScore: number;
  coverageRatio: number;
  effectivenessLevel: "poor" | "fair" | "good" | "excellent";
  successFactors: string[];
  weaknesses: string[];
  aiFinalAssessment: string;
}

export interface AiMonitoredItemAnalysis {
  summary: string;
  whyImportant: string;
  riskLevel: RiskLevel;
  viralityProbability: number;
  involvedAudiences: string[];
  recommendedResponseType: ResponseType;
  keyMessages: string[];
  recommendedContentFormats: string[];
  recommendedChannels: string[];
  recommendedSpokespeople: string[];
  immediateActions: string[];
  responseRisks: string[];
  noResponseRisks: string[];
  suggestedDeadlineHours: number;
  recommendedActions: Array<{
    title: string;
    actionType: ActionType;
    priority: number;
  }>;
}

export interface MonitoringDashboardData {
  stats: {
    newNegativeItems: number;
    pendingReview: number;
    openCases: number;
    criticalCases: number;
    nearDeadlineCases: number;
    overdueCases: number;
    activeTrends: number;
    avgFirstResponseHours: number | null;
    avgEffectiveness: number | null;
  };
  urgentAlerts: Array<{
    caseId: string;
    itemId: string | null;
    title: string;
    organizationName: string;
    sourceName: string;
    riskLevel: RiskLevel;
    urgencyLevel: UrgencyLevel;
    deadline: string | null;
    remainingMinutes: number | null;
    viewCount: number;
    growthRate: number;
    assigneeName: string | null;
  }>;
  growingNegativeItems: MonitoredItem[];
  trends: Trend[];
  caseStatusCounts: Record<string, number>;
  comparisonSeries: Array<{
    recordedAt: string;
    negativeReach: number;
    responseReach: number;
  }>;
}

export interface OrganizationMediaIntelligence {
  organization: MonitoringOrganization;
  negativeToday: number;
  unansweredItems: number;
  activeTrends: number;
  openCases: number;
  overdueCases: number;
  avgResponseHours: number | null;
  avgEffectiveness: number | null;
  topTopics: Array<{ topic: string; count: number }>;
  activeSources: Array<{ name: string; count: number; platform: string }>;
  platformBreakdown: Array<{ platform: string; count: number }>;
  sentimentSeries: Array<{ label: string; positive: number; neutral: number; negative: number }>;
  monthlyNegative: Array<{ month: string; count: number }>;
  riskTrend: Array<{ label: string; avgRisk: number }>;
  recentItems: MonitoredItem[];
  recentCases: RapidResponseCase[];
  archives: MonitoringArchive[];
}

export interface CampaignMonitoringBundle {
  settings: CampaignMonitoringSettings;
  before: {
    conversationVolume: number;
    baselineSentiment: Sentiment;
    sensitiveTopics: string[];
    existingNarratives: string[];
    awarenessScore: number;
  };
  during: {
    reach: number;
    mentions: number;
    engagement: number;
    sentiment: Sentiment;
    topHashtags: Array<{ tag: string; count: number }>;
    topSources: Array<{ name: string; count: number }>;
    topProvinces: Array<{ name: string; count: number }>;
    negativeNews: MonitoredItem[];
    alerts: number;
  };
  after: {
    sentimentChange: number;
    volumeChange: number;
    kpiAchievement: number;
    bestContent: string | null;
    bestChannel: string | null;
    bestOrganization: string | null;
    weaknesses: string[];
    aiAnalysis: string;
    nextCampaignSuggestions: string[];
  };
}
