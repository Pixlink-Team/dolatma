import { getSql } from "@/lib/db/client";
import { generateId } from "@/lib/utils";
import { DEFAULT_MONITORING_SETTINGS } from "@/lib/monitoring/defaults";
import type {
  CampaignMonitoringSettings,
  CaseAuditEvent,
  CaseContentAsset,
  CaseMetricSnapshot,
  CasePublication,
  CaseStatus,
  DirectiveMonitoringSettings,
  MediaSource,
  MonitoredItem,
  MonitoringArchive,
  MonitoringDashboardData,
  MonitoringKeyword,
  MonitoringNotification,
  MonitoringOrganization,
  MonitoringSystemSettings,
  RapidResponseCase,
  ResponseAction,
  Trend,
} from "@/lib/monitoring/types";

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item) || 0);
}

/** Serialize unknown values for postgres `sql.json()` typing. */
function toJsonParam(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

let schemaReady = false;

export async function ensureMonitoringSchema(): Promise<void> {
  if (schemaReady) return;
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS monitoring_organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      short_name TEXT NOT NULL DEFAULT '',
      logo TEXT,
      parent_organization_id UUID,
      organization_type TEXT NOT NULL DEFAULT 'organization',
      ministry_id UUID,
      province_id TEXT,
      city_id TEXT,
      importance_score NUMERIC(5,2) NOT NULL DEFAULT 50,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS monitoring_keywords (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES monitoring_organizations(id) ON DELETE CASCADE,
      keyword TEXT NOT NULL,
      keyword_type TEXT NOT NULL DEFAULT 'custom',
      is_negative_sensitive BOOLEAN NOT NULL DEFAULT false,
      priority INT NOT NULL DEFAULT 50,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS media_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'other',
      platform TEXT NOT NULL DEFAULT 'other',
      url TEXT,
      username TEXT,
      profile_image TEXT,
      follower_count INT NOT NULL DEFAULT 0,
      credibility_score NUMERIC(5,2) NOT NULL DEFAULT 50,
      influence_score NUMERIC(5,2) NOT NULL DEFAULT 50,
      province_id TEXT,
      city_id TEXT,
      is_verified BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS monitored_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES monitoring_organizations(id) ON DELETE CASCADE,
      source_id UUID REFERENCES media_sources(id) ON DELETE SET NULL,
      campaign_id UUID,
      directive_id UUID,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      full_text TEXT NOT NULL DEFAULT '',
      source_url TEXT,
      thumbnail TEXT,
      platform TEXT NOT NULL DEFAULT 'other',
      published_at TIMESTAMPTZ,
      detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ingestion_type TEXT NOT NULL DEFAULT 'manual',
      external_id TEXT,
      author_name TEXT,
      author_username TEXT,
      sentiment TEXT NOT NULL DEFAULT 'neutral',
      relevance_score NUMERIC(5,2) NOT NULL DEFAULT 0,
      negativity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
      risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
      urgency_level TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'new',
      review_status TEXT NOT NULL DEFAULT 'pending',
      view_count INT NOT NULL DEFAULT 0,
      like_count INT NOT NULL DEFAULT 0,
      comment_count INT NOT NULL DEFAULT 0,
      share_count INT NOT NULL DEFAULT 0,
      repost_count INT NOT NULL DEFAULT 0,
      engagement_count INT NOT NULL DEFAULT 0,
      growth_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
      geographic_scope TEXT,
      province_id TEXT,
      city_id TEXT,
      first_detected_by UUID,
      assigned_reviewer_id UUID,
      related_campaign_id UUID,
      related_instruction_id UUID,
      duplicate_of_id UUID,
      matched_keyword TEXT,
      expert_notes TEXT,
      ai_analysis_json JSONB,
      suggested_response_type TEXT,
      response_deadline_hours INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS monitoring_trends (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES monitoring_organizations(id) ON DELETE CASCADE,
      campaign_id UUID,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
      hashtags JSONB NOT NULL DEFAULT '[]'::jsonb,
      sentiment TEXT NOT NULL DEFAULT 'neutral',
      trend_type TEXT NOT NULL DEFAULT 'emerging',
      growth_percentage NUMERIC(8,2) NOT NULL DEFAULT 0,
      mention_count INT NOT NULL DEFAULT 0,
      estimated_reach INT NOT NULL DEFAULT 0,
      risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
      started_at TIMESTAMPTZ,
      peak_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'active',
      related_monitored_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      related_campaign_id UUID,
      sparkline JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS rapid_response_cases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      case_number TEXT NOT NULL UNIQUE,
      organization_id UUID NOT NULL REFERENCES monitoring_organizations(id) ON DELETE CASCADE,
      monitored_item_id UUID REFERENCES monitored_items(id) ON DELETE SET NULL,
      campaign_id UUID,
      directive_id UUID,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL DEFAULT 'monitoring_team',
      created_by_type TEXT NOT NULL DEFAULT 'monitoring_team',
      case_status TEXT NOT NULL DEFAULT 'draft',
      risk_level TEXT NOT NULL DEFAULT 'medium',
      urgency_level TEXT NOT NULL DEFAULT 'normal',
      response_type TEXT NOT NULL DEFAULT 'clarification',
      deadline TIMESTAMPTZ,
      response_deadline_hours INT,
      assigned_organization_id UUID,
      assigned_manager_id UUID,
      assigned_public_relations_manager_id UUID,
      assigned_shift_officer_id UUID,
      supervising_center_id UUID,
      command_text TEXT,
      required_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
      expected_output TEXT,
      publish_channels JSONB NOT NULL DEFAULT '[]'::jsonb,
      republish_organizations JSONB NOT NULL DEFAULT '[]'::jsonb,
      ai_summary TEXT,
      ai_recommendation TEXT,
      ai_analysis_json JSONB,
      negative_reach INT NOT NULL DEFAULT 0,
      response_reach INT NOT NULL DEFAULT 0,
      coverage_ratio NUMERIC(8,4) NOT NULL DEFAULT 0,
      effectiveness_score NUMERIC(5,2),
      sentiment_before TEXT,
      sentiment_after TEXT,
      opened_at TIMESTAMPTZ,
      first_action_at TIMESTAMPTZ,
      first_publish_at TIMESTAMPTZ,
      peak_growth_at TIMESTAMPTZ,
      narrative_controlled_at TIMESTAMPTZ,
      alert_sent_at TIMESTAMPTZ,
      closed_at TIMESTAMPTZ,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS response_actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rapid_response_case_id UUID NOT NULL REFERENCES rapid_response_cases(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      action_type TEXT NOT NULL DEFAULT 'other',
      assigned_organization_id UUID,
      assigned_user_id UUID,
      status TEXT NOT NULL DEFAULT 'pending',
      priority INT NOT NULL DEFAULT 50,
      deadline TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      result_description TEXT,
      proof_url TEXT,
      content_id UUID,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS case_metric_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rapid_response_case_id UUID NOT NULL REFERENCES rapid_response_cases(id) ON DELETE CASCADE,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      negative_views INT NOT NULL DEFAULT 0,
      negative_reach INT NOT NULL DEFAULT 0,
      negative_mentions INT NOT NULL DEFAULT 0,
      negative_shares INT NOT NULL DEFAULT 0,
      response_views INT NOT NULL DEFAULT 0,
      response_reach INT NOT NULL DEFAULT 0,
      response_mentions INT NOT NULL DEFAULT 0,
      response_shares INT NOT NULL DEFAULT 0,
      negative_sentiment_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
      positive_sentiment_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
      official_narrative_share NUMERIC(5,2) NOT NULL DEFAULT 0,
      growth_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
      platform_metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS monitoring_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      recipient_name TEXT,
      recipient_phone TEXT,
      organization_id UUID,
      rapid_response_case_id UUID,
      monitored_item_id UUID,
      notification_type TEXT NOT NULL DEFAULT 'alert',
      channel TEXT NOT NULL DEFAULT 'in_app',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'normal',
      sent_at TIMESTAMPTZ,
      read_at TIMESTAMPTZ,
      failure_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS monitoring_archives (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES monitoring_organizations(id) ON DELETE CASCADE,
      monitored_item_id UUID,
      trend_id UUID,
      rapid_response_case_id UUID,
      archive_type TEXT NOT NULL DEFAULT 'negative_news',
      topic TEXT NOT NULL DEFAULT '',
      sub_topic TEXT,
      final_classification TEXT,
      final_risk_score NUMERIC(5,2),
      final_sentiment TEXT,
      response_summary TEXT,
      final_result TEXT,
      lessons_learned TEXT,
      ai_analysis TEXT,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      archived_by UUID
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS monitoring_case_audit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rapid_response_case_id UUID,
      monitored_item_id UUID,
      actor_user_id UUID,
      actor_name TEXT,
      event_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS monitoring_case_contents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rapid_response_case_id UUID NOT NULL REFERENCES rapid_response_cases(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'text',
      body_text TEXT NOT NULL DEFAULT '',
      file_url TEXT,
      production_status TEXT NOT NULL DEFAULT 'draft',
      approval_status TEXT NOT NULL DEFAULT 'pending',
      created_by UUID,
      approved_by UUID,
      version_label TEXT NOT NULL DEFAULT '1',
      publish_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS monitoring_case_publications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rapid_response_case_id UUID NOT NULL REFERENCES rapid_response_cases(id) ON DELETE CASCADE,
      channel TEXT NOT NULL DEFAULT 'other',
      account_name TEXT NOT NULL DEFAULT '',
      url TEXT,
      published_at TIMESTAMPTZ,
      view_count INT NOT NULL DEFAULT 0,
      engagement_count INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published',
      publishing_organization TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS campaign_monitoring_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL UNIQUE,
      keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
      hashtags JSONB NOT NULL DEFAULT '[]'::jsonb,
      slogans JSONB NOT NULL DEFAULT '[]'::jsonb,
      spokesperson_names JSONB NOT NULL DEFAULT '[]'::jsonb,
      organization_names JSONB NOT NULL DEFAULT '[]'::jsonb,
      target_platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
      target_provinces JSONB NOT NULL DEFAULT '[]'::jsonb,
      target_audience TEXT,
      competitor_narratives JSONB NOT NULL DEFAULT '[]'::jsonb,
      negative_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      baseline_period_days INT NOT NULL DEFAULT 14,
      monitoring_status TEXT NOT NULL DEFAULT 'draft',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS directive_monitoring_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      directive_id UUID NOT NULL UNIQUE,
      monitoring_kind TEXT NOT NULL DEFAULT 'other',
      keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
      negative_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
      target_platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
      monitoring_status TEXT NOT NULL DEFAULT 'draft',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS monitoring_system_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  schemaReady = true;
}

function mapOrg(row: Record<string, unknown>): MonitoringOrganization {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    shortName: String(row.short_name ?? ""),
    logo: row.logo ? String(row.logo) : null,
    parentOrganizationId: row.parent_organization_id ? String(row.parent_organization_id) : null,
    organizationType: (row.organization_type as MonitoringOrganization["organizationType"]) ?? "organization",
    ministryId: row.ministry_id ? String(row.ministry_id) : null,
    provinceId: row.province_id ? String(row.province_id) : null,
    cityId: row.city_id ? String(row.city_id) : null,
    importanceScore: num(row.importance_score, 50),
    isActive: Boolean(row.is_active),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapKeyword(row: Record<string, unknown>): MonitoringKeyword {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    keyword: String(row.keyword ?? ""),
    keywordType: (row.keyword_type as MonitoringKeyword["keywordType"]) ?? "custom",
    isNegativeSensitive: Boolean(row.is_negative_sensitive),
    priority: num(row.priority, 50),
    isActive: Boolean(row.is_active),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapSource(row: Record<string, unknown>): MediaSource {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    sourceType: (row.source_type as MediaSource["sourceType"]) ?? "other",
    platform: String(row.platform ?? "other"),
    url: row.url ? String(row.url) : null,
    username: row.username ? String(row.username) : null,
    profileImage: row.profile_image ? String(row.profile_image) : null,
    followerCount: num(row.follower_count),
    credibilityScore: num(row.credibility_score, 50),
    influenceScore: num(row.influence_score, 50),
    provinceId: row.province_id ? String(row.province_id) : null,
    cityId: row.city_id ? String(row.city_id) : null,
    isVerified: Boolean(row.is_verified),
    isActive: Boolean(row.is_active),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapItem(row: Record<string, unknown>): MonitoredItem {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    sourceId: row.source_id ? String(row.source_id) : null,
    campaignId: row.campaign_id ? String(row.campaign_id) : null,
    directiveId: row.directive_id ? String(row.directive_id) : null,
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    fullText: String(row.full_text ?? ""),
    sourceUrl: row.source_url ? String(row.source_url) : null,
    thumbnail: row.thumbnail ? String(row.thumbnail) : null,
    platform: String(row.platform ?? "other"),
    publishedAt: toIso(row.published_at),
    detectedAt: toIso(row.detected_at) ?? new Date().toISOString(),
    ingestionType: (row.ingestion_type as MonitoredItem["ingestionType"]) ?? "manual",
    externalId: row.external_id ? String(row.external_id) : null,
    authorName: row.author_name ? String(row.author_name) : null,
    authorUsername: row.author_username ? String(row.author_username) : null,
    sentiment: (row.sentiment as MonitoredItem["sentiment"]) ?? "neutral",
    relevanceScore: num(row.relevance_score),
    negativityScore: num(row.negativity_score),
    riskScore: num(row.risk_score),
    urgencyLevel: (row.urgency_level as MonitoredItem["urgencyLevel"]) ?? "normal",
    status: (row.status as MonitoredItem["status"]) ?? "new",
    reviewStatus: (row.review_status as MonitoredItem["reviewStatus"]) ?? "pending",
    viewCount: num(row.view_count),
    likeCount: num(row.like_count),
    commentCount: num(row.comment_count),
    shareCount: num(row.share_count),
    repostCount: num(row.repost_count),
    engagementCount: num(row.engagement_count),
    growthRate: num(row.growth_rate),
    geographicScope: row.geographic_scope ? String(row.geographic_scope) : null,
    provinceId: row.province_id ? String(row.province_id) : null,
    cityId: row.city_id ? String(row.city_id) : null,
    firstDetectedBy: row.first_detected_by ? String(row.first_detected_by) : null,
    assignedReviewerId: row.assigned_reviewer_id ? String(row.assigned_reviewer_id) : null,
    relatedCampaignId: row.related_campaign_id ? String(row.related_campaign_id) : null,
    relatedInstructionId: row.related_instruction_id ? String(row.related_instruction_id) : null,
    duplicateOfId: row.duplicate_of_id ? String(row.duplicate_of_id) : null,
    matchedKeyword: row.matched_keyword ? String(row.matched_keyword) : null,
    expertNotes: row.expert_notes ? String(row.expert_notes) : null,
    aiAnalysisJson: row.ai_analysis_json ? asObject(row.ai_analysis_json) : null,
    suggestedResponseType: (row.suggested_response_type as MonitoredItem["suggestedResponseType"]) ?? null,
    responseDeadlineHours: row.response_deadline_hours != null ? num(row.response_deadline_hours) : null,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
    organizationName: row.organization_name ? String(row.organization_name) : undefined,
    sourceName: row.source_name ? String(row.source_name) : undefined,
  };
}

function mapTrend(row: Record<string, unknown>): Trend {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    campaignId: row.campaign_id ? String(row.campaign_id) : null,
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    keywords: asStringArray(row.keywords),
    hashtags: asStringArray(row.hashtags),
    sentiment: (row.sentiment as Trend["sentiment"]) ?? "neutral",
    trendType: (row.trend_type as Trend["trendType"]) ?? "emerging",
    growthPercentage: num(row.growth_percentage),
    mentionCount: num(row.mention_count),
    estimatedReach: num(row.estimated_reach),
    riskScore: num(row.risk_score),
    startedAt: toIso(row.started_at),
    peakAt: toIso(row.peak_at),
    status: (row.status as Trend["status"]) ?? "active",
    relatedMonitoredItemIds: asStringArray(row.related_monitored_item_ids),
    relatedCampaignId: row.related_campaign_id ? String(row.related_campaign_id) : null,
    sparkline: asNumberArray(row.sparkline),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
    organizationName: row.organization_name ? String(row.organization_name) : undefined,
  };
}

function mapCase(row: Record<string, unknown>): RapidResponseCase {
  return {
    id: String(row.id),
    caseNumber: String(row.case_number ?? ""),
    organizationId: String(row.organization_id),
    monitoredItemId: row.monitored_item_id ? String(row.monitored_item_id) : null,
    campaignId: row.campaign_id ? String(row.campaign_id) : null,
    directiveId: row.directive_id ? String(row.directive_id) : null,
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    sourceType: String(row.source_type ?? "monitoring_team"),
    createdByType: (row.created_by_type as RapidResponseCase["createdByType"]) ?? "monitoring_team",
    caseStatus: (row.case_status as CaseStatus) ?? "draft",
    riskLevel: (row.risk_level as RapidResponseCase["riskLevel"]) ?? "medium",
    urgencyLevel: (row.urgency_level as RapidResponseCase["urgencyLevel"]) ?? "normal",
    responseType: (row.response_type as RapidResponseCase["responseType"]) ?? "clarification",
    deadline: toIso(row.deadline),
    responseDeadlineHours: row.response_deadline_hours != null ? num(row.response_deadline_hours) : null,
    assignedOrganizationId: row.assigned_organization_id ? String(row.assigned_organization_id) : null,
    assignedManagerId: row.assigned_manager_id ? String(row.assigned_manager_id) : null,
    assignedPublicRelationsManagerId: row.assigned_public_relations_manager_id
      ? String(row.assigned_public_relations_manager_id)
      : null,
    assignedShiftOfficerId: row.assigned_shift_officer_id ? String(row.assigned_shift_officer_id) : null,
    supervisingCenterId: row.supervising_center_id ? String(row.supervising_center_id) : null,
    commandText: row.command_text ? String(row.command_text) : null,
    requiredActions: asStringArray(row.required_actions),
    expectedOutput: row.expected_output ? String(row.expected_output) : null,
    publishChannels: asStringArray(row.publish_channels),
    republishOrganizations: asStringArray(row.republish_organizations),
    aiSummary: row.ai_summary ? String(row.ai_summary) : null,
    aiRecommendation: row.ai_recommendation ? String(row.ai_recommendation) : null,
    aiAnalysisJson: row.ai_analysis_json ? asObject(row.ai_analysis_json) : null,
    negativeReach: num(row.negative_reach),
    responseReach: num(row.response_reach),
    coverageRatio: num(row.coverage_ratio),
    effectivenessScore: row.effectiveness_score != null ? num(row.effectiveness_score) : null,
    sentimentBefore: (row.sentiment_before as RapidResponseCase["sentimentBefore"]) ?? null,
    sentimentAfter: (row.sentiment_after as RapidResponseCase["sentimentAfter"]) ?? null,
    openedAt: toIso(row.opened_at),
    firstActionAt: toIso(row.first_action_at),
    firstPublishAt: toIso(row.first_publish_at),
    peakGrowthAt: toIso(row.peak_growth_at),
    narrativeControlledAt: toIso(row.narrative_controlled_at),
    alertSentAt: toIso(row.alert_sent_at),
    closedAt: toIso(row.closed_at),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
    organizationName: row.organization_name ? String(row.organization_name) : undefined,
    assignedManagerName: row.assigned_manager_name ? String(row.assigned_manager_name) : undefined,
  };
}

function mapAction(row: Record<string, unknown>): ResponseAction {
  return {
    id: String(row.id),
    rapidResponseCaseId: String(row.rapid_response_case_id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    actionType: (row.action_type as ResponseAction["actionType"]) ?? "other",
    assignedOrganizationId: row.assigned_organization_id ? String(row.assigned_organization_id) : null,
    assignedUserId: row.assigned_user_id ? String(row.assigned_user_id) : null,
    status: (row.status as ResponseAction["status"]) ?? "pending",
    priority: num(row.priority, 50),
    deadline: toIso(row.deadline),
    startedAt: toIso(row.started_at),
    completedAt: toIso(row.completed_at),
    resultDescription: row.result_description ? String(row.result_description) : null,
    proofUrl: row.proof_url ? String(row.proof_url) : null,
    contentId: row.content_id ? String(row.content_id) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
    assignedUserName: row.assigned_user_name ? String(row.assigned_user_name) : undefined,
  };
}

function mapSnapshot(row: Record<string, unknown>): CaseMetricSnapshot {
  return {
    id: String(row.id),
    rapidResponseCaseId: String(row.rapid_response_case_id),
    recordedAt: toIso(row.recorded_at) ?? new Date().toISOString(),
    negativeViews: num(row.negative_views),
    negativeReach: num(row.negative_reach),
    negativeMentions: num(row.negative_mentions),
    negativeShares: num(row.negative_shares),
    responseViews: num(row.response_views),
    responseReach: num(row.response_reach),
    responseMentions: num(row.response_mentions),
    responseShares: num(row.response_shares),
    negativeSentimentPercentage: num(row.negative_sentiment_percentage),
    positiveSentimentPercentage: num(row.positive_sentiment_percentage),
    officialNarrativeShare: num(row.official_narrative_share),
    growthRate: num(row.growth_rate),
    platformMetricsJson: asObject(row.platform_metrics_json),
  };
}

function mapNotification(row: Record<string, unknown>): MonitoringNotification {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    recipientName: row.recipient_name ? String(row.recipient_name) : null,
    recipientPhone: row.recipient_phone ? String(row.recipient_phone) : null,
    organizationId: row.organization_id ? String(row.organization_id) : null,
    rapidResponseCaseId: row.rapid_response_case_id ? String(row.rapid_response_case_id) : null,
    monitoredItemId: row.monitored_item_id ? String(row.monitored_item_id) : null,
    notificationType: String(row.notification_type ?? "alert"),
    channel: (row.channel as MonitoringNotification["channel"]) ?? "in_app",
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    status: (row.status as MonitoringNotification["status"]) ?? "pending",
    priority: (row.priority as MonitoringNotification["priority"]) ?? "normal",
    sentAt: toIso(row.sent_at),
    readAt: toIso(row.read_at),
    failureReason: row.failure_reason ? String(row.failure_reason) : null,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  };
}

function mapArchive(row: Record<string, unknown>): MonitoringArchive {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    monitoredItemId: row.monitored_item_id ? String(row.monitored_item_id) : null,
    trendId: row.trend_id ? String(row.trend_id) : null,
    rapidResponseCaseId: row.rapid_response_case_id ? String(row.rapid_response_case_id) : null,
    archiveType: (row.archive_type as MonitoringArchive["archiveType"]) ?? "negative_news",
    topic: String(row.topic ?? ""),
    subTopic: row.sub_topic ? String(row.sub_topic) : null,
    finalClassification: row.final_classification ? String(row.final_classification) : null,
    finalRiskScore: row.final_risk_score != null ? num(row.final_risk_score) : null,
    finalSentiment: (row.final_sentiment as MonitoringArchive["finalSentiment"]) ?? null,
    responseSummary: row.response_summary ? String(row.response_summary) : null,
    finalResult: row.final_result ? String(row.final_result) : null,
    lessonsLearned: row.lessons_learned ? String(row.lessons_learned) : null,
    aiAnalysis: row.ai_analysis ? String(row.ai_analysis) : null,
    tags: asStringArray(row.tags),
    archivedAt: toIso(row.archived_at) ?? new Date().toISOString(),
    archivedBy: row.archived_by ? String(row.archived_by) : null,
    organizationName: row.organization_name ? String(row.organization_name) : undefined,
    title: row.title ? String(row.title) : undefined,
  };
}

function mapAudit(row: Record<string, unknown>): CaseAuditEvent {
  return {
    id: String(row.id),
    rapidResponseCaseId: row.rapid_response_case_id ? String(row.rapid_response_case_id) : null,
    monitoredItemId: row.monitored_item_id ? String(row.monitored_item_id) : null,
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    actorName: row.actor_name ? String(row.actor_name) : null,
    eventType: String(row.event_type ?? ""),
    summary: String(row.summary ?? ""),
    metadataJson: asObject(row.metadata_json),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  };
}

export async function pgListMonitoringOrganizations(): Promise<MonitoringOrganization[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM monitoring_organizations ORDER BY name ASC`;
  return rows.map((row) => mapOrg(row as Record<string, unknown>));
}

export async function pgGetMonitoringOrganization(id: string): Promise<MonitoringOrganization | null> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM monitoring_organizations WHERE id = ${id} LIMIT 1`;
  return rows[0] ? mapOrg(rows[0] as Record<string, unknown>) : null;
}

export async function pgListMediaSources(): Promise<MediaSource[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM media_sources ORDER BY influence_score DESC`;
  return rows.map((row) => mapSource(row as Record<string, unknown>));
}

export async function pgListKeywords(organizationId?: string): Promise<MonitoringKeyword[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = organizationId
    ? await sql`SELECT * FROM monitoring_keywords WHERE organization_id = ${organizationId} ORDER BY priority DESC`
    : await sql`SELECT * FROM monitoring_keywords ORDER BY priority DESC`;
  return rows.map((row) => mapKeyword(row as Record<string, unknown>));
}

export interface MonitoredItemFilters {
  organizationId?: string;
  sentiment?: string;
  status?: string;
  reviewStatus?: string;
  platform?: string;
  ingestionType?: string;
  urgencyLevel?: string;
  riskMin?: number;
  campaignId?: string;
  search?: string;
  tab?: string;
  limit?: number;
  offset?: number;
}

export async function pgListMonitoredItems(
  filters: MonitoredItemFilters = {}
): Promise<{ items: MonitoredItem[]; total: number }> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const rows = await sql`
    SELECT mi.*, o.name AS organization_name, ms.name AS source_name
    FROM monitored_items mi
    JOIN monitoring_organizations o ON o.id = mi.organization_id
    LEFT JOIN media_sources ms ON ms.id = mi.source_id
    WHERE 1=1
      AND (${filters.organizationId ?? null}::uuid IS NULL OR mi.organization_id = ${filters.organizationId ?? null})
      AND (${filters.sentiment ?? null}::text IS NULL OR mi.sentiment = ${filters.sentiment ?? null})
      AND (${filters.status ?? null}::text IS NULL OR mi.status = ${filters.status ?? null})
      AND (${filters.reviewStatus ?? null}::text IS NULL OR mi.review_status = ${filters.reviewStatus ?? null})
      AND (${filters.platform ?? null}::text IS NULL OR mi.platform = ${filters.platform ?? null})
      AND (${filters.ingestionType ?? null}::text IS NULL OR mi.ingestion_type = ${filters.ingestionType ?? null})
      AND (${filters.urgencyLevel ?? null}::text IS NULL OR mi.urgency_level = ${filters.urgencyLevel ?? null})
      AND (${filters.riskMin ?? null}::numeric IS NULL OR mi.risk_score >= ${filters.riskMin ?? null})
      AND (${filters.campaignId ?? null}::uuid IS NULL OR mi.related_campaign_id = ${filters.campaignId ?? null} OR mi.campaign_id = ${filters.campaignId ?? null})
      AND (
        ${filters.tab ?? null}::text IS NULL
        OR (${filters.tab ?? null} = 'all')
        OR (${filters.tab ?? null} = 'negative' AND mi.sentiment = 'negative')
        OR (${filters.tab ?? null} = 'needs_review' AND mi.review_status = 'pending')
        OR (${filters.tab ?? null} = 'verified' AND mi.review_status = 'approved')
        OR (${filters.tab ?? null} = 'irrelevant' AND mi.status = 'irrelevant')
        OR (${filters.tab ?? null} = 'converted' AND mi.status = 'converted_to_case')
        OR (${filters.tab ?? null} = 'archived' AND mi.status = 'archived')
      )
      AND (
        ${filters.search ?? null}::text IS NULL
        OR mi.title ILIKE ${"%" + (filters.search ?? "") + "%"}
        OR mi.summary ILIKE ${"%" + (filters.search ?? "") + "%"}
      )
    ORDER BY mi.detected_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRows = await sql`
    SELECT COUNT(*)::int AS total
    FROM monitored_items mi
    WHERE 1=1
      AND (${filters.organizationId ?? null}::uuid IS NULL OR mi.organization_id = ${filters.organizationId ?? null})
      AND (${filters.sentiment ?? null}::text IS NULL OR mi.sentiment = ${filters.sentiment ?? null})
      AND (${filters.status ?? null}::text IS NULL OR mi.status = ${filters.status ?? null})
      AND (${filters.reviewStatus ?? null}::text IS NULL OR mi.review_status = ${filters.reviewStatus ?? null})
      AND (${filters.platform ?? null}::text IS NULL OR mi.platform = ${filters.platform ?? null})
      AND (${filters.ingestionType ?? null}::text IS NULL OR mi.ingestion_type = ${filters.ingestionType ?? null})
      AND (${filters.urgencyLevel ?? null}::text IS NULL OR mi.urgency_level = ${filters.urgencyLevel ?? null})
      AND (${filters.riskMin ?? null}::numeric IS NULL OR mi.risk_score >= ${filters.riskMin ?? null})
      AND (${filters.campaignId ?? null}::uuid IS NULL OR mi.related_campaign_id = ${filters.campaignId ?? null} OR mi.campaign_id = ${filters.campaignId ?? null})
      AND (
        ${filters.tab ?? null}::text IS NULL
        OR (${filters.tab ?? null} = 'all')
        OR (${filters.tab ?? null} = 'negative' AND mi.sentiment = 'negative')
        OR (${filters.tab ?? null} = 'needs_review' AND mi.review_status = 'pending')
        OR (${filters.tab ?? null} = 'verified' AND mi.review_status = 'approved')
        OR (${filters.tab ?? null} = 'irrelevant' AND mi.status = 'irrelevant')
        OR (${filters.tab ?? null} = 'converted' AND mi.status = 'converted_to_case')
        OR (${filters.tab ?? null} = 'archived' AND mi.status = 'archived')
      )
      AND (
        ${filters.search ?? null}::text IS NULL
        OR mi.title ILIKE ${"%" + (filters.search ?? "") + "%"}
        OR mi.summary ILIKE ${"%" + (filters.search ?? "") + "%"}
      )
  `;

  return {
    items: rows.map((row) => mapItem(row as Record<string, unknown>)),
    total: num(countRows[0]?.total),
  };
}

export async function pgGetMonitoredItem(id: string): Promise<MonitoredItem | null> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT mi.*, o.name AS organization_name, ms.name AS source_name
    FROM monitored_items mi
    JOIN monitoring_organizations o ON o.id = mi.organization_id
    LEFT JOIN media_sources ms ON ms.id = mi.source_id
    WHERE mi.id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapItem(rows[0] as Record<string, unknown>) : null;
}

export async function pgCreateMonitoredItem(
  input: Omit<MonitoredItem, "id" | "createdAt" | "updatedAt" | "organizationName" | "sourceName"> & {
    id?: string;
  }
): Promise<MonitoredItem> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const id = input.id ?? generateId();
  const rows = await sql`
    INSERT INTO monitored_items (
      id, organization_id, source_id, campaign_id, directive_id, title, summary, full_text,
      source_url, thumbnail, platform, published_at, detected_at, ingestion_type, external_id,
      author_name, author_username, sentiment, relevance_score, negativity_score, risk_score,
      urgency_level, status, review_status, view_count, like_count, comment_count, share_count,
      repost_count, engagement_count, growth_rate, geographic_scope, province_id, city_id,
      first_detected_by, assigned_reviewer_id, related_campaign_id, related_instruction_id,
      duplicate_of_id, matched_keyword, expert_notes, ai_analysis_json, suggested_response_type,
      response_deadline_hours
    ) VALUES (
      ${id}, ${input.organizationId}, ${input.sourceId}, ${input.campaignId}, ${input.directiveId},
      ${input.title}, ${input.summary}, ${input.fullText}, ${input.sourceUrl}, ${input.thumbnail},
      ${input.platform}, ${input.publishedAt}, ${input.detectedAt}, ${input.ingestionType},
      ${input.externalId}, ${input.authorName}, ${input.authorUsername}, ${input.sentiment},
      ${input.relevanceScore}, ${input.negativityScore}, ${input.riskScore}, ${input.urgencyLevel},
      ${input.status}, ${input.reviewStatus}, ${input.viewCount}, ${input.likeCount},
      ${input.commentCount}, ${input.shareCount}, ${input.repostCount}, ${input.engagementCount},
      ${input.growthRate}, ${input.geographicScope}, ${input.provinceId}, ${input.cityId},
      ${input.firstDetectedBy}, ${input.assignedReviewerId}, ${input.relatedCampaignId},
      ${input.relatedInstructionId}, ${input.duplicateOfId}, ${input.matchedKeyword},
      ${input.expertNotes}, ${input.aiAnalysisJson ? sql.json(toJsonParam(input.aiAnalysisJson)) : null},
      ${input.suggestedResponseType}, ${input.responseDeadlineHours}
    )
    RETURNING *
  `;
  return mapItem(rows[0] as Record<string, unknown>);
}

export async function pgUpdateMonitoredItem(
  id: string,
  patch: Partial<MonitoredItem>
): Promise<MonitoredItem | null> {
  await ensureMonitoringSchema();
  const current = await pgGetMonitoredItem(id);
  if (!current) return null;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  const sql = getSql();
  await sql`
    UPDATE monitored_items SET
      title = ${next.title},
      summary = ${next.summary},
      full_text = ${next.fullText},
      sentiment = ${next.sentiment},
      negativity_score = ${next.negativityScore},
      risk_score = ${next.riskScore},
      urgency_level = ${next.urgencyLevel},
      status = ${next.status},
      review_status = ${next.reviewStatus},
      view_count = ${next.viewCount},
      like_count = ${next.likeCount},
      comment_count = ${next.commentCount},
      share_count = ${next.shareCount},
      repost_count = ${next.repostCount},
      engagement_count = ${next.engagementCount},
      growth_rate = ${next.growthRate},
      expert_notes = ${next.expertNotes},
      assigned_reviewer_id = ${next.assignedReviewerId},
      duplicate_of_id = ${next.duplicateOfId},
      ai_analysis_json = ${next.aiAnalysisJson ? sql.json(toJsonParam(next.aiAnalysisJson)) : null},
      suggested_response_type = ${next.suggestedResponseType},
      response_deadline_hours = ${next.responseDeadlineHours},
      updated_at = now()
    WHERE id = ${id}
  `;
  return pgGetMonitoredItem(id);
}

export async function pgListTrends(campaignId?: string): Promise<Trend[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = campaignId
    ? await sql`
        SELECT t.*, o.name AS organization_name
        FROM monitoring_trends t
        JOIN monitoring_organizations o ON o.id = t.organization_id
        WHERE t.campaign_id = ${campaignId} OR t.related_campaign_id = ${campaignId}
        ORDER BY t.growth_percentage DESC
      `
    : await sql`
        SELECT t.*, o.name AS organization_name
        FROM monitoring_trends t
        JOIN monitoring_organizations o ON o.id = t.organization_id
        ORDER BY t.growth_percentage DESC
      `;
  return rows.map((row) => mapTrend(row as Record<string, unknown>));
}

export async function pgListCases(filters: {
  organizationId?: string;
  status?: string;
  campaignId?: string;
  limit?: number;
} = {}): Promise<RapidResponseCase[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const limit = filters.limit ?? 50;
  const rows = await sql`
    SELECT c.*, o.name AS organization_name
    FROM rapid_response_cases c
    JOIN monitoring_organizations o ON o.id = c.organization_id
    WHERE 1=1
      AND (${filters.organizationId ?? null}::uuid IS NULL OR c.organization_id = ${filters.organizationId ?? null})
      AND (${filters.status ?? null}::text IS NULL OR c.case_status = ${filters.status ?? null})
      AND (${filters.campaignId ?? null}::uuid IS NULL OR c.campaign_id = ${filters.campaignId ?? null})
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => mapCase(row as Record<string, unknown>));
}

export async function pgGetCase(id: string): Promise<RapidResponseCase | null> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT c.*, o.name AS organization_name
    FROM rapid_response_cases c
    JOIN monitoring_organizations o ON o.id = c.organization_id
    WHERE c.id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapCase(rows[0] as Record<string, unknown>) : null;
}

export async function pgCreateCase(
  input: Omit<RapidResponseCase, "id" | "createdAt" | "updatedAt" | "organizationName" | "assignedManagerName"> & {
    id?: string;
  }
): Promise<RapidResponseCase> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const id = input.id ?? generateId();
  const rows = await sql`
    INSERT INTO rapid_response_cases (
      id, case_number, organization_id, monitored_item_id, campaign_id, directive_id, title, description,
      source_type, created_by_type, case_status, risk_level, urgency_level, response_type, deadline,
      response_deadline_hours, assigned_organization_id, assigned_manager_id,
      assigned_public_relations_manager_id, assigned_shift_officer_id, supervising_center_id,
      command_text, required_actions, expected_output, publish_channels, republish_organizations,
      ai_summary, ai_recommendation, ai_analysis_json, negative_reach, response_reach, coverage_ratio,
      effectiveness_score, sentiment_before, sentiment_after, opened_at, first_action_at,
      first_publish_at, peak_growth_at, narrative_controlled_at, alert_sent_at, closed_at, created_by
    ) VALUES (
      ${id}, ${input.caseNumber}, ${input.organizationId}, ${input.monitoredItemId}, ${input.campaignId},
      ${input.directiveId}, ${input.title}, ${input.description}, ${input.sourceType}, ${input.createdByType},
      ${input.caseStatus}, ${input.riskLevel}, ${input.urgencyLevel}, ${input.responseType}, ${input.deadline},
      ${input.responseDeadlineHours}, ${input.assignedOrganizationId}, ${input.assignedManagerId},
      ${input.assignedPublicRelationsManagerId}, ${input.assignedShiftOfficerId}, ${input.supervisingCenterId},
      ${input.commandText}, ${sql.json(input.requiredActions)}, ${input.expectedOutput},
      ${sql.json(input.publishChannels)}, ${sql.json(input.republishOrganizations)}, ${input.aiSummary},
      ${input.aiRecommendation}, ${input.aiAnalysisJson ? sql.json(toJsonParam(input.aiAnalysisJson)) : null},
      ${input.negativeReach}, ${input.responseReach}, ${input.coverageRatio}, ${input.effectivenessScore},
      ${input.sentimentBefore}, ${input.sentimentAfter}, ${input.openedAt}, ${input.firstActionAt},
      ${input.firstPublishAt}, ${input.peakGrowthAt}, ${input.narrativeControlledAt}, ${input.alertSentAt},
      ${input.closedAt}, ${input.createdBy}
    )
    RETURNING *
  `;
  return mapCase(rows[0] as Record<string, unknown>);
}

export async function pgUpdateCase(
  id: string,
  patch: Partial<RapidResponseCase>
): Promise<RapidResponseCase | null> {
  const current = await pgGetCase(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  const sql = getSql();
  await sql`
    UPDATE rapid_response_cases SET
      title = ${next.title},
      description = ${next.description},
      case_status = ${next.caseStatus},
      risk_level = ${next.riskLevel},
      urgency_level = ${next.urgencyLevel},
      response_type = ${next.responseType},
      deadline = ${next.deadline},
      response_deadline_hours = ${next.responseDeadlineHours},
      assigned_organization_id = ${next.assignedOrganizationId},
      assigned_manager_id = ${next.assignedManagerId},
      assigned_public_relations_manager_id = ${next.assignedPublicRelationsManagerId},
      assigned_shift_officer_id = ${next.assignedShiftOfficerId},
      command_text = ${next.commandText},
      required_actions = ${sql.json(next.requiredActions)},
      expected_output = ${next.expectedOutput},
      publish_channels = ${sql.json(next.publishChannels)},
      republish_organizations = ${sql.json(next.republishOrganizations)},
      ai_summary = ${next.aiSummary},
      ai_recommendation = ${next.aiRecommendation},
      ai_analysis_json = ${next.aiAnalysisJson ? sql.json(toJsonParam(next.aiAnalysisJson)) : null},
      negative_reach = ${next.negativeReach},
      response_reach = ${next.responseReach},
      coverage_ratio = ${next.coverageRatio},
      effectiveness_score = ${next.effectivenessScore},
      sentiment_before = ${next.sentimentBefore},
      sentiment_after = ${next.sentimentAfter},
      opened_at = ${next.openedAt},
      first_action_at = ${next.firstActionAt},
      first_publish_at = ${next.firstPublishAt},
      peak_growth_at = ${next.peakGrowthAt},
      narrative_controlled_at = ${next.narrativeControlledAt},
      alert_sent_at = ${next.alertSentAt},
      closed_at = ${next.closedAt},
      updated_at = now()
    WHERE id = ${id}
  `;
  return pgGetCase(id);
}

export async function pgListActions(caseId: string): Promise<ResponseAction[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM response_actions
    WHERE rapid_response_case_id = ${caseId}
    ORDER BY priority DESC, created_at ASC
  `;
  return rows.map((row) => mapAction(row as Record<string, unknown>));
}

export async function pgCreateAction(
  input: Omit<ResponseAction, "id" | "createdAt" | "updatedAt" | "assignedUserName"> & { id?: string }
): Promise<ResponseAction> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const id = input.id ?? generateId();
  const rows = await sql`
    INSERT INTO response_actions (
      id, rapid_response_case_id, title, description, action_type, assigned_organization_id,
      assigned_user_id, status, priority, deadline, started_at, completed_at, result_description,
      proof_url, content_id, created_by
    ) VALUES (
      ${id}, ${input.rapidResponseCaseId}, ${input.title}, ${input.description}, ${input.actionType},
      ${input.assignedOrganizationId}, ${input.assignedUserId}, ${input.status}, ${input.priority},
      ${input.deadline}, ${input.startedAt}, ${input.completedAt}, ${input.resultDescription},
      ${input.proofUrl}, ${input.contentId}, ${input.createdBy}
    )
    RETURNING *
  `;
  return mapAction(rows[0] as Record<string, unknown>);
}

export async function pgUpdateAction(
  id: string,
  patch: Partial<ResponseAction>
): Promise<ResponseAction | null> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM response_actions WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return null;
  const current = mapAction(rows[0] as Record<string, unknown>);
  const next = { ...current, ...patch };
  await sql`
    UPDATE response_actions SET
      title = ${next.title},
      description = ${next.description},
      status = ${next.status},
      priority = ${next.priority},
      deadline = ${next.deadline},
      started_at = ${next.startedAt},
      completed_at = ${next.completedAt},
      result_description = ${next.resultDescription},
      proof_url = ${next.proofUrl},
      assigned_user_id = ${next.assignedUserId},
      updated_at = now()
    WHERE id = ${id}
  `;
  const updated = await sql`SELECT * FROM response_actions WHERE id = ${id} LIMIT 1`;
  return updated[0] ? mapAction(updated[0] as Record<string, unknown>) : null;
}

export async function pgListSnapshots(caseId: string): Promise<CaseMetricSnapshot[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM case_metric_snapshots
    WHERE rapid_response_case_id = ${caseId}
    ORDER BY recorded_at ASC
  `;
  return rows.map((row) => mapSnapshot(row as Record<string, unknown>));
}

export async function pgCreateSnapshot(
  input: Omit<CaseMetricSnapshot, "id"> & { id?: string }
): Promise<CaseMetricSnapshot> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const id = input.id ?? generateId();
  const rows = await sql`
    INSERT INTO case_metric_snapshots (
      id, rapid_response_case_id, recorded_at, negative_views, negative_reach, negative_mentions,
      negative_shares, response_views, response_reach, response_mentions, response_shares,
      negative_sentiment_percentage, positive_sentiment_percentage, official_narrative_share,
      growth_rate, platform_metrics_json
    ) VALUES (
      ${id}, ${input.rapidResponseCaseId}, ${input.recordedAt}, ${input.negativeViews},
      ${input.negativeReach}, ${input.negativeMentions}, ${input.negativeShares}, ${input.responseViews},
      ${input.responseReach}, ${input.responseMentions}, ${input.responseShares},
      ${input.negativeSentimentPercentage}, ${input.positiveSentimentPercentage},
      ${input.officialNarrativeShare}, ${input.growthRate}, ${sql.json(toJsonParam(input.platformMetricsJson))}
    )
    RETURNING *
  `;
  return mapSnapshot(rows[0] as Record<string, unknown>);
}

export async function pgCreateNotification(
  input: Omit<MonitoringNotification, "id" | "createdAt"> & { id?: string }
): Promise<MonitoringNotification> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const id = input.id ?? generateId();
  const rows = await sql`
    INSERT INTO monitoring_notifications (
      id, user_id, recipient_name, recipient_phone, organization_id, rapid_response_case_id,
      monitored_item_id, notification_type, channel, title, message, status, priority,
      sent_at, read_at, failure_reason
    ) VALUES (
      ${id}, ${input.userId}, ${input.recipientName}, ${input.recipientPhone}, ${input.organizationId},
      ${input.rapidResponseCaseId}, ${input.monitoredItemId}, ${input.notificationType}, ${input.channel},
      ${input.title}, ${input.message}, ${input.status}, ${input.priority}, ${input.sentAt},
      ${input.readAt}, ${input.failureReason}
    )
    RETURNING *
  `;
  return mapNotification(rows[0] as Record<string, unknown>);
}

export async function pgListNotifications(caseId?: string): Promise<MonitoringNotification[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = caseId
    ? await sql`
        SELECT * FROM monitoring_notifications
        WHERE rapid_response_case_id = ${caseId}
        ORDER BY created_at DESC
      `
    : await sql`SELECT * FROM monitoring_notifications ORDER BY created_at DESC LIMIT 100`;
  return rows.map((row) => mapNotification(row as Record<string, unknown>));
}

export async function pgCreateAuditEvent(
  input: Omit<CaseAuditEvent, "id" | "createdAt"> & { id?: string }
): Promise<CaseAuditEvent> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const id = input.id ?? generateId();
  const rows = await sql`
    INSERT INTO monitoring_case_audit_events (
      id, rapid_response_case_id, monitored_item_id, actor_user_id, actor_name, event_type, summary, metadata_json
    ) VALUES (
      ${id}, ${input.rapidResponseCaseId}, ${input.monitoredItemId}, ${input.actorUserId},
      ${input.actorName}, ${input.eventType}, ${input.summary}, ${sql.json(toJsonParam(input.metadataJson))}
    )
    RETURNING *
  `;
  return mapAudit(rows[0] as Record<string, unknown>);
}

export async function pgListAuditEvents(caseId: string): Promise<CaseAuditEvent[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM monitoring_case_audit_events
    WHERE rapid_response_case_id = ${caseId}
    ORDER BY created_at DESC
  `;
  return rows.map((row) => mapAudit(row as Record<string, unknown>));
}

export async function pgListArchives(filters: {
  organizationId?: string;
  archiveType?: string;
  search?: string;
} = {}): Promise<MonitoringArchive[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT a.*, o.name AS organization_name,
      COALESCE(mi.title, t.title, c.title, a.topic) AS title
    FROM monitoring_archives a
    JOIN monitoring_organizations o ON o.id = a.organization_id
    LEFT JOIN monitored_items mi ON mi.id = a.monitored_item_id
    LEFT JOIN monitoring_trends t ON t.id = a.trend_id
    LEFT JOIN rapid_response_cases c ON c.id = a.rapid_response_case_id
    WHERE 1=1
      AND (${filters.organizationId ?? null}::uuid IS NULL OR a.organization_id = ${filters.organizationId ?? null})
      AND (${filters.archiveType ?? null}::text IS NULL OR a.archive_type = ${filters.archiveType ?? null})
      AND (
        ${filters.search ?? null}::text IS NULL
        OR a.topic ILIKE ${"%" + (filters.search ?? "") + "%"}
        OR a.response_summary ILIKE ${"%" + (filters.search ?? "") + "%"}
      )
    ORDER BY a.archived_at DESC
  `;
  return rows.map((row) => mapArchive(row as Record<string, unknown>));
}

export async function pgCreateArchive(
  input: Omit<MonitoringArchive, "id" | "organizationName" | "title"> & { id?: string }
): Promise<MonitoringArchive> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const id = input.id ?? generateId();
  const rows = await sql`
    INSERT INTO monitoring_archives (
      id, organization_id, monitored_item_id, trend_id, rapid_response_case_id, archive_type,
      topic, sub_topic, final_classification, final_risk_score, final_sentiment, response_summary,
      final_result, lessons_learned, ai_analysis, tags, archived_at, archived_by
    ) VALUES (
      ${id}, ${input.organizationId}, ${input.monitoredItemId}, ${input.trendId},
      ${input.rapidResponseCaseId}, ${input.archiveType}, ${input.topic}, ${input.subTopic},
      ${input.finalClassification}, ${input.finalRiskScore}, ${input.finalSentiment},
      ${input.responseSummary}, ${input.finalResult}, ${input.lessonsLearned}, ${input.aiAnalysis},
      ${sql.json(input.tags)}, ${input.archivedAt}, ${input.archivedBy}
    )
    RETURNING *
  `;
  return mapArchive(rows[0] as Record<string, unknown>);
}

export async function pgListCaseContents(caseId: string): Promise<CaseContentAsset[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM monitoring_case_contents
    WHERE rapid_response_case_id = ${caseId}
    ORDER BY created_at DESC
  `;
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      rapidResponseCaseId: String(r.rapid_response_case_id),
      title: String(r.title ?? ""),
      contentType: String(r.content_type ?? "text"),
      bodyText: String(r.body_text ?? ""),
      fileUrl: r.file_url ? String(r.file_url) : null,
      productionStatus: String(r.production_status ?? "draft"),
      approvalStatus: String(r.approval_status ?? "pending"),
      createdBy: r.created_by ? String(r.created_by) : null,
      approvedBy: r.approved_by ? String(r.approved_by) : null,
      versionLabel: String(r.version_label ?? "1"),
      publishUrl: r.publish_url ? String(r.publish_url) : null,
      createdAt: toIso(r.created_at) ?? new Date().toISOString(),
      updatedAt: toIso(r.updated_at) ?? new Date().toISOString(),
    };
  });
}

export async function pgCreateCaseContent(
  input: Omit<CaseContentAsset, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<CaseContentAsset> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const id = input.id ?? generateId();
  await sql`
    INSERT INTO monitoring_case_contents (
      id, rapid_response_case_id, title, content_type, body_text, file_url, production_status,
      approval_status, created_by, approved_by, version_label, publish_url
    ) VALUES (
      ${id}, ${input.rapidResponseCaseId}, ${input.title}, ${input.contentType}, ${input.bodyText},
      ${input.fileUrl}, ${input.productionStatus}, ${input.approvalStatus}, ${input.createdBy},
      ${input.approvedBy}, ${input.versionLabel}, ${input.publishUrl}
    )
  `;
  const list = await pgListCaseContents(input.rapidResponseCaseId);
  return list.find((c) => c.id === id) ?? list[0];
}

export async function pgListPublications(caseId: string): Promise<CasePublication[]> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM monitoring_case_publications
    WHERE rapid_response_case_id = ${caseId}
    ORDER BY published_at DESC NULLS LAST
  `;
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      rapidResponseCaseId: String(r.rapid_response_case_id),
      channel: String(r.channel ?? "other"),
      accountName: String(r.account_name ?? ""),
      url: r.url ? String(r.url) : null,
      publishedAt: toIso(r.published_at),
      viewCount: num(r.view_count),
      engagementCount: num(r.engagement_count),
      status: String(r.status ?? "published"),
      publishingOrganization: r.publishing_organization ? String(r.publishing_organization) : null,
      createdAt: toIso(r.created_at) ?? new Date().toISOString(),
    };
  });
}

export async function pgCreatePublication(
  input: Omit<CasePublication, "id" | "createdAt"> & { id?: string }
): Promise<CasePublication> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const id = input.id ?? generateId();
  await sql`
    INSERT INTO monitoring_case_publications (
      id, rapid_response_case_id, channel, account_name, url, published_at, view_count,
      engagement_count, status, publishing_organization
    ) VALUES (
      ${id}, ${input.rapidResponseCaseId}, ${input.channel}, ${input.accountName}, ${input.url},
      ${input.publishedAt}, ${input.viewCount}, ${input.engagementCount}, ${input.status},
      ${input.publishingOrganization}
    )
  `;
  const list = await pgListPublications(input.rapidResponseCaseId);
  return list.find((p) => p.id === id)!;
}

export async function pgGetMonitoringSettings(): Promise<MonitoringSystemSettings> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT settings_json FROM monitoring_system_settings WHERE id = 'default' LIMIT 1
  `;
  if (!rows[0]) return DEFAULT_MONITORING_SETTINGS;
  return {
    ...DEFAULT_MONITORING_SETTINGS,
    ...(asObject(rows[0].settings_json) as Partial<MonitoringSystemSettings>),
    riskWeights: {
      ...DEFAULT_MONITORING_SETTINGS.riskWeights,
      ...((asObject(rows[0].settings_json).riskWeights as object) ?? {}),
    },
  };
}

export async function pgSaveMonitoringSettings(
  settings: MonitoringSystemSettings
): Promise<MonitoringSystemSettings> {
  await ensureMonitoringSchema();
  const sql = getSql();
  await sql`
    INSERT INTO monitoring_system_settings (id, settings_json, updated_at)
    VALUES ('default', ${sql.json(toJsonParam(settings))}, now())
    ON CONFLICT (id) DO UPDATE SET settings_json = EXCLUDED.settings_json, updated_at = now()
  `;
  return settings;
}

export async function pgGetCampaignMonitoringSettings(
  campaignId: string
): Promise<CampaignMonitoringSettings | null> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM campaign_monitoring_settings WHERE campaign_id = ${campaignId} LIMIT 1
  `;
  if (!rows[0]) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    keywords: asStringArray(r.keywords),
    hashtags: asStringArray(r.hashtags),
    slogans: asStringArray(r.slogans),
    spokespersonNames: asStringArray(r.spokesperson_names),
    organizationNames: asStringArray(r.organization_names),
    targetPlatforms: asStringArray(r.target_platforms),
    targetProvinces: asStringArray(r.target_provinces),
    targetAudience: r.target_audience ? String(r.target_audience) : null,
    competitorNarratives: asStringArray(r.competitor_narratives),
    negativeKeywords: asStringArray(r.negative_keywords),
    startDate: toIso(r.start_date),
    endDate: toIso(r.end_date),
    baselinePeriodDays: num(r.baseline_period_days, 14),
    monitoringStatus: (r.monitoring_status as CampaignMonitoringSettings["monitoringStatus"]) ?? "draft",
    updatedAt: toIso(r.updated_at) ?? new Date().toISOString(),
  };
}

export async function pgUpsertCampaignMonitoringSettings(
  campaignId: string,
  patch: Partial<CampaignMonitoringSettings>
): Promise<CampaignMonitoringSettings> {
  await ensureMonitoringSchema();
  const existing = await pgGetCampaignMonitoringSettings(campaignId);
  const sql = getSql();
  const next = {
    keywords: patch.keywords ?? existing?.keywords ?? [],
    hashtags: patch.hashtags ?? existing?.hashtags ?? [],
    slogans: patch.slogans ?? existing?.slogans ?? [],
    spokespersonNames: patch.spokespersonNames ?? existing?.spokespersonNames ?? [],
    organizationNames: patch.organizationNames ?? existing?.organizationNames ?? [],
    targetPlatforms: patch.targetPlatforms ?? existing?.targetPlatforms ?? [],
    targetProvinces: patch.targetProvinces ?? existing?.targetProvinces ?? [],
    targetAudience: patch.targetAudience ?? existing?.targetAudience ?? null,
    competitorNarratives: patch.competitorNarratives ?? existing?.competitorNarratives ?? [],
    negativeKeywords: patch.negativeKeywords ?? existing?.negativeKeywords ?? [],
    startDate: patch.startDate ?? existing?.startDate ?? null,
    endDate: patch.endDate ?? existing?.endDate ?? null,
    baselinePeriodDays: patch.baselinePeriodDays ?? existing?.baselinePeriodDays ?? 14,
    monitoringStatus: patch.monitoringStatus ?? existing?.monitoringStatus ?? "draft",
  };
  const id = existing?.id ?? generateId();
  await sql`
    INSERT INTO campaign_monitoring_settings (
      id, campaign_id, keywords, hashtags, slogans, spokesperson_names, organization_names,
      target_platforms, target_provinces, target_audience, competitor_narratives, negative_keywords,
      start_date, end_date, baseline_period_days, monitoring_status, updated_at
    ) VALUES (
      ${id}, ${campaignId}, ${sql.json(next.keywords)}, ${sql.json(next.hashtags)},
      ${sql.json(next.slogans)}, ${sql.json(next.spokespersonNames)}, ${sql.json(next.organizationNames)},
      ${sql.json(next.targetPlatforms)}, ${sql.json(next.targetProvinces)}, ${next.targetAudience},
      ${sql.json(next.competitorNarratives)}, ${sql.json(next.negativeKeywords)}, ${next.startDate},
      ${next.endDate}, ${next.baselinePeriodDays}, ${next.monitoringStatus}, now()
    )
    ON CONFLICT (campaign_id) DO UPDATE SET
      keywords = EXCLUDED.keywords,
      hashtags = EXCLUDED.hashtags,
      slogans = EXCLUDED.slogans,
      spokesperson_names = EXCLUDED.spokesperson_names,
      organization_names = EXCLUDED.organization_names,
      target_platforms = EXCLUDED.target_platforms,
      target_provinces = EXCLUDED.target_provinces,
      target_audience = EXCLUDED.target_audience,
      competitor_narratives = EXCLUDED.competitor_narratives,
      negative_keywords = EXCLUDED.negative_keywords,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      baseline_period_days = EXCLUDED.baseline_period_days,
      monitoring_status = EXCLUDED.monitoring_status,
      updated_at = now()
  `;
  return (await pgGetCampaignMonitoringSettings(campaignId))!;
}

export async function pgGetDirectiveMonitoringSettings(
  directiveId: string
): Promise<DirectiveMonitoringSettings | null> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM directive_monitoring_settings WHERE directive_id = ${directiveId} LIMIT 1
  `;
  if (!rows[0]) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: String(r.id),
    directiveId: String(r.directive_id),
    monitoringKind: (r.monitoring_kind as DirectiveMonitoringSettings["monitoringKind"]) ?? "other",
    keywords: asStringArray(r.keywords),
    negativeKeywords: asStringArray(r.negative_keywords),
    targetPlatforms: asStringArray(r.target_platforms),
    monitoringStatus: (r.monitoring_status as DirectiveMonitoringSettings["monitoringStatus"]) ?? "draft",
    updatedAt: toIso(r.updated_at) ?? new Date().toISOString(),
  };
}

export async function pgUpsertDirectiveMonitoringSettings(
  directiveId: string,
  patch: Partial<DirectiveMonitoringSettings>
): Promise<DirectiveMonitoringSettings> {
  await ensureMonitoringSchema();
  const existing = await pgGetDirectiveMonitoringSettings(directiveId);
  const sql = getSql();
  const id = existing?.id ?? generateId();
  const next = {
    monitoringKind: patch.monitoringKind ?? existing?.monitoringKind ?? "other",
    keywords: patch.keywords ?? existing?.keywords ?? [],
    negativeKeywords: patch.negativeKeywords ?? existing?.negativeKeywords ?? [],
    targetPlatforms: patch.targetPlatforms ?? existing?.targetPlatforms ?? [],
    monitoringStatus: patch.monitoringStatus ?? existing?.monitoringStatus ?? "draft",
  };
  await sql`
    INSERT INTO directive_monitoring_settings (
      id, directive_id, monitoring_kind, keywords, negative_keywords, target_platforms, monitoring_status, updated_at
    ) VALUES (
      ${id}, ${directiveId}, ${next.monitoringKind}, ${sql.json(next.keywords)},
      ${sql.json(next.negativeKeywords)}, ${sql.json(next.targetPlatforms)}, ${next.monitoringStatus}, now()
    )
    ON CONFLICT (directive_id) DO UPDATE SET
      monitoring_kind = EXCLUDED.monitoring_kind,
      keywords = EXCLUDED.keywords,
      negative_keywords = EXCLUDED.negative_keywords,
      target_platforms = EXCLUDED.target_platforms,
      monitoring_status = EXCLUDED.monitoring_status,
      updated_at = now()
  `;
  return (await pgGetDirectiveMonitoringSettings(directiveId))!;
}

export async function pgGetMonitoringDashboard(): Promise<MonitoringDashboardData> {
  await ensureMonitoringSchema();
  const sql = getSql();

  const statRows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM monitored_items WHERE sentiment = 'negative' AND detected_at > now() - interval '24 hours') AS new_negative,
      (SELECT COUNT(*)::int FROM monitored_items WHERE review_status = 'pending') AS pending_review,
      (SELECT COUNT(*)::int FROM rapid_response_cases WHERE case_status NOT IN ('closed', 'resolved', 'rejected')) AS open_cases,
      (SELECT COUNT(*)::int FROM rapid_response_cases WHERE risk_level = 'critical' AND case_status NOT IN ('closed', 'resolved', 'rejected')) AS critical_cases,
      (SELECT COUNT(*)::int FROM rapid_response_cases WHERE deadline IS NOT NULL AND deadline < now() + interval '3 hours' AND deadline > now() AND case_status NOT IN ('closed', 'resolved', 'rejected')) AS near_deadline,
      (SELECT COUNT(*)::int FROM rapid_response_cases WHERE (case_status = 'overdue' OR (deadline IS NOT NULL AND deadline < now() AND case_status NOT IN ('closed', 'resolved', 'rejected')))) AS overdue_cases,
      (SELECT COUNT(*)::int FROM monitoring_trends WHERE status = 'active') AS active_trends,
      (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (first_action_at - opened_at))/3600)::numeric, 1) FROM rapid_response_cases WHERE first_action_at IS NOT NULL AND opened_at IS NOT NULL) AS avg_first_response,
      (SELECT ROUND(AVG(effectiveness_score)::numeric, 1) FROM rapid_response_cases WHERE effectiveness_score IS NOT NULL) AS avg_effectiveness
  `;

  const statusRows = await sql`
    SELECT case_status, COUNT(*)::int AS count
    FROM rapid_response_cases
    GROUP BY case_status
  `;

  const caseStatusCounts: Record<string, number> = {};
  for (const row of statusRows) {
    caseStatusCounts[String(row.case_status)] = num(row.count);
  }

  const { items: growingNegativeItems } = await pgListMonitoredItems({
    tab: "negative",
    limit: 10,
  });
  growingNegativeItems.sort((a, b) => b.growthRate - a.growthRate);

  const trends = await pgListTrends();
  const openCases = await pgListCases({ limit: 20 });

  const urgentAlerts = openCases
    .filter((c) => ["high", "critical", "immediate"].includes(c.urgencyLevel) || c.riskLevel === "critical")
    .slice(0, 8)
    .map((c) => {
      const remainingMinutes =
        c.deadline != null
          ? Math.round((new Date(c.deadline).getTime() - Date.now()) / 60000)
          : null;
      return {
        caseId: c.id,
        itemId: c.monitoredItemId,
        title: c.title,
        organizationName: c.organizationName ?? "—",
        sourceName: c.sourceType,
        riskLevel: c.riskLevel,
        urgencyLevel: c.urgencyLevel,
        deadline: c.deadline,
        remainingMinutes,
        viewCount: c.negativeReach,
        growthRate: 0,
        assigneeName: c.assignedManagerName ?? null,
      };
    });

  const comparisonRows = await sql`
    SELECT
      date_trunc('hour', recorded_at) AS recorded_at,
      AVG(negative_reach)::int AS negative_reach,
      AVG(response_reach)::int AS response_reach
    FROM case_metric_snapshots
    WHERE recorded_at > now() - interval '48 hours'
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const s = statRows[0] ?? {};
  return {
    stats: {
      newNegativeItems: num(s.new_negative),
      pendingReview: num(s.pending_review),
      openCases: num(s.open_cases),
      criticalCases: num(s.critical_cases),
      nearDeadlineCases: num(s.near_deadline),
      overdueCases: num(s.overdue_cases),
      activeTrends: num(s.active_trends),
      avgFirstResponseHours: s.avg_first_response != null ? num(s.avg_first_response) : null,
      avgEffectiveness: s.avg_effectiveness != null ? num(s.avg_effectiveness) : null,
    },
    urgentAlerts,
    growingNegativeItems,
    trends: trends.slice(0, 8),
    caseStatusCounts,
    comparisonSeries: comparisonRows.map((row) => ({
      recordedAt: toIso(row.recorded_at) ?? new Date().toISOString(),
      negativeReach: num(row.negative_reach),
      responseReach: num(row.response_reach),
    })),
  };
}

export async function pgCountMonitoringData(): Promise<number> {
  await ensureMonitoringSchema();
  const sql = getSql();
  const rows = await sql`SELECT COUNT(*)::int AS total FROM monitoring_organizations`;
  return num(rows[0]?.total);
}
