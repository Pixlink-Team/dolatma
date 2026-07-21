import { getSql } from "@/lib/db/client";
import {
  isDirectiveInternalTarget,
  mapDirectiveCtaKind,
  type DirectiveCtaKind,
  type DirectiveInternalTarget,
} from "@/lib/directive-cta";
import type {
  CampaignDirective,
  DirectiveAttachment,
  DirectiveAudienceType,
  DirectivePriority,
  DirectiveRecipient,
  DirectiveSmsStatus,
} from "@/lib/types";
import type { UserRegion } from "@/lib/user-regions";
import { isAdminRole } from "@/lib/user-roles";
import { generateId } from "@/lib/utils";

function toDateString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).split("T")[0] || null;
}

function toIsoString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapAttachment(row: Record<string, unknown>): DirectiveAttachment {
  const fileName = String(row.file_name ?? "");
  const titleRaw = String(row.title ?? "").trim();
  return {
    id: String(row.id),
    directiveId: String(row.directive_id),
    title: titleRaw || fileName,
    fileUrl: String(row.file_url ?? ""),
    fileName,
    mimeType: String(row.mime_type ?? "application/octet-stream"),
    fileSize: Number(row.file_size ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

function mapPriority(value: unknown): DirectivePriority {
  return value === "urgent" ? "urgent" : "normal";
}

function mapAudienceType(value: unknown): DirectiveAudienceType {
  if (value === "region" || value === "users" || value === "ministry_city") return value;
  return "all";
}

function mapAudienceProvinces(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function mapRegion(value: unknown): UserRegion | null {
  if (value === "north" || value === "south" || value === "east" || value === "west") {
    return value;
  }
  return null;
}

function mapSmsStatus(value: unknown): DirectiveSmsStatus {
  if (
    value === "sent" ||
    value === "failed" ||
    value === "no_phone" ||
    value === "skipped" ||
    value === "pending"
  ) {
    return value;
  }
  return "pending";
}

function mapCtaTarget(value: unknown): DirectiveInternalTarget | null {
  return isDirectiveInternalTarget(value) ? value : null;
}

function mapDirectiveRow(
  row: Record<string, unknown>,
  attachments: DirectiveAttachment[]
): CampaignDirective {
  const dueDate = toDateString(row.due_date);
  const startDate = toDateString(row.start_date);
  const endDate = toDateString(row.end_date) ?? dueDate;
  const letterFileUrl = row.letter_file_url ? String(row.letter_file_url) : null;
  const letterFromAttachment =
    !letterFileUrl && attachments[0]
      ? {
          letterFileUrl: attachments[0].fileUrl,
          letterFileName: attachments[0].fileName,
          letterMimeType: attachments[0].mimeType,
          letterFileSize: attachments[0].fileSize,
        }
      : null;
  const ctaKind = mapDirectiveCtaKind(row.cta_kind);

  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    createdByName: row.created_by_name ? String(row.created_by_name) : null,
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    priority: mapPriority(row.priority),
    dueDate,
    startDate,
    endDate,
    letterFileUrl: letterFileUrl ?? letterFromAttachment?.letterFileUrl ?? null,
    letterFileName: row.letter_file_name
      ? String(row.letter_file_name)
      : letterFromAttachment?.letterFileName ?? null,
    letterMimeType: row.letter_mime_type
      ? String(row.letter_mime_type)
      : letterFromAttachment?.letterMimeType ?? null,
    letterFileSize:
      row.letter_file_size != null
        ? Number(row.letter_file_size)
        : letterFromAttachment?.letterFileSize ?? 0,
    ctaKind,
    ctaLabel: row.cta_label ? String(row.cta_label) : null,
    ctaUrl: row.cta_url ? String(row.cta_url) : null,
    ctaTarget: mapCtaTarget(row.cta_target),
    audienceType: mapAudienceType(row.audience_type),
    audienceRegion: mapRegion(row.audience_region),
    audienceMinistryId: row.audience_ministry_id ? String(row.audience_ministry_id) : null,
    audienceMinistryName: row.audience_ministry_name
      ? String(row.audience_ministry_name)
      : null,
    audienceOrganizationId: row.audience_organization_id
      ? String(row.audience_organization_id)
      : null,
    audienceOrganizationName: row.audience_organization_name
      ? String(row.audience_organization_name)
      : null,
    audienceProvinces: mapAudienceProvinces(row.audience_cities),
    published: Boolean(row.published),
    publishedAt: toIsoString(row.published_at),
    archivedAt: toIsoString(row.archived_at),
    crisisMode: Boolean(row.crisis_mode),
    escalationAfterMinutes:
      row.escalation_after_minutes != null ? Number(row.escalation_after_minutes) : 30,
    escalatedAt: toIsoString(row.escalated_at),
    topic: row.topic != null ? String(row.topic) : "",
    sortOrder: Number(row.sort_order ?? 0),
    attachments,
    seenCount: row.seen_count != null ? Number(row.seen_count) : undefined,
    unseenCount: row.unseen_count != null ? Number(row.unseen_count) : undefined,
    recipientCount: row.recipient_count != null ? Number(row.recipient_count) : undefined,
    confirmed: row.confirmed != null ? Boolean(row.confirmed) : undefined,
    seenAt: toIsoString(row.seen_at),
    hasActionPlan: row.has_action_plan != null ? Boolean(row.has_action_plan) : undefined,
    actionPlanCount:
      row.action_plan_count != null ? Number(row.action_plan_count) : undefined,
    executedAt: toIsoString(row.executed_at),
    executionVerifiedAt: toIsoString(row.execution_verified_at),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

async function loadAttachmentsForDirectives(
  directiveIds: string[]
): Promise<Map<string, DirectiveAttachment[]>> {
  const map = new Map<string, DirectiveAttachment[]>();
  if (directiveIds.length === 0) return map;

  const sql = getSql();
  const rows = await sql`
    SELECT * FROM directive_attachments
    WHERE directive_id IN ${sql(directiveIds)}
    ORDER BY sort_order ASC, created_at ASC
  `;

  for (const row of rows) {
    const attachment = mapAttachment(row as Record<string, unknown>);
    const list = map.get(attachment.directiveId) ?? [];
    list.push(attachment);
    map.set(attachment.directiveId, list);
  }
  return map;
}

export async function pgListCampaignUsersForDirectives(
  campaignId: string,
  options?: { parentUserId?: string }
): Promise<
  Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    region: UserRegion | null;
    phone: string | null;
    province: string | null;
    city: string | null;
    ministryId: string | null;
    ministryName: string | null;
    organizationId: string | null;
    organizationName: string | null;
  }>
> {
  const sql = getSql();
  const parentUserId = options?.parentUserId?.trim() || null;

  const rows = parentUserId
    ? await sql`
        SELECT
          u.id, u.name, u.email, u.role, u.region, u.phone,
          u.province, u.city, u.ministry_id, m.name AS ministry_name,
          u.organization_id, o.name AS organization_name
        FROM users u
        INNER JOIN user_campaign_access uca ON uca.user_id = u.id
        LEFT JOIN ministries m ON m.id = u.ministry_id
        LEFT JOIN ministry_organizations o ON o.id = u.organization_id
        WHERE uca.campaign_id = ${campaignId}
          AND u.parent_user_id = ${parentUserId}
          AND u.role = 'sub_user'
        ORDER BY u.name ASC
      `
    : await sql`
        SELECT
          u.id, u.name, u.email, u.role, u.region, u.phone,
          u.province, u.city, u.ministry_id, m.name AS ministry_name,
          u.organization_id, o.name AS organization_name
        FROM users u
        INNER JOIN user_campaign_access uca ON uca.user_id = u.id
        LEFT JOIN ministries m ON m.id = u.ministry_id
        LEFT JOIN ministry_organizations o ON o.id = u.organization_id
        WHERE uca.campaign_id = ${campaignId}
          AND u.role IN ('contributor', 'client', 'ministry_parent', 'sub_user')
        ORDER BY u.name ASC
      `;

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    role: String(row.role ?? "contributor"),
    region: mapRegion(row.region),
    phone: typeof row.phone === "string" && row.phone.trim() ? String(row.phone).trim() : null,
    province: typeof row.province === "string" && row.province.trim() ? String(row.province).trim() : null,
    city: typeof row.city === "string" && row.city.trim() ? String(row.city).trim() : null,
    ministryId: row.ministry_id ? String(row.ministry_id) : null,
    ministryName: typeof row.ministry_name === "string" ? String(row.ministry_name) : null,
    organizationId: row.organization_id ? String(row.organization_id) : null,
    organizationName:
      typeof row.organization_name === "string" ? String(row.organization_name) : null,
  }));
}

export async function pgResolveDirectiveAudienceUserIds(input: {
  campaignId: string;
  audienceType: DirectiveAudienceType;
  audienceRegion?: UserRegion | null;
  audienceMinistryId?: string | null;
  audienceOrganizationId?: string | null;
  audienceProvinces?: string[];
  selectedUserIds?: string[];
  /** When set, only these users may be resolved (e.g. issuer's subordinates). */
  allowedUserIds?: string[] | null;
  /** Limit the candidate pool to subordinates of this parent. */
  parentUserId?: string | null;
}): Promise<string[]> {
  const users = await pgListCampaignUsersForDirectives(input.campaignId, {
    parentUserId: input.parentUserId ?? undefined,
  });
  const allowed =
    input.allowedUserIds && input.allowedUserIds.length > 0
      ? new Set(input.allowedUserIds)
      : null;
  const inScope = (userId: string) => (allowed ? allowed.has(userId) : true);

  if (input.audienceType === "users") {
    const selected = new Set(input.selectedUserIds ?? []);
    return users
      .filter((user) => selected.has(user.id) && inScope(user.id))
      .map((user) => user.id);
  }

  if (input.audienceType === "region") {
    const region = input.audienceRegion;
    if (!region) return [];
    return users
      .filter((user) => user.region === region && inScope(user.id))
      .map((user) => user.id);
  }

  if (input.audienceType === "ministry_city") {
    const ministryId = input.audienceMinistryId?.trim();
    const organizationId = input.audienceOrganizationId?.trim() || null;
    const provinces = (input.audienceProvinces ?? [])
      .map((province) => province.trim())
      .filter(Boolean);
    if (!ministryId || provinces.length === 0) return [];

    const provinceSet = new Set(provinces.map((province) => province.toLowerCase()));
    return users
      .filter((user) => {
        if (!inScope(user.id)) return false;
        if (user.ministryId !== ministryId) return false;
        if (organizationId && user.organizationId !== organizationId) {
          // Parent of the ministry still receives ministry/org-scoped directives.
          if (user.role !== "ministry_parent") return false;
        }
        if (user.role === "ministry_parent") return true;
        return Boolean(user.province && provinceSet.has(user.province.toLowerCase()));
      })
      .map((user) => user.id);
  }

  return users.filter((user) => inScope(user.id)).map((user) => user.id);
}

export async function pgListDirectivesForCampaign(
  campaignId: string,
  options?: { createdByUserId?: string }
): Promise<CampaignDirective[]> {
  const sql = getSql();
  const createdByUserId = options?.createdByUserId?.trim() || null;
  const rows = createdByUserId
    ? await sql`
        SELECT
          d.*,
          creator.name AS created_by_name,
          ministry.name AS audience_ministry_name,
          org.name AS audience_organization_name,
          COALESCE(stats.recipient_count, 0)::int AS recipient_count,
          COALESCE(stats.seen_count, 0)::int AS seen_count,
          COALESCE(stats.unseen_count, 0)::int AS unseen_count,
          COALESCE(stats.action_plan_count, 0)::int AS action_plan_count
        FROM campaign_directives d
        LEFT JOIN users creator ON creator.id = d.created_by_user_id
        LEFT JOIN ministries ministry ON ministry.id = d.audience_ministry_id
        LEFT JOIN ministry_organizations org ON org.id = d.audience_organization_id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS recipient_count,
            COUNT(*) FILTER (WHERE confirmed = true)::int AS seen_count,
            COUNT(*) FILTER (WHERE confirmed = false)::int AS unseen_count,
            (
              SELECT COUNT(*)::int
              FROM directive_action_plans ap
              WHERE ap.directive_id = d.id
            ) AS action_plan_count
          FROM directive_recipients r
          WHERE r.directive_id = d.id
        ) stats ON true
        WHERE d.campaign_id = ${campaignId}
          AND d.archived_at IS NULL
          AND d.created_by_user_id = ${createdByUserId}
        ORDER BY d.created_at DESC
      `
    : await sql`
        SELECT
          d.*,
          creator.name AS created_by_name,
          ministry.name AS audience_ministry_name,
          org.name AS audience_organization_name,
          COALESCE(stats.recipient_count, 0)::int AS recipient_count,
          COALESCE(stats.seen_count, 0)::int AS seen_count,
          COALESCE(stats.unseen_count, 0)::int AS unseen_count,
          COALESCE(stats.action_plan_count, 0)::int AS action_plan_count
        FROM campaign_directives d
        LEFT JOIN users creator ON creator.id = d.created_by_user_id
        LEFT JOIN ministries ministry ON ministry.id = d.audience_ministry_id
        LEFT JOIN ministry_organizations org ON org.id = d.audience_organization_id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS recipient_count,
            COUNT(*) FILTER (WHERE confirmed = true)::int AS seen_count,
            COUNT(*) FILTER (WHERE confirmed = false)::int AS unseen_count,
            (
              SELECT COUNT(*)::int
              FROM directive_action_plans ap
              WHERE ap.directive_id = d.id
            ) AS action_plan_count
          FROM directive_recipients r
          WHERE r.directive_id = d.id
        ) stats ON true
        WHERE d.campaign_id = ${campaignId}
          AND d.archived_at IS NULL
        ORDER BY d.created_at DESC
      `;

  const ids = rows.map((row) => String(row.id));
  const attachmentsMap = await loadAttachmentsForDirectives(ids);

  return rows.map((row) =>
    mapDirectiveRow(row as Record<string, unknown>, attachmentsMap.get(String(row.id)) ?? [])
  );
}

export async function pgListArchivedDirectivesForCampaign(
  campaignId: string,
  options?: { createdByUserId?: string }
): Promise<CampaignDirective[]> {
  const sql = getSql();
  const createdByUserId = options?.createdByUserId?.trim() || null;
  const rows = createdByUserId
    ? await sql`
        SELECT
          d.*,
          creator.name AS created_by_name,
          ministry.name AS audience_ministry_name,
          org.name AS audience_organization_name,
          COALESCE(stats.recipient_count, 0)::int AS recipient_count,
          COALESCE(stats.seen_count, 0)::int AS seen_count,
          COALESCE(stats.unseen_count, 0)::int AS unseen_count,
          COALESCE(stats.action_plan_count, 0)::int AS action_plan_count
        FROM campaign_directives d
        LEFT JOIN users creator ON creator.id = d.created_by_user_id
        LEFT JOIN ministries ministry ON ministry.id = d.audience_ministry_id
        LEFT JOIN ministry_organizations org ON org.id = d.audience_organization_id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS recipient_count,
            COUNT(*) FILTER (WHERE confirmed = true)::int AS seen_count,
            COUNT(*) FILTER (WHERE confirmed = false)::int AS unseen_count,
            (
              SELECT COUNT(*)::int
              FROM directive_action_plans ap
              WHERE ap.directive_id = d.id
            ) AS action_plan_count
          FROM directive_recipients r
          WHERE r.directive_id = d.id
        ) stats ON true
        WHERE d.campaign_id = ${campaignId}
          AND d.archived_at IS NOT NULL
          AND d.created_by_user_id = ${createdByUserId}
        ORDER BY d.archived_at DESC, d.created_at DESC
      `
    : await sql`
        SELECT
          d.*,
          creator.name AS created_by_name,
          ministry.name AS audience_ministry_name,
          org.name AS audience_organization_name,
          COALESCE(stats.recipient_count, 0)::int AS recipient_count,
          COALESCE(stats.seen_count, 0)::int AS seen_count,
          COALESCE(stats.unseen_count, 0)::int AS unseen_count,
          COALESCE(stats.action_plan_count, 0)::int AS action_plan_count
        FROM campaign_directives d
        LEFT JOIN users creator ON creator.id = d.created_by_user_id
        LEFT JOIN ministries ministry ON ministry.id = d.audience_ministry_id
        LEFT JOIN ministry_organizations org ON org.id = d.audience_organization_id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS recipient_count,
            COUNT(*) FILTER (WHERE confirmed = true)::int AS seen_count,
            COUNT(*) FILTER (WHERE confirmed = false)::int AS unseen_count,
            (
              SELECT COUNT(*)::int
              FROM directive_action_plans ap
              WHERE ap.directive_id = d.id
            ) AS action_plan_count
          FROM directive_recipients r
          WHERE r.directive_id = d.id
        ) stats ON true
        WHERE d.campaign_id = ${campaignId}
          AND d.archived_at IS NOT NULL
        ORDER BY d.archived_at DESC, d.created_at DESC
      `;

  const ids = rows.map((row) => String(row.id));
  const attachmentsMap = await loadAttachmentsForDirectives(ids);

  return rows.map((row) =>
    mapDirectiveRow(row as Record<string, unknown>, attachmentsMap.get(String(row.id)) ?? [])
  );
}

export async function pgListDirectivesForUserInbox(
  campaignId: string,
  userId: string
): Promise<CampaignDirective[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      d.*,
      creator.name AS created_by_name,
      ministry.name AS audience_ministry_name,
      org.name AS audience_organization_name,
      r.confirmed,
      r.seen_at,
      (ap.id IS NOT NULL) AS has_action_plan
    FROM campaign_directives d
    INNER JOIN directive_recipients r ON r.directive_id = d.id AND r.user_id = ${userId}
    LEFT JOIN users creator ON creator.id = d.created_by_user_id
    LEFT JOIN ministries ministry ON ministry.id = d.audience_ministry_id
    LEFT JOIN ministry_organizations org ON org.id = d.audience_organization_id
    LEFT JOIN directive_action_plans ap
      ON ap.directive_id = d.id AND ap.user_id = ${userId}
    WHERE d.campaign_id = ${campaignId}
      AND d.published = true
      AND d.archived_at IS NULL
    ORDER BY d.created_at DESC
  `;

  const ids = rows.map((row) => String(row.id));
  const attachmentsMap = await loadAttachmentsForDirectives(ids);

  return rows.map((row) =>
    mapDirectiveRow(row as Record<string, unknown>, attachmentsMap.get(String(row.id)) ?? [])
  );
}

export async function pgGetDirectiveById(id: string): Promise<CampaignDirective | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      d.*,
      creator.name AS created_by_name,
      ministry.name AS audience_ministry_name,
      org.name AS audience_organization_name,
      COALESCE(stats.recipient_count, 0)::int AS recipient_count,
      COALESCE(stats.seen_count, 0)::int AS seen_count,
      COALESCE(stats.unseen_count, 0)::int AS unseen_count,
      COALESCE(stats.action_plan_count, 0)::int AS action_plan_count
    FROM campaign_directives d
    LEFT JOIN users creator ON creator.id = d.created_by_user_id
    LEFT JOIN ministries ministry ON ministry.id = d.audience_ministry_id
    LEFT JOIN ministry_organizations org ON org.id = d.audience_organization_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS recipient_count,
        COUNT(*) FILTER (WHERE confirmed = true)::int AS seen_count,
        COUNT(*) FILTER (WHERE confirmed = false)::int AS unseen_count,
        (
          SELECT COUNT(*)::int
          FROM directive_action_plans ap
          WHERE ap.directive_id = d.id
        ) AS action_plan_count
      FROM directive_recipients r
      WHERE r.directive_id = d.id
    ) stats ON true
    WHERE d.id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return null;

  const attachmentsMap = await loadAttachmentsForDirectives([id]);
  return mapDirectiveRow(
    rows[0] as Record<string, unknown>,
    attachmentsMap.get(id) ?? []
  );
}

export async function pgListDirectiveRecipients(
  directiveId: string
): Promise<DirectiveRecipient[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      r.*,
      u.name AS user_name,
      u.email AS user_email,
      u.role AS user_role,
      u.phone AS user_phone,
      u.alternate_contact_name,
      u.alternate_contact_phone,
      u.account_manager_name,
      r.executed_at,
      r.execution_verified_at,
      r.execution_verified_by,
      ap.id AS action_plan_id
    FROM directive_recipients r
    INNER JOIN users u ON u.id = r.user_id
    LEFT JOIN directive_action_plans ap
      ON ap.directive_id = r.directive_id AND ap.user_id = r.user_id
    WHERE r.directive_id = ${directiveId}
    ORDER BY u.name ASC
  `;

  return rows.map((row) => ({
    directiveId: String(row.directive_id),
    userId: String(row.user_id),
    userName: String(row.user_name ?? ""),
    userEmail: String(row.user_email ?? ""),
    userRole: (isAdminRole(String(row.user_role ?? "contributor"))
      ? String(row.user_role)
      : "contributor") as DirectiveRecipient["userRole"],
    userPhone:
      typeof row.user_phone === "string" && row.user_phone.trim()
        ? String(row.user_phone).trim()
        : null,
    alternateContactName:
      typeof row.alternate_contact_name === "string" && row.alternate_contact_name.trim()
        ? String(row.alternate_contact_name).trim()
        : null,
    alternateContactPhone:
      typeof row.alternate_contact_phone === "string" && row.alternate_contact_phone.trim()
        ? String(row.alternate_contact_phone).trim()
        : null,
    accountManagerName:
      typeof row.account_manager_name === "string" && row.account_manager_name.trim()
        ? String(row.account_manager_name).trim()
        : null,
    smsStatus: mapSmsStatus(row.sms_status),
    smsError: row.sms_error ? String(row.sms_error) : null,
    smsSentAt: toIsoString(row.sms_sent_at),
    seenAt: toIsoString(row.seen_at),
    confirmed: Boolean(row.confirmed),
    hasActionPlan: Boolean(row.action_plan_id),
    actionPlanId: row.action_plan_id ? String(row.action_plan_id) : null,
    executedAt: toIsoString(row.executed_at),
    executionVerifiedAt: toIsoString(row.execution_verified_at),
    executionVerifiedBy: row.execution_verified_by
      ? String(row.execution_verified_by)
      : null,
  }));
}

export interface SaveDirectiveInput {
  id?: string;
  campaignId: string;
  createdByUserId?: string | null;
  title: string;
  body: string;
  priority: DirectivePriority;
  startDate?: string | null;
  endDate?: string | null;
  letterFileUrl?: string | null;
  letterFileName?: string | null;
  letterMimeType?: string | null;
  letterFileSize?: number;
  ctaKind?: DirectiveCtaKind;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  ctaTarget?: string | null;
  audienceType: DirectiveAudienceType;
  audienceRegion?: UserRegion | null;
  audienceMinistryId?: string | null;
  audienceOrganizationId?: string | null;
  audienceProvinces?: string[];
  published?: boolean;
  attachments?: Array<{
    id?: string;
    title: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }>;
  selectedUserIds?: string[];
  /** When set, audience resolution is limited to this parent's sub-users. */
  parentUserId?: string | null;
  crisisMode?: boolean;
  escalationAfterMinutes?: number;
  topic?: string | null;
}

export async function pgSaveDirective(input: SaveDirectiveInput): Promise<{ id: string }> {
  const sql = getSql();
  const id = input.id ?? generateId();
  const now = new Date().toISOString();
  const published = input.published ?? true;
  const startDate = input.startDate?.trim() || null;
  const endDate = input.endDate?.trim() || null;
  const letterFileUrl = input.letterFileUrl?.trim() || null;
  const letterFileName = input.letterFileName?.trim() || null;
  const letterMimeType = input.letterMimeType?.trim() || null;
  const letterFileSize = letterFileUrl ? Number(input.letterFileSize ?? 0) : 0;
  const ctaKind = mapDirectiveCtaKind(input.ctaKind);
  const ctaLabel = ctaKind === "none" ? null : input.ctaLabel?.trim() || null;
  const ctaUrl = ctaKind === "external" ? input.ctaUrl?.trim() || null : null;
  const ctaTarget =
    ctaKind === "internal" && isDirectiveInternalTarget(input.ctaTarget)
      ? input.ctaTarget
      : null;
  const audienceRegion =
    input.audienceType === "region" ? (input.audienceRegion ?? null) : null;
  const audienceMinistryId =
    input.audienceType === "ministry_city" ? (input.audienceMinistryId?.trim() || null) : null;
  const audienceOrganizationId =
    input.audienceType === "ministry_city"
      ? (input.audienceOrganizationId?.trim() || null)
      : null;
  const audienceDeviceId =
    input.audienceType === "ministry_city"
      ? audienceOrganizationId ?? audienceMinistryId
      : null;
  const audienceProvinces =
    input.audienceType === "ministry_city"
      ? (input.audienceProvinces ?? []).map((province) => province.trim()).filter(Boolean)
      : [];
  const crisisMode = Boolean(input.crisisMode);
  const escalationAfterMinutes = Math.max(
    5,
    Math.min(24 * 60, Number(input.escalationAfterMinutes ?? 30) || 30)
  );
  const topic = input.topic?.trim() || "";
  const urgency = crisisMode ? "critical" : undefined;

  const existing = input.id
    ? await sql`SELECT id, published_at FROM campaign_directives WHERE id = ${id} LIMIT 1`
    : [];
  const wasNew = existing.length === 0;
  const previousPublishedAt = existing[0]?.published_at
    ? toIsoString(existing[0].published_at)
    : null;
  const publishedAt = published
    ? previousPublishedAt ?? now
    : null;

  await sql`
    INSERT INTO campaign_directives (
      id, campaign_id, created_by_user_id, title, body, priority, due_date,
      start_date, end_date, letter_file_url, letter_file_name, letter_mime_type, letter_file_size,
      cta_kind, cta_label, cta_url, cta_target,
      audience_type, audience_region, audience_ministry_id, audience_organization_id, audience_device_id, audience_cities,
      published, published_at, sort_order, created_at, updated_at,
      crisis_mode, escalation_after_minutes, topic, urgency
    ) VALUES (
      ${id},
      ${input.campaignId},
      ${input.createdByUserId ?? null},
      ${input.title},
      ${input.body},
      ${input.priority},
      ${endDate},
      ${startDate},
      ${endDate},
      ${letterFileUrl},
      ${letterFileName},
      ${letterMimeType},
      ${letterFileSize},
      ${ctaKind},
      ${ctaLabel},
      ${ctaUrl},
      ${ctaTarget},
      ${input.audienceType},
      ${audienceRegion},
      ${audienceMinistryId},
      ${audienceOrganizationId},
      ${audienceDeviceId},
      ${audienceProvinces},
      ${published},
      ${publishedAt},
      0,
      ${now},
      ${now},
      ${crisisMode},
      ${escalationAfterMinutes},
      ${topic},
      ${urgency ?? "normal"}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      body = EXCLUDED.body,
      priority = EXCLUDED.priority,
      due_date = EXCLUDED.due_date,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      letter_file_url = EXCLUDED.letter_file_url,
      letter_file_name = EXCLUDED.letter_file_name,
      letter_mime_type = EXCLUDED.letter_mime_type,
      letter_file_size = EXCLUDED.letter_file_size,
      cta_kind = EXCLUDED.cta_kind,
      cta_label = EXCLUDED.cta_label,
      cta_url = EXCLUDED.cta_url,
      cta_target = EXCLUDED.cta_target,
      audience_type = EXCLUDED.audience_type,
      audience_region = EXCLUDED.audience_region,
      audience_ministry_id = EXCLUDED.audience_ministry_id,
      audience_organization_id = EXCLUDED.audience_organization_id,
      audience_device_id = EXCLUDED.audience_device_id,
      audience_cities = EXCLUDED.audience_cities,
      published = EXCLUDED.published,
      published_at = COALESCE(campaign_directives.published_at, EXCLUDED.published_at),
      crisis_mode = EXCLUDED.crisis_mode,
      escalation_after_minutes = EXCLUDED.escalation_after_minutes,
      topic = EXCLUDED.topic,
      urgency = CASE
        WHEN EXCLUDED.crisis_mode THEN 'critical'
        ELSE campaign_directives.urgency
      END,
      updated_at = EXCLUDED.updated_at
  `;

  // Extra titled action files (official letter stays on campaign_directives columns).
  await sql`DELETE FROM directive_attachments WHERE directive_id = ${id}`;
  const attachments = (input.attachments ?? [])
    .map((item) => ({
      id: item.id?.trim() || generateId(),
      title: item.title.trim(),
      fileUrl: item.fileUrl.trim(),
      fileName: item.fileName.trim() || "file",
      mimeType: item.mimeType.trim() || "application/octet-stream",
      fileSize: Number(item.fileSize ?? 0),
    }))
    .filter((item) => item.title && item.fileUrl);

  for (let index = 0; index < attachments.length; index++) {
    const attachment = attachments[index];
    await sql`
      INSERT INTO directive_attachments (
        id, directive_id, title, file_url, file_name, mime_type, file_size, sort_order, created_at
      ) VALUES (
        ${attachment.id},
        ${id},
        ${attachment.title},
        ${attachment.fileUrl},
        ${attachment.fileName},
        ${attachment.mimeType},
        ${attachment.fileSize},
        ${index},
        ${now}
      )
    `;
  }

  const recipientIds = published
    ? await pgResolveDirectiveAudienceUserIds({
        campaignId: input.campaignId,
        audienceType: input.audienceType,
        audienceRegion,
        audienceMinistryId,
        audienceOrganizationId,
        audienceProvinces,
        selectedUserIds: input.selectedUserIds,
        parentUserId: input.parentUserId,
      })
    : [];

  const existingRecipients = await sql`
    SELECT user_id, confirmed, seen_at, sms_status, sms_error, sms_sent_at
    FROM directive_recipients
    WHERE directive_id = ${id}
  `;
  const previousByUser = new Map(
    existingRecipients.map((row) => [String(row.user_id), row])
  );

  await sql`DELETE FROM directive_recipients WHERE directive_id = ${id}`;

  for (const userId of recipientIds) {
    const previous = previousByUser.get(userId);
    await sql`
      INSERT INTO directive_recipients (
        directive_id, user_id, sms_status, sms_error, sms_sent_at, seen_at, confirmed, created_at
      ) VALUES (
        ${id},
        ${userId},
        ${previous ? String(previous.sms_status ?? "pending") : "pending"},
        ${previous?.sms_error ? String(previous.sms_error) : null},
        ${previous?.sms_sent_at ? toIsoString(previous.sms_sent_at) : null},
        ${previous?.seen_at ? toIsoString(previous.seen_at) : null},
        ${previous ? Boolean(previous.confirmed) : false},
        ${now}
      )
    `;
  }

  void wasNew;
  return { id };
}

export async function pgArchiveDirective(id: string): Promise<boolean> {
  const sql = getSql();
  const now = new Date().toISOString();
  const rows = await sql`
    UPDATE campaign_directives
    SET archived_at = COALESCE(archived_at, ${now}),
        updated_at = ${now}
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function pgConfirmDirectiveSeen(
  directiveId: string,
  userId: string
): Promise<boolean> {
  const sql = getSql();
  const now = new Date().toISOString();
  const rows = await sql`
    UPDATE directive_recipients
    SET confirmed = true,
        seen_at = COALESCE(seen_at, ${now})
    WHERE directive_id = ${directiveId}
      AND user_id = ${userId}
    RETURNING user_id
  `;
  return rows.length > 0;
}

export async function pgMarkDirectiveSeen(
  directiveId: string,
  userId: string
): Promise<boolean> {
  const sql = getSql();
  const now = new Date().toISOString();
  const rows = await sql`
    UPDATE directive_recipients
    SET seen_at = COALESCE(seen_at, ${now})
    WHERE directive_id = ${directiveId}
      AND user_id = ${userId}
    RETURNING user_id
  `;
  return rows.length > 0;
}

export async function pgMarkDirectiveExecuted(
  directiveId: string,
  userId: string
): Promise<boolean> {
  const sql = getSql();
  const now = new Date().toISOString();
  const rows = await sql`
    UPDATE directive_recipients
    SET executed_at = COALESCE(executed_at, ${now}),
        seen_at = COALESCE(seen_at, ${now}),
        confirmed = true
    WHERE directive_id = ${directiveId}
      AND user_id = ${userId}
    RETURNING user_id
  `;
  return rows.length > 0;
}

export async function pgVerifyDirectiveExecution(
  directiveId: string,
  userId: string,
  verifiedBy: string
): Promise<boolean> {
  const sql = getSql();
  const now = new Date().toISOString();
  const rows = await sql`
    UPDATE directive_recipients
    SET execution_verified_at = COALESCE(execution_verified_at, ${now}),
        execution_verified_by = COALESCE(execution_verified_by, ${verifiedBy}),
        executed_at = COALESCE(executed_at, ${now})
    WHERE directive_id = ${directiveId}
      AND user_id = ${userId}
    RETURNING user_id
  `;
  return rows.length > 0;
}

export async function pgMarkDirectiveEscalated(directiveId: string): Promise<boolean> {
  const sql = getSql();
  const now = new Date().toISOString();
  const rows = await sql`
    UPDATE campaign_directives
    SET escalated_at = COALESCE(escalated_at, ${now}),
        updated_at = ${now}
    WHERE id = ${directiveId}
      AND crisis_mode = true
      AND escalated_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function pgListCrisisEscalationTargets(directiveId: string): Promise<
  Array<{
    userId: string;
    userName: string;
    phone: string | null;
    alternateContactName: string | null;
    alternateContactPhone: string | null;
    accountManagerName: string | null;
  }>
> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      u.phone,
      u.alternate_contact_name,
      u.alternate_contact_phone,
      u.account_manager_name
    FROM directive_recipients r
    INNER JOIN users u ON u.id = r.user_id
    INNER JOIN campaign_directives d ON d.id = r.directive_id
    WHERE r.directive_id = ${directiveId}
      AND d.crisis_mode = true
      AND r.confirmed = false
      AND d.published = true
      AND d.escalated_at IS NULL
      AND d.published_at IS NOT NULL
      AND d.published_at <= (now() - make_interval(mins => GREATEST(COALESCE(d.escalation_after_minutes, 30), 5)))
  `;
  return rows.map((row) => ({
    userId: String(row.user_id),
    userName: String(row.user_name ?? ""),
    phone:
      typeof row.phone === "string" && row.phone.trim() ? String(row.phone).trim() : null,
    alternateContactName:
      typeof row.alternate_contact_name === "string" && row.alternate_contact_name.trim()
        ? String(row.alternate_contact_name).trim()
        : null,
    alternateContactPhone:
      typeof row.alternate_contact_phone === "string" && row.alternate_contact_phone.trim()
        ? String(row.alternate_contact_phone).trim()
        : null,
    accountManagerName:
      typeof row.account_manager_name === "string" && row.account_manager_name.trim()
        ? String(row.account_manager_name).trim()
        : null,
  }));
}

export async function pgListCalendarDirectives(campaignId?: string | null) {
  const sql = getSql();
  const campaignFilter = campaignId?.trim() || null;
  const rows = await sql`
    SELECT
      d.id,
      d.campaign_id,
      d.title,
      d.start_date,
      d.end_date,
      d.topic,
      d.audience_device_id,
      d.audience_ministry_id,
      d.audience_organization_id,
      d.audience_cities,
      d.crisis_mode,
      d.published,
      cs.title AS campaign_title
    FROM campaign_directives d
    INNER JOIN campaign_settings cs ON cs.id = d.campaign_id
    WHERE d.archived_at IS NULL
      AND (${campaignFilter}::uuid IS NULL OR d.campaign_id = ${campaignFilter})
    ORDER BY COALESCE(d.start_date, d.end_date, d.created_at::date) ASC
  `;
  return rows.map((row) => ({
    id: String(row.id),
    campaignId: String(row.campaign_id),
    campaignTitle: String(row.campaign_title ?? ""),
    title: String(row.title ?? ""),
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date),
    topic: String(row.topic ?? ""),
    deviceId: row.audience_device_id
      ? String(row.audience_device_id)
      : row.audience_organization_id
        ? String(row.audience_organization_id)
        : row.audience_ministry_id
          ? String(row.audience_ministry_id)
          : null,
    provinces: mapAudienceProvinces(row.audience_cities),
    crisisMode: Boolean(row.crisis_mode),
    published: Boolean(row.published),
  }));
}

export async function pgListCalendarCampaigns() {
  const sql = getSql();
  const rows = await sql`
    SELECT id, title, start_date, end_date, content_plans
    FROM campaign_settings
    ORDER BY COALESCE(start_date, end_date, created_at::date) ASC
  `;
  return rows.map((row) => {
    const rawPlans = row.content_plans;
    let plans: string[] = [];
    if (Array.isArray(rawPlans)) {
      plans = rawPlans
        .map((p) => {
          if (typeof p === "string") return p.trim();
          if (p && typeof p === "object" && "name" in p) {
            return String((p as { name?: string }).name ?? "").trim();
          }
          return "";
        })
        .filter(Boolean);
    }
    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      startDate: toDateString(row.start_date),
      endDate: toDateString(row.end_date),
      topics: plans,
    };
  });
}

export async function pgUpdateRecipientSmsStatus(input: {
  directiveId: string;
  userId: string;
  smsStatus: DirectiveSmsStatus;
  smsError?: string | null;
}): Promise<void> {
  const sql = getSql();
  const sentAt = input.smsStatus === "sent" ? new Date().toISOString() : null;
  await sql`
    UPDATE directive_recipients
    SET sms_status = ${input.smsStatus},
        sms_error = ${input.smsError ?? null},
        sms_sent_at = CASE
          WHEN ${input.smsStatus} = 'sent' THEN COALESCE(sms_sent_at, ${sentAt})
          ELSE sms_sent_at
        END
    WHERE directive_id = ${input.directiveId}
      AND user_id = ${input.userId}
  `;
}

export async function pgGetPendingSmsRecipients(directiveId: string): Promise<
  Array<{ userId: string; phone: string | null; userName: string }>
> {
  const sql = getSql();
  const rows = await sql`
    SELECT r.user_id, u.phone, u.name
    FROM directive_recipients r
    INNER JOIN users u ON u.id = r.user_id
    WHERE r.directive_id = ${directiveId}
      AND r.sms_status IN ('pending', 'failed')
  `;
  return rows.map((row) => ({
    userId: String(row.user_id),
    phone: typeof row.phone === "string" && row.phone.trim() ? String(row.phone).trim() : null,
    userName: String(row.name ?? ""),
  }));
}
