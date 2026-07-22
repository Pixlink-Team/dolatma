import { getSql } from "@/lib/db/client";
import { generateId } from "@/lib/utils";
import { isMediaPlatformId, type MediaPlatformId } from "@/lib/media-command/platforms";
import type {
  MediaAccount,
  MediaAccountPermission,
  MediaAccountStatus,
  MediaCommandBundle,
  MediaContent,
  MediaContentEvent,
  MediaContentStatus,
  MediaContentTarget,
  MediaContentVariant,
  MediaDashboardSummary,
  MediaInteraction,
  MediaInteractionStatus,
  MediaLibraryCategory,
  MediaLibraryItem,
  MediaPublishMode,
  MediaPublishOrder,
  MediaPublishOrderMode,
  MediaPublishOrderStatus,
  MediaSmartSuggestion,
  MediaTodayTask,
} from "@/lib/media-command/types";

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asJsonArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function asJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asPlatform(value: unknown): MediaPlatformId {
  return isMediaPlatformId(value) ? value : "other";
}

function asAccountStatus(value: unknown): MediaAccountStatus {
  const allowed: MediaAccountStatus[] = [
    "connected",
    "needs_reconnect",
    "token_expired",
    "access_error",
    "disabled",
    "pending_approval",
  ];
  return allowed.includes(value as MediaAccountStatus)
    ? (value as MediaAccountStatus)
    : "pending_approval";
}

function asContentStatus(value: unknown): MediaContentStatus {
  const allowed: MediaContentStatus[] = [
    "draft",
    "pending_review",
    "needs_revision",
    "approved",
    "scheduled",
    "publishing",
    "published",
    "partial_publish",
    "publish_error",
    "cancelled",
    "expired",
  ];
  return allowed.includes(value as MediaContentStatus) ? (value as MediaContentStatus) : "draft";
}

function asPublishMode(value: unknown): MediaPublishMode {
  const allowed: MediaPublishMode[] = ["normal", "central", "urgent", "crisis"];
  return allowed.includes(value as MediaPublishMode) ? (value as MediaPublishMode) : "normal";
}

function asPermissions(value: unknown): MediaAccountPermission[] {
  if (!Array.isArray(value)) return [];
  const allowed: MediaAccountPermission[] = [
    "view_stats",
    "create_draft",
    "publish",
    "schedule",
    "manage_comments",
    "reply",
    "approve_content",
    "receive_central",
    "direct_central_publish",
  ];
  return value.filter((item): item is MediaAccountPermission =>
    allowed.includes(item as MediaAccountPermission)
  );
}

let schemaReady = false;

export async function ensureMediaCommandSchema(): Promise<void> {
  if (schemaReady) return;
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS media_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      account_name TEXT NOT NULL DEFAULT '',
      organization_name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending_approval',
      last_synced_at TIMESTAMPTZ,
      last_published_at TIMESTAMPTZ,
      recent_error_count INT NOT NULL DEFAULT 0,
      allows_central_publish BOOLEAN NOT NULL DEFAULT false,
      requires_local_approval BOOLEAN NOT NULL DEFAULT true,
      active_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
      access_user_ids UUID[] NOT NULL DEFAULT '{}',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS media_contents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
      internal_title TEXT NOT NULL DEFAULT '',
      topic TEXT NOT NULL DEFAULT '',
      audience TEXT NOT NULL DEFAULT '',
      main_message TEXT NOT NULL DEFAULT '',
      base_text TEXT NOT NULL DEFAULT '',
      media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      video_url TEXT,
      attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      link TEXT,
      hashtags JSONB NOT NULL DEFAULT '[]'::jsonb,
      call_to_action TEXT NOT NULL DEFAULT '',
      sensitivity_level TEXT NOT NULL DEFAULT 'medium',
      expires_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'draft',
      publish_mode TEXT NOT NULL DEFAULT 'normal',
      directive_id UUID REFERENCES campaign_directives(id) ON DELETE SET NULL,
      owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      approver_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      scheduled_at TIMESTAMPTZ,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS media_content_variants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content_id UUID NOT NULL REFERENCES media_contents(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      body_text TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      hashtags JSONB NOT NULL DEFAULT '[]'::jsonb,
      link TEXT,
      media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      cover_image_url TEXT,
      scheduled_at TIMESTAMPTZ,
      preview_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (content_id, platform)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS media_content_targets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content_id UUID NOT NULL REFERENCES media_contents(id) ON DELETE CASCADE,
      account_id UUID NOT NULL REFERENCES media_accounts(id) ON DELETE CASCADE,
      variant_id UUID REFERENCES media_content_variants(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TIMESTAMPTZ,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (content_id, account_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS media_content_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content_id UUID NOT NULL REFERENCES media_contents(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      summary TEXT NOT NULL DEFAULT '',
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS media_publish_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      objective TEXT NOT NULL DEFAULT '',
      main_message TEXT NOT NULL DEFAULT '',
      approved_content TEXT NOT NULL DEFAULT '',
      directive_id UUID REFERENCES campaign_directives(id) ON DELETE SET NULL,
      mode TEXT NOT NULL DEFAULT 'content_mission',
      status TEXT NOT NULL DEFAULT 'draft',
      priority TEXT NOT NULL DEFAULT 'normal',
      sensitivity_level TEXT NOT NULL DEFAULT 'medium',
      target_platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
      target_account_ids UUID[] NOT NULL DEFAULT '{}',
      target_provinces JSONB NOT NULL DEFAULT '[]'::jsonb,
      publish_at TIMESTAMPTZ,
      deadline_at TIMESTAMPTZ,
      allows_localization BOOLEAN NOT NULL DEFAULT true,
      requires_local_approval BOOLEAN NOT NULL DEFAULT true,
      expected_evidence TEXT NOT NULL DEFAULT '',
      reference_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      suggested_variants JSONB NOT NULL DEFAULT '{}'::jsonb,
      owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS media_interactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
      account_id UUID REFERENCES media_accounts(id) ON DELETE SET NULL,
      platform TEXT NOT NULL DEFAULT 'other',
      kind TEXT NOT NULL DEFAULT 'comment',
      author_name TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      related_content_id UUID REFERENCES media_contents(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'new',
      importance TEXT NOT NULL DEFAULT 'normal',
      topic_tag TEXT,
      sentiment TEXT,
      assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      suggested_reply TEXT,
      final_reply TEXT,
      received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS media_library_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'publishable_files',
      version_label TEXT NOT NULL DEFAULT '1',
      file_url TEXT,
      body_text TEXT NOT NULL DEFAULT '',
      valid_until TIMESTAMPTZ,
      access_level TEXT NOT NULL DEFAULT 'campaign',
      can_edit BOOLEAN NOT NULL DEFAULT true,
      can_publish BOOLEAN NOT NULL DEFAULT true,
      suitable_platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
      owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      usage_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_media_accounts_campaign ON media_accounts(campaign_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_contents_campaign ON media_contents(campaign_id, status, scheduled_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_orders_campaign ON media_publish_orders(campaign_id, status, deadline_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_interactions_campaign ON media_interactions(campaign_id, status, received_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_library_campaign ON media_library_items(campaign_id, category)`;

  schemaReady = true;
}

function mapAccount(
  row: Record<string, unknown>,
  nameById: Map<string, string>
): MediaAccount {
  const accessIds = Array.isArray(row.access_user_ids)
    ? (row.access_user_ids as unknown[]).map((id) => String(id))
    : [];
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    platform: asPlatform(row.platform),
    accountName: String(row.account_name ?? ""),
    organizationName: String(row.organization_name ?? ""),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    status: asAccountStatus(row.status),
    lastSyncedAt: toIso(row.last_synced_at),
    lastPublishedAt: toIso(row.last_published_at),
    recentErrorCount: Number(row.recent_error_count ?? 0),
    allowsCentralPublish: Boolean(row.allows_central_publish),
    requiresLocalApproval: Boolean(row.requires_local_approval),
    activePermissions: asPermissions(row.active_permissions),
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : null,
    ownerName: row.owner_name ? String(row.owner_name) : null,
    accessUserIds: accessIds,
    accessUserNames: accessIds.map((id) => nameById.get(id) ?? "کاربر"),
    metadata: asJsonObject(row.metadata),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapVariant(row: Record<string, unknown>): MediaContentVariant {
  return {
    id: String(row.id),
    contentId: String(row.content_id),
    platform: asPlatform(row.platform),
    bodyText: String(row.body_text ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    hashtags: asJsonArray(row.hashtags),
    link: row.link ? String(row.link) : null,
    mediaUrls: asJsonArray(row.media_urls),
    coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : null,
    scheduledAt: toIso(row.scheduled_at),
    previewNote: row.preview_note ? String(row.preview_note) : null,
  };
}

function mapTarget(row: Record<string, unknown>): MediaContentTarget {
  return {
    id: String(row.id),
    contentId: String(row.content_id),
    accountId: String(row.account_id),
    accountName: String(row.account_name ?? ""),
    platform: asPlatform(row.platform ?? row.account_platform),
    status: asContentStatus(row.status),
    publishedAt: toIso(row.published_at),
    errorMessage: row.error_message ? String(row.error_message) : null,
    variantId: row.variant_id ? String(row.variant_id) : null,
  };
}

function mapEvent(row: Record<string, unknown>): MediaContentEvent {
  return {
    id: String(row.id),
    contentId: String(row.content_id),
    eventType: String(row.event_type ?? ""),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    actorName: row.actor_name ? String(row.actor_name) : null,
    summary: String(row.summary ?? ""),
    payload: asJsonObject(row.payload),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  };
}

function mapContent(
  row: Record<string, unknown>,
  variants: MediaContentVariant[],
  targets: MediaContentTarget[]
): MediaContent {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    internalTitle: String(row.internal_title ?? ""),
    topic: String(row.topic ?? ""),
    audience: String(row.audience ?? ""),
    mainMessage: String(row.main_message ?? ""),
    baseText: String(row.base_text ?? ""),
    mediaUrls: asJsonArray(row.media_urls),
    videoUrl: row.video_url ? String(row.video_url) : null,
    attachmentUrls: asJsonArray(row.attachment_urls),
    link: row.link ? String(row.link) : null,
    hashtags: asJsonArray(row.hashtags),
    callToAction: String(row.call_to_action ?? ""),
    sensitivityLevel:
      row.sensitivity_level === "low" ||
      row.sensitivity_level === "high" ||
      row.sensitivity_level === "critical"
        ? row.sensitivity_level
        : "medium",
    expiresAt: toIso(row.expires_at),
    status: asContentStatus(row.status),
    publishMode: asPublishMode(row.publish_mode),
    directiveId: row.directive_id ? String(row.directive_id) : null,
    directiveTitle: row.directive_title ? String(row.directive_title) : null,
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : null,
    ownerName: row.owner_name ? String(row.owner_name) : null,
    approverUserId: row.approver_user_id ? String(row.approver_user_id) : null,
    approverName: row.approver_name ? String(row.approver_name) : null,
    scheduledAt: toIso(row.scheduled_at),
    publishedAt: toIso(row.published_at),
    variants,
    targets,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapOrder(row: Record<string, unknown>): MediaPublishOrder {
  const platforms = asJsonArray(row.target_platforms).filter(isMediaPlatformId);
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    title: String(row.title ?? ""),
    objective: String(row.objective ?? ""),
    mainMessage: String(row.main_message ?? ""),
    approvedContent: String(row.approved_content ?? ""),
    directiveId: row.directive_id ? String(row.directive_id) : null,
    directiveTitle: row.directive_title ? String(row.directive_title) : null,
    mode: (["direct_central", "local_approval", "publish_pack", "content_mission"].includes(
      String(row.mode)
    )
      ? String(row.mode)
      : "content_mission") as MediaPublishOrderMode,
    status: (["draft", "sent", "in_progress", "completed", "expired", "cancelled"].includes(
      String(row.status)
    )
      ? String(row.status)
      : "draft") as MediaPublishOrderStatus,
    priority:
      row.priority === "low" || row.priority === "high" || row.priority === "urgent"
        ? row.priority
        : "normal",
    sensitivityLevel:
      row.sensitivity_level === "low" ||
      row.sensitivity_level === "high" ||
      row.sensitivity_level === "critical"
        ? row.sensitivity_level
        : "medium",
    targetPlatforms: platforms,
    targetAccountIds: Array.isArray(row.target_account_ids)
      ? (row.target_account_ids as unknown[]).map((id) => String(id))
      : [],
    targetProvinces: asJsonArray(row.target_provinces),
    publishAt: toIso(row.publish_at),
    deadlineAt: toIso(row.deadline_at),
    allowsLocalization: Boolean(row.allows_localization),
    requiresLocalApproval: Boolean(row.requires_local_approval),
    expectedEvidence: String(row.expected_evidence ?? ""),
    referenceUrls: asJsonArray(row.reference_urls),
    suggestedVariants: Object.fromEntries(
      Object.entries(asJsonObject(row.suggested_variants)).map(([k, v]) => [k, String(v ?? "")])
    ),
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : null,
    ownerName: row.owner_name ? String(row.owner_name) : null,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapInteraction(row: Record<string, unknown>): MediaInteraction {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    accountId: row.account_id ? String(row.account_id) : null,
    accountName: row.account_name ? String(row.account_name) : null,
    platform: asPlatform(row.platform),
    kind:
      row.kind === "message" || row.kind === "mention" || row.kind === "feedback"
        ? row.kind
        : "comment",
    authorName: String(row.author_name ?? ""),
    body: String(row.body ?? ""),
    relatedContentId: row.related_content_id ? String(row.related_content_id) : null,
    relatedContentTitle: row.related_content_title ? String(row.related_content_title) : null,
    status: (Object.keys({
      new: 1,
      seen: 1,
      assigned: 1,
      reviewing: 1,
      suggested_reply_ready: 1,
      replied: 1,
      escalated: 1,
      closed: 1,
      needs_official_reply: 1,
      media_crisis: 1,
    }).includes(String(row.status))
      ? String(row.status)
      : "new") as MediaInteractionStatus,
    importance:
      row.importance === "low" || row.importance === "high" || row.importance === "urgent"
        ? row.importance
        : "normal",
    topicTag: row.topic_tag ? String(row.topic_tag) : null,
    sentiment:
      row.sentiment === "positive" ||
      row.sentiment === "neutral" ||
      row.sentiment === "negative" ||
      row.sentiment === "mixed"
        ? row.sentiment
        : null,
    assigneeUserId: row.assignee_user_id ? String(row.assignee_user_id) : null,
    assigneeName: row.assignee_name ? String(row.assignee_name) : null,
    suggestedReply: row.suggested_reply ? String(row.suggested_reply) : null,
    finalReply: row.final_reply ? String(row.final_reply) : null,
    receivedAt: toIso(row.received_at) ?? new Date().toISOString(),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapLibrary(row: Record<string, unknown>): MediaLibraryItem {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    title: String(row.title ?? ""),
    category: String(row.category ?? "publishable_files") as MediaLibraryCategory,
    versionLabel: String(row.version_label ?? "1"),
    fileUrl: row.file_url ? String(row.file_url) : null,
    bodyText: String(row.body_text ?? ""),
    validUntil: toIso(row.valid_until),
    accessLevel:
      row.access_level === "public" || row.access_level === "restricted"
        ? row.access_level
        : "campaign",
    canEdit: Boolean(row.can_edit),
    canPublish: Boolean(row.can_publish),
    suitablePlatforms: asJsonArray(row.suitable_platforms).filter(isMediaPlatformId),
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : null,
    ownerName: row.owner_name ? String(row.owner_name) : null,
    usageCount: Number(row.usage_count ?? 0),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

async function loadUserNames(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const sql = getSql();
  const unique = [...new Set(ids)];
  const rows = await sql`
    SELECT id, name FROM users WHERE id = ANY(${unique}::uuid[])
  `;
  for (const row of rows) {
    map.set(String(row.id), String(row.name ?? "کاربر"));
  }
  return map;
}

export async function pgListMediaAccounts(campaignId: string): Promise<MediaAccount[]> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  const rows = await sql`
    SELECT a.*, u.name AS owner_name
    FROM media_accounts a
    LEFT JOIN users u ON u.id = a.owner_user_id
    WHERE a.campaign_id = ${campaignId}
    ORDER BY a.updated_at DESC
  `;
  const accessIds = rows.flatMap((row) =>
    Array.isArray(row.access_user_ids)
      ? (row.access_user_ids as unknown[]).map((id) => String(id))
      : []
  );
  const names = await loadUserNames(accessIds);
  return rows.map((row) => mapAccount(row as Record<string, unknown>, names));
}

export async function pgUpsertMediaAccount(input: {
  id?: string;
  campaignId: string;
  platform: MediaPlatformId;
  accountName: string;
  organizationName: string;
  avatarUrl?: string | null;
  status: MediaAccountStatus;
  allowsCentralPublish: boolean;
  requiresLocalApproval: boolean;
  activePermissions: MediaAccountPermission[];
  accessUserIds: string[];
  ownerUserId?: string | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  const id = input.id || generateId();
  try {
    if (input.id) {
      await sql`
        UPDATE media_accounts SET
          platform = ${input.platform},
          account_name = ${input.accountName.trim()},
          organization_name = ${input.organizationName.trim()},
          avatar_url = ${input.avatarUrl ?? null},
          status = ${input.status},
          allows_central_publish = ${input.allowsCentralPublish},
          requires_local_approval = ${input.requiresLocalApproval},
          active_permissions = ${sql.json(input.activePermissions)},
          access_user_ids = ${input.accessUserIds}::uuid[],
          owner_user_id = ${input.ownerUserId ?? null},
          updated_at = now()
        WHERE id = ${id} AND campaign_id = ${input.campaignId}
      `;
    } else {
      await sql`
        INSERT INTO media_accounts (
          id, campaign_id, platform, account_name, organization_name, avatar_url,
          status, allows_central_publish, requires_local_approval, active_permissions,
          access_user_ids, owner_user_id, last_synced_at
        ) VALUES (
          ${id}, ${input.campaignId}, ${input.platform}, ${input.accountName.trim()},
          ${input.organizationName.trim()}, ${input.avatarUrl ?? null}, ${input.status},
          ${input.allowsCentralPublish}, ${input.requiresLocalApproval},
          ${sql.json(input.activePermissions)}, ${input.accessUserIds}::uuid[],
          ${input.ownerUserId ?? null}, now()
        )
      `;
    }
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "ذخیره حساب ناموفق بود",
    };
  }
}

export async function pgDeleteMediaAccount(
  campaignId: string,
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  try {
    await sql`DELETE FROM media_accounts WHERE id = ${id} AND campaign_id = ${campaignId}`;
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حذف حساب ناموفق بود",
    };
  }
}

export async function pgReconnectMediaAccount(
  campaignId: string,
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  try {
    await sql`
      UPDATE media_accounts SET
        status = 'connected',
        recent_error_count = 0,
        last_synced_at = now(),
        updated_at = now()
      WHERE id = ${id} AND campaign_id = ${campaignId}
    `;
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "اتصال مجدد ناموفق بود",
    };
  }
}

async function loadContentRelations(contentIds: string[]): Promise<{
  variantsByContent: Map<string, MediaContentVariant[]>;
  targetsByContent: Map<string, MediaContentTarget[]>;
}> {
  const variantsByContent = new Map<string, MediaContentVariant[]>();
  const targetsByContent = new Map<string, MediaContentTarget[]>();
  if (contentIds.length === 0) return { variantsByContent, targetsByContent };
  const sql = getSql();
  const [variants, targets] = await Promise.all([
    sql`
      SELECT * FROM media_content_variants
      WHERE content_id = ANY(${contentIds}::uuid[])
      ORDER BY platform
    `,
    sql`
      SELECT t.*, a.account_name, a.platform AS account_platform
      FROM media_content_targets t
      JOIN media_accounts a ON a.id = t.account_id
      WHERE t.content_id = ANY(${contentIds}::uuid[])
      ORDER BY a.account_name
    `,
  ]);
  for (const row of variants) {
    const mapped = mapVariant(row as Record<string, unknown>);
    const list = variantsByContent.get(mapped.contentId) ?? [];
    list.push(mapped);
    variantsByContent.set(mapped.contentId, list);
  }
  for (const row of targets) {
    const mapped = mapTarget(row as Record<string, unknown>);
    const list = targetsByContent.get(mapped.contentId) ?? [];
    list.push(mapped);
    targetsByContent.set(mapped.contentId, list);
  }
  return { variantsByContent, targetsByContent };
}

export async function pgListMediaContents(campaignId: string): Promise<MediaContent[]> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  const rows = await sql`
    SELECT c.*,
      ou.name AS owner_name,
      au.name AS approver_name,
      d.title AS directive_title
    FROM media_contents c
    LEFT JOIN users ou ON ou.id = c.owner_user_id
    LEFT JOIN users au ON au.id = c.approver_user_id
    LEFT JOIN campaign_directives d ON d.id = c.directive_id
    WHERE c.campaign_id = ${campaignId}
    ORDER BY c.updated_at DESC
  `;
  const ids = rows.map((row) => String(row.id));
  const { variantsByContent, targetsByContent } = await loadContentRelations(ids);
  return rows.map((row) => {
    const id = String(row.id);
    return mapContent(
      row as Record<string, unknown>,
      variantsByContent.get(id) ?? [],
      targetsByContent.get(id) ?? []
    );
  });
}

export async function pgGetMediaContent(
  campaignId: string,
  id: string
): Promise<MediaContent | null> {
  const items = await pgListMediaContents(campaignId);
  return items.find((item) => item.id === id) ?? null;
}

export type MediaContentUpsertInput = {
  id?: string;
  campaignId: string;
  internalTitle: string;
  topic: string;
  audience: string;
  mainMessage: string;
  baseText: string;
  mediaUrls: string[];
  videoUrl?: string | null;
  attachmentUrls: string[];
  link?: string | null;
  hashtags: string[];
  callToAction: string;
  sensitivityLevel: "low" | "medium" | "high" | "critical";
  expiresAt?: string | null;
  status: MediaContentStatus;
  publishMode: MediaPublishMode;
  directiveId?: string | null;
  ownerUserId?: string | null;
  approverUserId?: string | null;
  scheduledAt?: string | null;
  accountIds: string[];
  variants: Array<{
    platform: MediaPlatformId;
    bodyText: string;
    title: string;
    description: string;
    hashtags: string[];
    link?: string | null;
    mediaUrls: string[];
    coverImageUrl?: string | null;
    scheduledAt?: string | null;
    previewNote?: string | null;
  }>;
  actorUserId?: string | null;
  actorName?: string | null;
  eventSummary?: string;
};

export async function pgUpsertMediaContent(
  input: MediaContentUpsertInput
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  const id = input.id || generateId();
  const isUpdate = Boolean(input.id);

  try {
    if (isUpdate) {
      await sql`
        UPDATE media_contents SET
          internal_title = ${input.internalTitle.trim()},
          topic = ${input.topic.trim()},
          audience = ${input.audience.trim()},
          main_message = ${input.mainMessage.trim()},
          base_text = ${input.baseText.trim()},
          media_urls = ${sql.json(input.mediaUrls)},
          video_url = ${input.videoUrl ?? null},
          attachment_urls = ${sql.json(input.attachmentUrls)},
          link = ${input.link ?? null},
          hashtags = ${sql.json(input.hashtags)},
          call_to_action = ${input.callToAction.trim()},
          sensitivity_level = ${input.sensitivityLevel},
          expires_at = ${input.expiresAt ?? null},
          status = ${input.status},
          publish_mode = ${input.publishMode},
          directive_id = ${input.directiveId ?? null},
          owner_user_id = ${input.ownerUserId ?? null},
          approver_user_id = ${input.approverUserId ?? null},
          scheduled_at = ${input.scheduledAt ?? null},
          published_at = CASE
            WHEN ${input.status} = 'published' THEN COALESCE(published_at, now())
            ELSE published_at
          END,
          updated_at = now()
        WHERE id = ${id} AND campaign_id = ${input.campaignId}
      `;
    } else {
      await sql`
        INSERT INTO media_contents (
          id, campaign_id, internal_title, topic, audience, main_message, base_text,
          media_urls, video_url, attachment_urls, link, hashtags, call_to_action,
          sensitivity_level, expires_at, status, publish_mode, directive_id,
          owner_user_id, approver_user_id, scheduled_at,
          published_at
        ) VALUES (
          ${id}, ${input.campaignId}, ${input.internalTitle.trim()}, ${input.topic.trim()},
          ${input.audience.trim()}, ${input.mainMessage.trim()}, ${input.baseText.trim()},
          ${sql.json(input.mediaUrls)}, ${input.videoUrl ?? null}, ${sql.json(input.attachmentUrls)},
          ${input.link ?? null}, ${sql.json(input.hashtags)}, ${input.callToAction.trim()},
          ${input.sensitivityLevel}, ${input.expiresAt ?? null}, ${input.status},
          ${input.publishMode}, ${input.directiveId ?? null}, ${input.ownerUserId ?? null},
          ${input.approverUserId ?? null}, ${input.scheduledAt ?? null},
          ${input.status === "published" ? new Date().toISOString() : null}
        )
      `;
    }

    await sql`DELETE FROM media_content_targets WHERE content_id = ${id}`;
    await sql`DELETE FROM media_content_variants WHERE content_id = ${id}`;

    const variantIds = new Map<string, string>();
    for (const variant of input.variants) {
      const variantId = generateId();
      variantIds.set(variant.platform, variantId);
      await sql`
        INSERT INTO media_content_variants (
          id, content_id, platform, body_text, title, description, hashtags, link,
          media_urls, cover_image_url, scheduled_at, preview_note
        ) VALUES (
          ${variantId}, ${id}, ${variant.platform}, ${variant.bodyText}, ${variant.title},
          ${variant.description}, ${sql.json(variant.hashtags)}, ${variant.link ?? null},
          ${sql.json(variant.mediaUrls)}, ${variant.coverImageUrl ?? null},
          ${variant.scheduledAt ?? null}, ${variant.previewNote ?? null}
        )
      `;
    }

    if (input.accountIds.length > 0) {
      const accounts = await sql`
        SELECT id, platform FROM media_accounts
        WHERE campaign_id = ${input.campaignId}
          AND id = ANY(${input.accountIds}::uuid[])
      `;
      for (const account of accounts) {
        const accountId = String(account.id);
        const platform = asPlatform(account.platform);
        const variantId = variantIds.get(platform) ?? null;
        await sql`
          INSERT INTO media_content_targets (
            id, content_id, account_id, variant_id, status
          ) VALUES (
            ${generateId()}, ${id}, ${accountId}, ${variantId}, ${input.status}
          )
        `;
      }
    }

    await sql`
      INSERT INTO media_content_events (
        id, content_id, event_type, actor_user_id, summary, payload
      ) VALUES (
        ${generateId()}, ${id}, ${isUpdate ? "updated" : "created"},
        ${input.actorUserId ?? null},
        ${input.eventSummary ?? (isUpdate ? "محتوا به‌روزرسانی شد" : "محتوا ایجاد شد")},
        ${sql.json({ status: input.status, accountIds: input.accountIds })}
      )
    `;

    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "ذخیره محتوا ناموفق بود",
    };
  }
}

export async function pgUpdateMediaContentStatus(input: {
  campaignId: string;
  id: string;
  status: MediaContentStatus;
  scheduledAt?: string | null;
  actorUserId?: string | null;
  summary?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  try {
    await sql`
      UPDATE media_contents SET
        status = ${input.status},
        scheduled_at = COALESCE(${input.scheduledAt ?? null}, scheduled_at),
        published_at = CASE
          WHEN ${input.status} = 'published' THEN COALESCE(published_at, now())
          ELSE published_at
        END,
        updated_at = now()
      WHERE id = ${input.id} AND campaign_id = ${input.campaignId}
    `;
    await sql`
      UPDATE media_content_targets SET
        status = ${input.status},
        published_at = CASE
          WHEN ${input.status} = 'published' THEN COALESCE(published_at, now())
          ELSE published_at
        END,
        error_message = CASE WHEN ${input.status} = 'publish_error' THEN error_message ELSE NULL END,
        updated_at = now()
      WHERE content_id = ${input.id}
    `;
    await sql`
      INSERT INTO media_content_events (id, content_id, event_type, actor_user_id, summary, payload)
      VALUES (
        ${generateId()}, ${input.id}, 'status_changed', ${input.actorUserId ?? null},
        ${input.summary ?? `وضعیت به ${input.status} تغییر کرد`},
        ${sql.json({ status: input.status, scheduledAt: input.scheduledAt ?? null })}
      )
    `;
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تغییر وضعیت ناموفق بود",
    };
  }
}

export async function pgRescheduleMediaContent(input: {
  campaignId: string;
  id: string;
  scheduledAt: string;
  actorUserId?: string | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  return pgUpdateMediaContentStatus({
    campaignId: input.campaignId,
    id: input.id,
    status: "scheduled",
    scheduledAt: input.scheduledAt,
    actorUserId: input.actorUserId,
    summary: "زمان انتشار در تقویم تغییر کرد",
  });
}

export async function pgDuplicateMediaContent(input: {
  campaignId: string;
  id: string;
  actorUserId?: string | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const existing = await pgGetMediaContent(input.campaignId, input.id);
  if (!existing) return { success: false, error: "محتوا یافت نشد" };
  return pgUpsertMediaContent({
    campaignId: input.campaignId,
    internalTitle: `${existing.internalTitle} (نسخه جدید)`,
    topic: existing.topic,
    audience: existing.audience,
    mainMessage: existing.mainMessage,
    baseText: existing.baseText,
    mediaUrls: existing.mediaUrls,
    videoUrl: existing.videoUrl,
    attachmentUrls: existing.attachmentUrls,
    link: existing.link,
    hashtags: existing.hashtags,
    callToAction: existing.callToAction,
    sensitivityLevel: existing.sensitivityLevel,
    expiresAt: existing.expiresAt,
    status: "draft",
    publishMode: existing.publishMode,
    directiveId: existing.directiveId,
    ownerUserId: input.actorUserId ?? existing.ownerUserId,
    accountIds: existing.targets.map((t) => t.accountId),
    variants: existing.variants.map((v) => ({
      platform: v.platform,
      bodyText: v.bodyText,
      title: v.title,
      description: v.description,
      hashtags: v.hashtags,
      link: v.link,
      mediaUrls: v.mediaUrls,
      coverImageUrl: v.coverImageUrl,
      scheduledAt: null,
      previewNote: v.previewNote,
    })),
    actorUserId: input.actorUserId,
    eventSummary: "نسخه جدید از محتوا ساخته شد",
  });
}

export async function pgListMediaContentEvents(contentId: string): Promise<MediaContentEvent[]> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  const rows = await sql`
    SELECT e.*, u.name AS actor_name
    FROM media_content_events e
    LEFT JOIN users u ON u.id = e.actor_user_id
    WHERE e.content_id = ${contentId}
    ORDER BY e.created_at DESC
  `;
  return rows.map((row) => mapEvent(row as Record<string, unknown>));
}

export async function pgListMediaOrders(campaignId: string): Promise<MediaPublishOrder[]> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  const rows = await sql`
    SELECT o.*, u.name AS owner_name, d.title AS directive_title
    FROM media_publish_orders o
    LEFT JOIN users u ON u.id = o.owner_user_id
    LEFT JOIN campaign_directives d ON d.id = o.directive_id
    WHERE o.campaign_id = ${campaignId}
    ORDER BY o.updated_at DESC
  `;
  return rows.map((row) => mapOrder(row as Record<string, unknown>));
}

export async function pgUpsertMediaOrder(input: {
  id?: string;
  campaignId: string;
  title: string;
  objective: string;
  mainMessage: string;
  approvedContent: string;
  directiveId?: string | null;
  mode: MediaPublishOrderMode;
  status: MediaPublishOrderStatus;
  priority: "low" | "normal" | "high" | "urgent";
  sensitivityLevel: "low" | "medium" | "high" | "critical";
  targetPlatforms: MediaPlatformId[];
  targetAccountIds: string[];
  targetProvinces: string[];
  publishAt?: string | null;
  deadlineAt?: string | null;
  allowsLocalization: boolean;
  requiresLocalApproval: boolean;
  expectedEvidence: string;
  referenceUrls: string[];
  suggestedVariants: Record<string, string>;
  ownerUserId?: string | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  const id = input.id || generateId();
  try {
    if (input.id) {
      await sql`
        UPDATE media_publish_orders SET
          title = ${input.title.trim()},
          objective = ${input.objective.trim()},
          main_message = ${input.mainMessage.trim()},
          approved_content = ${input.approvedContent.trim()},
          directive_id = ${input.directiveId ?? null},
          mode = ${input.mode},
          status = ${input.status},
          priority = ${input.priority},
          sensitivity_level = ${input.sensitivityLevel},
          target_platforms = ${sql.json(input.targetPlatforms)},
          target_account_ids = ${input.targetAccountIds}::uuid[],
          target_provinces = ${sql.json(input.targetProvinces)},
          publish_at = ${input.publishAt ?? null},
          deadline_at = ${input.deadlineAt ?? null},
          allows_localization = ${input.allowsLocalization},
          requires_local_approval = ${input.requiresLocalApproval},
          expected_evidence = ${input.expectedEvidence.trim()},
          reference_urls = ${sql.json(input.referenceUrls)},
          suggested_variants = ${sql.json(input.suggestedVariants)},
          owner_user_id = ${input.ownerUserId ?? null},
          updated_at = now()
        WHERE id = ${id} AND campaign_id = ${input.campaignId}
      `;
    } else {
      await sql`
        INSERT INTO media_publish_orders (
          id, campaign_id, title, objective, main_message, approved_content, directive_id,
          mode, status, priority, sensitivity_level, target_platforms, target_account_ids,
          target_provinces, publish_at, deadline_at, allows_localization, requires_local_approval,
          expected_evidence, reference_urls, suggested_variants, owner_user_id
        ) VALUES (
          ${id}, ${input.campaignId}, ${input.title.trim()}, ${input.objective.trim()},
          ${input.mainMessage.trim()}, ${input.approvedContent.trim()}, ${input.directiveId ?? null},
          ${input.mode}, ${input.status}, ${input.priority}, ${input.sensitivityLevel},
          ${sql.json(input.targetPlatforms)}, ${input.targetAccountIds}::uuid[],
          ${sql.json(input.targetProvinces)}, ${input.publishAt ?? null}, ${input.deadlineAt ?? null},
          ${input.allowsLocalization}, ${input.requiresLocalApproval},
          ${input.expectedEvidence.trim()}, ${sql.json(input.referenceUrls)},
          ${sql.json(input.suggestedVariants)}, ${input.ownerUserId ?? null}
        )
      `;
    }
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "ذخیره دستور انتشار ناموفق بود",
    };
  }
}

export async function pgListMediaInteractions(campaignId: string): Promise<MediaInteraction[]> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  const rows = await sql`
    SELECT i.*,
      a.account_name,
      c.internal_title AS related_content_title,
      u.name AS assignee_name
    FROM media_interactions i
    LEFT JOIN media_accounts a ON a.id = i.account_id
    LEFT JOIN media_contents c ON c.id = i.related_content_id
    LEFT JOIN users u ON u.id = i.assignee_user_id
    WHERE i.campaign_id = ${campaignId}
    ORDER BY i.received_at DESC
  `;
  return rows.map((row) => mapInteraction(row as Record<string, unknown>));
}

export async function pgUpsertMediaInteraction(input: {
  id?: string;
  campaignId: string;
  accountId?: string | null;
  platform: MediaPlatformId;
  kind: "comment" | "message" | "mention" | "feedback";
  authorName: string;
  body: string;
  relatedContentId?: string | null;
  status: MediaInteractionStatus;
  importance: "low" | "normal" | "high" | "urgent";
  topicTag?: string | null;
  sentiment?: "positive" | "neutral" | "negative" | "mixed" | null;
  assigneeUserId?: string | null;
  suggestedReply?: string | null;
  finalReply?: string | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  const id = input.id || generateId();
  try {
    if (input.id) {
      await sql`
        UPDATE media_interactions SET
          account_id = ${input.accountId ?? null},
          platform = ${input.platform},
          kind = ${input.kind},
          author_name = ${input.authorName.trim()},
          body = ${input.body.trim()},
          related_content_id = ${input.relatedContentId ?? null},
          status = ${input.status},
          importance = ${input.importance},
          topic_tag = ${input.topicTag ?? null},
          sentiment = ${input.sentiment ?? null},
          assignee_user_id = ${input.assigneeUserId ?? null},
          suggested_reply = ${input.suggestedReply ?? null},
          final_reply = ${input.finalReply ?? null},
          updated_at = now()
        WHERE id = ${id} AND campaign_id = ${input.campaignId}
      `;
    } else {
      await sql`
        INSERT INTO media_interactions (
          id, campaign_id, account_id, platform, kind, author_name, body,
          related_content_id, status, importance, topic_tag, sentiment,
          assignee_user_id, suggested_reply, final_reply
        ) VALUES (
          ${id}, ${input.campaignId}, ${input.accountId ?? null}, ${input.platform},
          ${input.kind}, ${input.authorName.trim()}, ${input.body.trim()},
          ${input.relatedContentId ?? null}, ${input.status}, ${input.importance},
          ${input.topicTag ?? null}, ${input.sentiment ?? null},
          ${input.assigneeUserId ?? null}, ${input.suggestedReply ?? null},
          ${input.finalReply ?? null}
        )
      `;
    }
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "ذخیره تعامل ناموفق بود",
    };
  }
}

export async function pgListMediaLibrary(campaignId: string): Promise<MediaLibraryItem[]> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  const rows = await sql`
    SELECT l.*, u.name AS owner_name
    FROM media_library_items l
    LEFT JOIN users u ON u.id = l.owner_user_id
    WHERE l.campaign_id = ${campaignId}
    ORDER BY l.updated_at DESC
  `;
  return rows.map((row) => mapLibrary(row as Record<string, unknown>));
}

export async function pgUpsertMediaLibraryItem(input: {
  id?: string;
  campaignId: string;
  title: string;
  category: MediaLibraryCategory;
  versionLabel: string;
  fileUrl?: string | null;
  bodyText: string;
  validUntil?: string | null;
  accessLevel: "public" | "campaign" | "restricted";
  canEdit: boolean;
  canPublish: boolean;
  suitablePlatforms: MediaPlatformId[];
  ownerUserId?: string | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureMediaCommandSchema();
  const id = input.id || generateId();
  try {
    if (input.id) {
      await sql`
        UPDATE media_library_items SET
          title = ${input.title.trim()},
          category = ${input.category},
          version_label = ${input.versionLabel.trim()},
          file_url = ${input.fileUrl ?? null},
          body_text = ${input.bodyText},
          valid_until = ${input.validUntil ?? null},
          access_level = ${input.accessLevel},
          can_edit = ${input.canEdit},
          can_publish = ${input.canPublish},
          suitable_platforms = ${sql.json(input.suitablePlatforms)},
          owner_user_id = ${input.ownerUserId ?? null},
          updated_at = now()
        WHERE id = ${id} AND campaign_id = ${input.campaignId}
      `;
    } else {
      await sql`
        INSERT INTO media_library_items (
          id, campaign_id, title, category, version_label, file_url, body_text,
          valid_until, access_level, can_edit, can_publish, suitable_platforms, owner_user_id
        ) VALUES (
          ${id}, ${input.campaignId}, ${input.title.trim()}, ${input.category},
          ${input.versionLabel.trim()}, ${input.fileUrl ?? null}, ${input.bodyText},
          ${input.validUntil ?? null}, ${input.accessLevel}, ${input.canEdit},
          ${input.canPublish}, ${sql.json(input.suitablePlatforms)}, ${input.ownerUserId ?? null}
        )
      `;
    }
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "ذخیره آیتم کتابخانه ناموفق بود",
    };
  }
}

function buildDashboard(
  accounts: MediaAccount[],
  contents: MediaContent[],
  orders: MediaPublishOrder[],
  interactions: MediaInteraction[],
  campaignId: string
): Pick<MediaCommandBundle, "summary" | "todayTasks" | "suggestions"> {
  const brokenStatuses: MediaAccountStatus[] = [
    "needs_reconnect",
    "token_expired",
    "access_error",
  ];
  const connectedAccounts = accounts.filter((a) => a.status === "connected").length;
  const brokenAccounts = accounts.filter((a) => brokenStatuses.includes(a.status)).length;
  const publishedContents = contents.filter((c) => c.status === "published").length;
  const scheduledContents = contents.filter((c) => c.status === "scheduled").length;
  const pendingApproval = contents.filter((c) => c.status === "pending_review").length;
  const newOrders = orders.filter((o) => o.status === "sent" || o.status === "in_progress").length;
  const unansweredInteractions = interactions.filter(
    (i) => !["replied", "closed"].includes(i.status)
  ).length;
  const publishErrors = contents.filter(
    (c) => c.status === "publish_error" || c.status === "partial_publish"
  ).length;
  const missionOrders = orders.filter((o) => o.mode === "content_mission");
  const completedMissions = missionOrders.filter((o) => o.status === "completed").length;
  const missionCompletionRate =
    missionOrders.length === 0
      ? 100
      : Math.round((completedMissions / missionOrders.length) * 100);

  const summary: MediaDashboardSummary = {
    connectedAccounts,
    brokenAccounts,
    publishedContents,
    scheduledContents,
    pendingApproval,
    newOrders,
    unansweredInteractions,
    publishErrors,
    missionCompletionRate,
  };

  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const todayTasks: MediaTodayTask[] = [];
  const pending = contents.filter((c) => c.status === "pending_review").slice(0, 2);
  for (const item of pending) {
    todayTasks.push({
      id: `pending-${item.id}`,
      kind: "pending_approval",
      title: `محتوای منتظر تأیید: ${item.internalTitle || "بدون عنوان"}`,
      description: "برای بررسی و تأیید یا رد محتوا اقدام کنید.",
      href: `/admin/media-command/contents?campaign=${campaignId}&focus=${item.id}`,
      urgency: "high",
    });
  }

  const urgentOrder = orders.find(
    (o) => o.priority === "urgent" && (o.status === "sent" || o.status === "in_progress")
  );
  if (urgentOrder) {
    todayTasks.push({
      id: `order-${urgentOrder.id}`,
      kind: "urgent_order",
      title: `دستور انتشار فوری: ${urgentOrder.title}`,
      description: urgentOrder.objective || "این دستور اولویت فوری دارد.",
      href: `/admin/media-command/orders?campaign=${campaignId}&focus=${urgentOrder.id}`,
      urgency: "high",
    });
  }

  const openComments = interactions
    .filter((i) => !["replied", "closed"].includes(i.status))
    .slice(0, 3);
  for (const item of openComments) {
    todayTasks.push({
      id: `comment-${item.id}`,
      kind: "unanswered_comment",
      title: `کامنت نیازمند پاسخ از ${item.authorName}`,
      description: item.body.slice(0, 120),
      href: `/admin/media-command/inbox?campaign=${campaignId}&focus=${item.id}`,
      urgency: item.importance === "urgent" ? "high" : "normal",
    });
  }

  const scheduledToday = contents.find((c) => {
    if (c.status !== "scheduled" || !c.scheduledAt) return false;
    const at = new Date(c.scheduledAt);
    return at >= start && at <= end;
  });
  if (scheduledToday) {
    todayTasks.push({
      id: `sched-${scheduledToday.id}`,
      kind: "scheduled_today",
      title: `پست زمان‌بندی‌شده امروز: ${scheduledToday.internalTitle}`,
      description: "وضعیت انتشار امروز را در تقویم بررسی کنید.",
      href: `/admin/media-command/calendar?campaign=${campaignId}`,
      urgency: "normal",
    });
  }

  const reconnect = accounts.find((a) => brokenStatuses.includes(a.status));
  if (reconnect) {
    todayTasks.push({
      id: `acc-${reconnect.id}`,
      kind: "reconnect_account",
      title: `حساب نیازمند اتصال مجدد: ${reconnect.accountName}`,
      description: reconnect.organizationName || getPlatformHint(reconnect.platform),
      href: `/admin/media-command/accounts?campaign=${campaignId}&focus=${reconnect.id}`,
      urgency: "high",
    });
  }

  const nearDeadline = orders
    .filter((o) => o.deadlineAt && o.status !== "completed" && o.status !== "cancelled")
    .sort((a, b) => String(a.deadlineAt).localeCompare(String(b.deadlineAt)))[0];
  if (nearDeadline) {
    todayTasks.push({
      id: `mission-${nearDeadline.id}`,
      kind: "mission_deadline",
      title: `مأموریت نزدیک به سررسید: ${nearDeadline.title}`,
      description: "مهلت انجام این مأموریت محتوایی نزدیک است.",
      href: `/admin/media-command/orders?campaign=${campaignId}&focus=${nearDeadline.id}`,
      urgency: "high",
    });
  }

  const suggestions: MediaSmartSuggestion[] = [
    {
      id: "s1",
      title: "پوشش نامتوازن شبکه‌ها",
      reason:
        "در تلگرام پوشش مناسبی دارید، اما در سایت سازمان و بله هنوز محتوایی منتشر نشده است.",
      relatedCampaignOrDirective: "کمپین فعال",
      actionLabel: "ساخت محتوا برای سایت و بله",
      actionHref: `/admin/media-command/publish?campaign=${campaignId}`,
      deadlineAt: null,
    },
    {
      id: "s2",
      title: "موضوع پرتکرار امروز",
      reason:
        "بیشترین کامنت‌های امروز درباره هزینه اجرای طرح است؛ پیشنهاد می‌شود محتوای توضیحی منتشر شود.",
      relatedCampaignOrDirective: "صندوق تعاملات",
      actionLabel: "مشاهده تعاملات",
      actionHref: `/admin/media-command/inbox?campaign=${campaignId}`,
      deadlineAt: null,
    },
    {
      id: "s3",
      title: "فرمت پربازده",
      reason: "نرخ تعامل محتوای ویدیویی شما بیشتر از پوستر است.",
      relatedCampaignOrDirective: "تحلیل عملکرد",
      actionLabel: "مشاهده تحلیل",
      actionHref: `/admin/media-command/analytics?campaign=${campaignId}`,
      deadlineAt: null,
    },
  ];

  if (nearDeadline?.deadlineAt) {
    suggestions.unshift({
      id: "s0",
      title: "انقضای دستور مرکزی",
      reason: "یک دستور مرکزی تا چند ساعت دیگر منقضی می‌شود.",
      relatedCampaignOrDirective: nearDeadline.title,
      actionLabel: "مشاهده دستور",
      actionHref: `/admin/media-command/orders?campaign=${campaignId}&focus=${nearDeadline.id}`,
      deadlineAt: nearDeadline.deadlineAt,
    });
  }

  if (todayTasks.filter((t) => t.kind === "smart_suggestion").length < 2) {
    todayTasks.push({
      id: "smart-1",
      kind: "smart_suggestion",
      title: "پیشنهاد هوشمند برای بهبود پوشش کمپین",
      description: suggestions[0]?.reason ?? "پوشش شبکه‌های کم‌فعال را تکمیل کنید.",
      href: suggestions[0]?.actionHref ?? `/admin/media-command/publish?campaign=${campaignId}`,
      urgency: "normal",
    });
    todayTasks.push({
      id: "smart-2",
      kind: "smart_suggestion",
      title: "پیشنهاد دوم: تقویت روایت مرکزی",
      description: suggestions[1]?.reason ?? "بر اساس بازخورد مخاطبان محتوا بسازید.",
      href: suggestions[1]?.actionHref ?? `/admin/media-command/inbox?campaign=${campaignId}`,
      urgency: "low",
    });
  }

  return { summary, todayTasks, suggestions };
}

function getPlatformHint(platform: string): string {
  return `شبکه: ${platform}`;
}

export async function pgGetMediaCommandBundle(campaignId: string): Promise<MediaCommandBundle> {
  await ensureMediaCommandSchema();
  const [accounts, contents, orders, interactions, library] = await Promise.all([
    pgListMediaAccounts(campaignId),
    pgListMediaContents(campaignId),
    pgListMediaOrders(campaignId),
    pgListMediaInteractions(campaignId),
    pgListMediaLibrary(campaignId),
  ]);

  const recentContentIds = contents.slice(0, 8).map((c) => c.id);
  const recentEvents: MediaContentEvent[] = [];
  for (const contentId of recentContentIds) {
    const events = await pgListMediaContentEvents(contentId);
    recentEvents.push(...events.slice(0, 2));
  }
  recentEvents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const dash = buildDashboard(accounts, contents, orders, interactions, campaignId);
  return {
    ...dash,
    accounts,
    contents,
    orders,
    interactions,
    library,
    recentEvents: recentEvents.slice(0, 20),
  };
}

export async function pgGetMediaOpsSnapshot(campaignId: string, directiveId?: string | null) {
  const bundle = await pgGetMediaCommandBundle(campaignId);
  const contents = directiveId
    ? bundle.contents.filter((c) => c.directiveId === directiveId)
    : bundle.contents;
  const orders = directiveId
    ? bundle.orders.filter((o) => o.directiveId === directiveId)
    : bundle.orders;
  const platforms = new Set(contents.flatMap((c) => c.targets.map((t) => t.platform)));
  return {
    summary: bundle.summary,
    publishedCount: contents.filter((c) => c.status === "published").length,
    pendingCount: contents.filter((c) => c.status === "pending_review" || c.status === "scheduled")
      .length,
    failedCount: contents.filter(
      (c) => c.status === "publish_error" || c.status === "partial_publish"
    ).length,
    orderCount: orders.length,
    platformCoverage: [...platforms],
    unansweredInteractions: bundle.interactions.filter(
      (i) => !["replied", "closed"].includes(i.status)
    ).length,
    contents: contents.slice(0, 12),
    orders: orders.slice(0, 8),
    suggestions: bundle.suggestions.slice(0, 4),
  };
}
