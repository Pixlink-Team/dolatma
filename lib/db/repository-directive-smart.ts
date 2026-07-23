import { getSql } from "@/lib/db/client";
import {
  AI_ACTION_REJECT_REASONS,
  AI_ACTION_STATUSES,
  PLAYBOOK_PATTERN_TYPES,
  type AiActionRejectReason,
  type AiActionStatus,
  type PlaybookPatternType,
} from "@/lib/directive-smart";
import { generateId } from "@/lib/utils";

export const DIRECTIVE_MEMORY_LAYERS = [
  "strategic",
  "operational",
  "content",
  "media",
  "audience",
  "failure",
  "success",
] as const;

export type DirectiveMemoryLayer = (typeof DIRECTIVE_MEMORY_LAYERS)[number];

export interface DirectiveAiSuggestion {
  id: string;
  directiveId: string;
  campaignId: string;
  userId: string;
  title: string;
  description: string;
  reason: string;
  linkedGoal: string;
  weaknessAddressed: string;
  expectedOutput: string;
  evidenceRequired: string;
  kpiImpact: string;
  confidence: number;
  status: AiActionStatus;
  rejectReason: AiActionRejectReason | null;
  rejectNote: string | null;
  dueAt: string | null;
  evidenceUrl: string | null;
  evidenceNote: string | null;
  linkedActionPlanId: string | null;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DirectiveAutopsy {
  id: string;
  directiveId: string;
  campaignId: string;
  plannedSummary: string;
  actualSummary: string;
  missingSummary: string;
  effectiveSummary: string;
  ineffectiveSummary: string;
  effectProven: string;
  effectLikely: string;
  effectNeedsData: string;
  externalSurveyData: Record<string, unknown>;
  externalFiles: unknown[];
  aiReport: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DirectiveMemoryEntry {
  id: string;
  directiveId: string | null;
  campaignId: string | null;
  layer: DirectiveMemoryLayer;
  title: string;
  body: string;
  tags: string[];
  isGlobal: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DirectivePlaybook {
  id: string;
  patternType: PlaybookPatternType;
  title: string;
  structureJson: Record<string, unknown>;
  sourceDirectiveId: string | null;
  successScore: number | null;
  kpiMet: boolean | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

function toIsoString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item).trim()).filter(Boolean);
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function mapAiStatus(value: unknown): AiActionStatus {
  return (AI_ACTION_STATUSES as readonly string[]).includes(String(value ?? ""))
    ? (value as AiActionStatus)
    : "suggested";
}

function mapRejectReason(value: unknown): AiActionRejectReason | null {
  if (
    typeof value === "string" &&
    (AI_ACTION_REJECT_REASONS as readonly string[]).includes(value)
  ) {
    return value as AiActionRejectReason;
  }
  return null;
}

function mapMemoryLayer(value: unknown): DirectiveMemoryLayer {
  return (DIRECTIVE_MEMORY_LAYERS as readonly string[]).includes(String(value ?? ""))
    ? (value as DirectiveMemoryLayer)
    : "operational";
}

function mapPatternType(value: unknown): PlaybookPatternType {
  return (PLAYBOOK_PATTERN_TYPES as readonly string[]).includes(String(value ?? ""))
    ? (value as PlaybookPatternType)
    : "service_info";
}

function mapAiSuggestion(row: Record<string, unknown>): DirectiveAiSuggestion {
  return {
    id: String(row.id),
    directiveId: String(row.directive_id),
    campaignId: String(row.campaign_id),
    userId: String(row.user_id),
    title: asString(row.title),
    description: asString(row.description),
    reason: asString(row.reason),
    linkedGoal: asString(row.linked_goal),
    weaknessAddressed: asString(row.weakness_addressed),
    expectedOutput: asString(row.expected_output),
    evidenceRequired: asString(row.evidence_required),
    kpiImpact: asString(row.kpi_impact),
    confidence: Number(row.confidence ?? 0.5),
    status: mapAiStatus(row.status),
    rejectReason: mapRejectReason(row.reject_reason),
    rejectNote: row.reject_note != null ? asString(row.reject_note) : null,
    dueAt: toIsoString(row.due_at),
    evidenceUrl: row.evidence_url != null ? asString(row.evidence_url) : null,
    evidenceNote: row.evidence_note != null ? asString(row.evidence_note) : null,
    linkedActionPlanId: row.linked_action_plan_id
      ? String(row.linked_action_plan_id)
      : null,
    provider: row.provider != null ? asString(row.provider) : null,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapAutopsy(row: Record<string, unknown>): DirectiveAutopsy {
  return {
    id: String(row.id),
    directiveId: String(row.directive_id),
    campaignId: String(row.campaign_id),
    plannedSummary: asString(row.planned_summary),
    actualSummary: asString(row.actual_summary),
    missingSummary: asString(row.missing_summary),
    effectiveSummary: asString(row.effective_summary),
    ineffectiveSummary: asString(row.ineffective_summary),
    effectProven: asString(row.effect_proven),
    effectLikely: asString(row.effect_likely),
    effectNeedsData: asString(row.effect_needs_data),
    externalSurveyData: asObject(row.external_survey_data),
    externalFiles: asUnknownArray(row.external_files),
    aiReport: row.ai_report != null ? asString(row.ai_report) : null,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapMemoryEntry(row: Record<string, unknown>): DirectiveMemoryEntry {
  return {
    id: String(row.id),
    directiveId: row.directive_id ? String(row.directive_id) : null,
    campaignId: row.campaign_id ? String(row.campaign_id) : null,
    layer: mapMemoryLayer(row.layer),
    title: asString(row.title),
    body: asString(row.body),
    tags: asStringArray(row.tags),
    isGlobal: Boolean(row.is_global),
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapPlaybook(row: Record<string, unknown>): DirectivePlaybook {
  return {
    id: String(row.id),
    patternType: mapPatternType(row.pattern_type),
    title: asString(row.title),
    structureJson: asObject(row.structure_json),
    sourceDirectiveId: row.source_directive_id
      ? String(row.source_directive_id)
      : null,
    successScore: row.success_score != null ? Number(row.success_score) : null,
    kpiMet: row.kpi_met != null ? Boolean(row.kpi_met) : null,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

export async function ensureDirectiveSmartExtraSchema(): Promise<void> {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS directive_ai_suggestions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      directive_id UUID NOT NULL REFERENCES campaign_directives(id) ON DELETE CASCADE,
      campaign_id UUID NOT NULL,
      user_id UUID NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reason TEXT NOT NULL,
      linked_goal TEXT NOT NULL DEFAULT '',
      weakness_addressed TEXT NOT NULL DEFAULT '',
      expected_output TEXT NOT NULL DEFAULT '',
      evidence_required TEXT NOT NULL DEFAULT '',
      kpi_impact TEXT NOT NULL DEFAULT '',
      confidence NUMERIC NOT NULL DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'suggested',
      reject_reason TEXT,
      reject_note TEXT,
      due_at TIMESTAMPTZ,
      evidence_url TEXT,
      evidence_note TEXT,
      linked_action_plan_id UUID,
      provider TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS directive_autopsies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      directive_id UUID NOT NULL UNIQUE REFERENCES campaign_directives(id) ON DELETE CASCADE,
      campaign_id UUID NOT NULL,
      planned_summary TEXT NOT NULL DEFAULT '',
      actual_summary TEXT NOT NULL DEFAULT '',
      missing_summary TEXT NOT NULL DEFAULT '',
      effective_summary TEXT NOT NULL DEFAULT '',
      ineffective_summary TEXT NOT NULL DEFAULT '',
      effect_proven TEXT NOT NULL DEFAULT '',
      effect_likely TEXT NOT NULL DEFAULT '',
      effect_needs_data TEXT NOT NULL DEFAULT '',
      external_survey_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      external_files JSONB NOT NULL DEFAULT '[]'::jsonb,
      ai_report TEXT,
      created_by_user_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS directive_memory_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      directive_id UUID REFERENCES campaign_directives(id) ON DELETE CASCADE,
      campaign_id UUID,
      layer TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tags TEXT[] NOT NULL DEFAULT '{}',
      is_global BOOLEAN NOT NULL DEFAULT false,
      created_by_user_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS directive_playbooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pattern_type TEXT NOT NULL,
      title TEXT NOT NULL,
      structure_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      source_directive_id UUID,
      success_score INT,
      kpi_met BOOLEAN,
      created_by_user_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_directive_ai_suggestions_directive
    ON directive_ai_suggestions (directive_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_directive_ai_suggestions_user
    ON directive_ai_suggestions (user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_directive_memory_directive
    ON directive_memory_entries (directive_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_directive_memory_global
    ON directive_memory_entries (is_global)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_directive_playbooks_pattern
    ON directive_playbooks (pattern_type)
  `;
}

const OPEN_AI_STATUSES: AiActionStatus[] = [
  "suggested",
  "accepted",
  "in_progress",
  "evidence_submitted",
  "approved",
];

export async function pgListAiSuggestionsForUser(
  userId: string,
  options?: { limit?: number }
): Promise<DirectiveAiSuggestion[]> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const limit = Math.max(1, Math.min(100, Number(options?.limit ?? 50) || 50));
  const rows = await sql`
    SELECT *
    FROM directive_ai_suggestions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => mapAiSuggestion(row as Record<string, unknown>));
}

export async function pgListAiSuggestionsForDirective(
  directiveId: string
): Promise<DirectiveAiSuggestion[]> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const rows = await sql`
    SELECT *
    FROM directive_ai_suggestions
    WHERE directive_id = ${directiveId}
    ORDER BY created_at DESC
  `;
  return rows.map((row) => mapAiSuggestion(row as Record<string, unknown>));
}

export async function pgCountOpenAiSuggestionsToday(input: {
  directiveId: string;
  userId: string;
}): Promise<number> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM directive_ai_suggestions
    WHERE directive_id = ${input.directiveId}
      AND user_id = ${input.userId}
      AND status IN ${sql(OPEN_AI_STATUSES)}
      AND created_at >= date_trunc('day', now())
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function pgGetAiSuggestionById(
  id: string
): Promise<DirectiveAiSuggestion | null> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const rows = await sql`
    SELECT * FROM directive_ai_suggestions WHERE id = ${id} LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapAiSuggestion(rows[0] as Record<string, unknown>);
}

export async function pgUpsertAiSuggestion(input: {
  id?: string;
  directiveId: string;
  campaignId: string;
  userId: string;
  title: string;
  description: string;
  reason: string;
  linkedGoal?: string;
  weaknessAddressed?: string;
  expectedOutput?: string;
  evidenceRequired?: string;
  kpiImpact?: string;
  confidence?: number;
  status?: AiActionStatus;
  dueAt?: string | null;
  provider?: string | null;
}): Promise<DirectiveAiSuggestion> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const id = input.id?.trim() || generateId();
  const now = new Date().toISOString();
  const confidence = Math.max(0, Math.min(1, Number(input.confidence ?? 0.5) || 0.5));
  const status = mapAiStatus(input.status ?? "suggested");

  await sql`
    INSERT INTO directive_ai_suggestions (
      id, directive_id, campaign_id, user_id, title, description, reason,
      linked_goal, weakness_addressed, expected_output, evidence_required, kpi_impact,
      confidence, status, due_at, provider, created_at, updated_at
    ) VALUES (
      ${id},
      ${input.directiveId},
      ${input.campaignId},
      ${input.userId},
      ${input.title.trim()},
      ${input.description.trim()},
      ${input.reason.trim()},
      ${(input.linkedGoal ?? "").trim()},
      ${(input.weaknessAddressed ?? "").trim()},
      ${(input.expectedOutput ?? "").trim()},
      ${(input.evidenceRequired ?? "").trim()},
      ${(input.kpiImpact ?? "").trim()},
      ${confidence},
      ${status},
      ${input.dueAt?.trim() || null},
      ${input.provider?.trim() || null},
      ${now},
      ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      reason = EXCLUDED.reason,
      linked_goal = EXCLUDED.linked_goal,
      weakness_addressed = EXCLUDED.weakness_addressed,
      expected_output = EXCLUDED.expected_output,
      evidence_required = EXCLUDED.evidence_required,
      kpi_impact = EXCLUDED.kpi_impact,
      confidence = EXCLUDED.confidence,
      status = EXCLUDED.status,
      due_at = EXCLUDED.due_at,
      provider = EXCLUDED.provider,
      updated_at = EXCLUDED.updated_at
  `;

  const saved = await pgGetAiSuggestionById(id);
  if (!saved) {
    throw new Error("Failed to upsert AI suggestion");
  }
  return saved;
}

export async function pgUpdateAiSuggestionStatus(input: {
  id: string;
  status: AiActionStatus;
  rejectReason?: AiActionRejectReason | null;
  rejectNote?: string | null;
  evidenceUrl?: string | null;
  evidenceNote?: string | null;
  linkedActionPlanId?: string | null;
}): Promise<DirectiveAiSuggestion | null> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const now = new Date().toISOString();
  const status = mapAiStatus(input.status);
  const rejectReason =
    status === "rejected" ? mapRejectReason(input.rejectReason) : null;
  const rejectNote =
    status === "rejected" ? input.rejectNote?.trim() || null : null;

  const rows = await sql`
    UPDATE directive_ai_suggestions
    SET status = ${status},
        reject_reason = ${rejectReason},
        reject_note = ${rejectNote},
        evidence_url = COALESCE(${input.evidenceUrl?.trim() || null}, evidence_url),
        evidence_note = COALESCE(${input.evidenceNote?.trim() || null}, evidence_note),
        linked_action_plan_id = COALESCE(
          ${input.linkedActionPlanId?.trim() || null},
          linked_action_plan_id
        ),
        updated_at = ${now}
    WHERE id = ${input.id}
    RETURNING *
  `;
  if (!rows[0]) return null;
  return mapAiSuggestion(rows[0] as Record<string, unknown>);
}

export async function pgGetAutopsyByDirective(
  directiveId: string
): Promise<DirectiveAutopsy | null> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const rows = await sql`
    SELECT * FROM directive_autopsies WHERE directive_id = ${directiveId} LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapAutopsy(rows[0] as Record<string, unknown>);
}

export async function pgSaveAutopsy(input: {
  id?: string;
  directiveId: string;
  campaignId: string;
  plannedSummary?: string;
  actualSummary?: string;
  missingSummary?: string;
  effectiveSummary?: string;
  ineffectiveSummary?: string;
  effectProven?: string;
  effectLikely?: string;
  effectNeedsData?: string;
  externalSurveyData?: Record<string, unknown>;
  externalFiles?: unknown[];
  aiReport?: string | null;
  createdByUserId?: string | null;
}): Promise<DirectiveAutopsy> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const existing = await pgGetAutopsyByDirective(input.directiveId);
  const id = input.id?.trim() || existing?.id || generateId();
  const now = new Date().toISOString();
  const surveyJson = sql.json(
    JSON.parse(JSON.stringify(input.externalSurveyData ?? existing?.externalSurveyData ?? {}))
  );
  const filesJson = sql.json(
    JSON.parse(JSON.stringify(input.externalFiles ?? existing?.externalFiles ?? []))
  );

  await sql`
    INSERT INTO directive_autopsies (
      id, directive_id, campaign_id,
      planned_summary, actual_summary, missing_summary,
      effective_summary, ineffective_summary,
      effect_proven, effect_likely, effect_needs_data,
      external_survey_data, external_files, ai_report,
      created_by_user_id, created_at, updated_at
    ) VALUES (
      ${id},
      ${input.directiveId},
      ${input.campaignId},
      ${(input.plannedSummary ?? existing?.plannedSummary ?? "").trim()},
      ${(input.actualSummary ?? existing?.actualSummary ?? "").trim()},
      ${(input.missingSummary ?? existing?.missingSummary ?? "").trim()},
      ${(input.effectiveSummary ?? existing?.effectiveSummary ?? "").trim()},
      ${(input.ineffectiveSummary ?? existing?.ineffectiveSummary ?? "").trim()},
      ${(input.effectProven ?? existing?.effectProven ?? "").trim()},
      ${(input.effectLikely ?? existing?.effectLikely ?? "").trim()},
      ${(input.effectNeedsData ?? existing?.effectNeedsData ?? "").trim()},
      ${surveyJson},
      ${filesJson},
      ${input.aiReport !== undefined ? input.aiReport : existing?.aiReport ?? null},
      ${input.createdByUserId ?? existing?.createdByUserId ?? null},
      ${existing?.createdAt ?? now},
      ${now}
    )
    ON CONFLICT (directive_id) DO UPDATE SET
      planned_summary = EXCLUDED.planned_summary,
      actual_summary = EXCLUDED.actual_summary,
      missing_summary = EXCLUDED.missing_summary,
      effective_summary = EXCLUDED.effective_summary,
      ineffective_summary = EXCLUDED.ineffective_summary,
      effect_proven = EXCLUDED.effect_proven,
      effect_likely = EXCLUDED.effect_likely,
      effect_needs_data = EXCLUDED.effect_needs_data,
      external_survey_data = EXCLUDED.external_survey_data,
      external_files = EXCLUDED.external_files,
      ai_report = EXCLUDED.ai_report,
      updated_at = EXCLUDED.updated_at
  `;

  const saved = await pgGetAutopsyByDirective(input.directiveId);
  if (!saved) {
    throw new Error("Failed to save autopsy");
  }
  return saved;
}

export async function pgListMemoryForDirective(
  directiveId: string
): Promise<DirectiveMemoryEntry[]> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const rows = await sql`
    SELECT *
    FROM directive_memory_entries
    WHERE directive_id = ${directiveId}
    ORDER BY created_at DESC
  `;
  return rows.map((row) => mapMemoryEntry(row as Record<string, unknown>));
}

export async function pgListGlobalMemory(options?: {
  limit?: number;
}): Promise<DirectiveMemoryEntry[]> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const limit = Math.max(1, Math.min(200, Number(options?.limit ?? 100) || 100));
  const rows = await sql`
    SELECT *
    FROM directive_memory_entries
    WHERE is_global = true
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => mapMemoryEntry(row as Record<string, unknown>));
}

export async function pgSaveMemoryEntry(input: {
  id?: string;
  directiveId?: string | null;
  campaignId?: string | null;
  layer: DirectiveMemoryLayer;
  title: string;
  body: string;
  tags?: string[];
  isGlobal?: boolean;
  createdByUserId?: string | null;
}): Promise<DirectiveMemoryEntry> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const id = input.id?.trim() || generateId();
  const now = new Date().toISOString();
  const layer = mapMemoryLayer(input.layer);
  const tags = (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
  const isGlobal = Boolean(input.isGlobal);

  await sql`
    INSERT INTO directive_memory_entries (
      id, directive_id, campaign_id, layer, title, body, tags,
      is_global, created_by_user_id, created_at, updated_at
    ) VALUES (
      ${id},
      ${input.directiveId ?? null},
      ${input.campaignId ?? null},
      ${layer},
      ${input.title.trim()},
      ${input.body.trim()},
      ${tags},
      ${isGlobal},
      ${input.createdByUserId ?? null},
      ${now},
      ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      directive_id = EXCLUDED.directive_id,
      campaign_id = EXCLUDED.campaign_id,
      layer = EXCLUDED.layer,
      title = EXCLUDED.title,
      body = EXCLUDED.body,
      tags = EXCLUDED.tags,
      is_global = EXCLUDED.is_global,
      updated_at = EXCLUDED.updated_at
  `;

  const rows = await sql`
    SELECT * FROM directive_memory_entries WHERE id = ${id} LIMIT 1
  `;
  return mapMemoryEntry(rows[0] as Record<string, unknown>);
}

export async function pgListPlaybooks(options?: {
  patternType?: PlaybookPatternType | null;
  limit?: number;
}): Promise<DirectivePlaybook[]> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const limit = Math.max(1, Math.min(200, Number(options?.limit ?? 100) || 100));
  const patternType = options?.patternType
    ? mapPatternType(options.patternType)
    : null;

  const rows = patternType
    ? await sql`
        SELECT *
        FROM directive_playbooks
        WHERE pattern_type = ${patternType}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT *
        FROM directive_playbooks
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

  return rows.map((row) => mapPlaybook(row as Record<string, unknown>));
}

export async function pgSavePlaybook(input: {
  id?: string;
  patternType: PlaybookPatternType;
  title: string;
  structureJson?: Record<string, unknown>;
  sourceDirectiveId?: string | null;
  successScore?: number | null;
  kpiMet?: boolean | null;
  createdByUserId?: string | null;
}): Promise<DirectivePlaybook> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const id = input.id?.trim() || generateId();
  const now = new Date().toISOString();
  const patternType = mapPatternType(input.patternType);
  const structureJson = sql.json(
    JSON.parse(JSON.stringify(input.structureJson ?? {}))
  );
  const successScore =
    input.successScore != null && Number.isFinite(input.successScore)
      ? Math.max(0, Math.min(100, Math.round(input.successScore)))
      : null;

  await sql`
    INSERT INTO directive_playbooks (
      id, pattern_type, title, structure_json, source_directive_id,
      success_score, kpi_met, created_by_user_id, created_at, updated_at
    ) VALUES (
      ${id},
      ${patternType},
      ${input.title.trim()},
      ${structureJson},
      ${input.sourceDirectiveId ?? null},
      ${successScore},
      ${input.kpiMet ?? null},
      ${input.createdByUserId ?? null},
      ${now},
      ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      pattern_type = EXCLUDED.pattern_type,
      title = EXCLUDED.title,
      structure_json = EXCLUDED.structure_json,
      source_directive_id = EXCLUDED.source_directive_id,
      success_score = EXCLUDED.success_score,
      kpi_met = EXCLUDED.kpi_met,
      updated_at = EXCLUDED.updated_at
  `;

  const rows = await sql`
    SELECT * FROM directive_playbooks WHERE id = ${id} LIMIT 1
  `;
  return mapPlaybook(rows[0] as Record<string, unknown>);
}

export async function pgDeletePlaybook(id: string): Promise<boolean> {
  const sql = getSql();
  await ensureDirectiveSmartExtraSchema();
  const rows = await sql`
    DELETE FROM directive_playbooks WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}
