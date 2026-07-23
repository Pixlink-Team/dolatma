"use server";

import { revalidatePath } from "next/cache";
import { completeAiChat } from "@/lib/ai/client";
import {
  isAiAvailable,
  isDailyTokenLimitExceeded,
  toPublicAiSettings,
  type AiProviderId,
} from "@/lib/ai/settings";
import { pgGetAiSettings } from "@/lib/db/ai-settings";
import {
  canManageDirectiveRecord,
  canManageDirectives,
  canViewDirectives,
} from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import * as pgDirectives from "@/lib/db/repository-directives";
import * as pgSmart from "@/lib/db/repository-directive-smart";
import {
  DIRECTIVE_MISSION_TYPE_LABELS,
  emptySmartPayload,
  isDirectiveMissionType,
  normalizeSmartPayload,
  type AiActionRejectReason,
  type AiActionStatus,
  type DirectiveMissionType,
  type PlaybookPatternType,
  type SmartAiUnderstanding,
  type SmartDirectivePayload,
  AI_ACTION_REJECT_REASONS,
  AI_ACTION_STATUSES,
  PLAYBOOK_PATTERN_TYPES,
} from "@/lib/directive-smart";
import { isPostgresConfigured } from "@/lib/utils";

function revalidateSmartPaths(campaignId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/directives");
  if (campaignId) {
    revalidatePath(`/admin?campaign=${campaignId}`);
    revalidatePath(`/admin/directives?campaign=${campaignId}`);
  }
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = stripJsonFences(text);
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item).trim()).filter(Boolean);
}

function parseUnderstanding(raw: Record<string, unknown>): SmartAiUnderstanding {
  return {
    mainGoal: asString(raw.mainGoal),
    primaryAudience: asString(raw.primaryAudience),
    desiredChange: asString(raw.desiredChange),
    mandatoryActions: asStringArray(raw.mandatoryActions),
    suggestedActions: asStringArray(raw.suggestedActions),
    successMetrics: asStringArray(raw.successMetrics),
    responsibleOrgs: asStringArray(raw.responsibleOrgs),
    risks: asStringArray(raw.risks),
    rawSummary: asString(raw.rawSummary),
  };
}

async function requireSession() {
  const session = await getAuthSession();
  if (!session || !canViewDirectives(session)) {
    return { session: null, error: "Unauthorized" as const };
  }
  if (!isPostgresConfigured()) {
    return { session: null, error: "Database required" as const };
  }
  return { session, error: null };
}

async function requireManageDirective(directiveId: string) {
  const access = await requireSession();
  if (access.error || !access.session) {
    return { session: null, directive: null, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { session: null, directive: null, error: "دسترسی ندارید" as const };
  }
  const directive = await pgDirectives.pgGetDirectiveById(directiveId);
  if (!directive) {
    return { session: null, directive: null, error: "دستورکار یافت نشد" as const };
  }
  if (!canManageDirectiveRecord(access.session, directive)) {
    return { session: null, directive: null, error: "دسترسی ندارید" as const };
  }
  return { session: access.session, directive, error: null };
}

export async function getAiAvailabilityAction(): Promise<{
  available: boolean;
  configured: boolean;
  enabled: boolean;
  limitExceeded: boolean;
}> {
  const access = await requireSession();
  if (access.error || !access.session) {
    return { available: false, configured: false, enabled: false, limitExceeded: false };
  }

  try {
    const settings = await pgGetAiSettings();
    const publicSettings = toPublicAiSettings(settings);
    const providerConfigured =
      publicSettings.openai.configured || publicSettings.gemini.configured;
    return {
      available: isAiAvailable(settings),
      configured: providerConfigured,
      enabled: settings.enabled,
      limitExceeded: isDailyTokenLimitExceeded(settings),
    };
  } catch {
    return { available: false, configured: false, enabled: false, limitExceeded: false };
  }
}

export async function generateDirectiveUnderstandingAction(input: {
  title: string;
  body: string;
  missionType?: DirectiveMissionType | null;
  smartPayload?: SmartDirectivePayload | null;
  providerOverride?: AiProviderId;
}): Promise<
  | { success: true; understanding: SmartAiUnderstanding; provider: AiProviderId }
  | { success: false; error: string }
> {
  const access = await requireSession();
  if (access.error || !access.session) {
    return { success: false, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false, error: "دسترسی ندارید" };
  }

  const title = input.title?.trim() || "";
  const body = input.body?.trim() || "";
  if (!title && !body) {
    return { success: false, error: "عنوان یا متن دستورکار الزامی است" };
  }

  const missionType =
    input.missionType && isDirectiveMissionType(input.missionType)
      ? input.missionType
      : null;
  const payload = normalizeSmartPayload(input.smartPayload);
  const missionLabel = missionType
    ? DIRECTIVE_MISSION_TYPE_LABELS[missionType]
    : "نامشخص";

  try {
    const result = await completeAiChat({
      feature: "directive_understanding",
      providerOverride: input.providerOverride,
      temperature: 0.2,
      system: [
        "تو تحلیل‌گر دستورکارهای ارتباطی هستی.",
        "فقط یک شیء JSON معتبر برگردان؛ بدون توضیح اضافه.",
        "کلیدها دقیقاً این‌ها باشند:",
        "mainGoal, primaryAudience, desiredChange, mandatoryActions, suggestedActions,",
        "successMetrics, responsibleOrgs, risks, rawSummary",
        "آرایه‌ها باید رشته باشند. rawSummary خلاصه کوتاه فارسی است.",
      ].join("\n"),
      user: JSON.stringify(
        {
          title,
          body,
          missionType,
          missionLabel,
          smartPayload: payload,
        },
        null,
        2
      ),
    });

    const parsed = parseJsonObject(result.text);
    if (!parsed) {
      return { success: false, error: "پاسخ AI قابل تجزیه نبود" };
    }

    return {
      success: true,
      understanding: parseUnderstanding(parsed),
      provider: result.provider,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "خطا در تولید برداشت AI",
    };
  }
}

export async function convertDirectiveToSmartAction(
  directiveId: string,
  missionType: DirectiveMissionType
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await requireManageDirective(directiveId);
  if (access.error || !access.directive || !access.session) {
    return { success: false, error: access.error ?? "Unauthorized" };
  }
  if (!isDirectiveMissionType(missionType)) {
    return { success: false, error: "نوع مأموریت نامعتبر است" };
  }
  if (access.directive.archivedAt) {
    return { success: false, error: "دستورکار آرشیو شده قابل تبدیل نیست" };
  }

  const payload =
    normalizeSmartPayload(access.directive.smartPayload) ??
    emptySmartPayload(missionType);

  const ok = await pgDirectives.pgConvertDirectiveToSmart({
    id: directiveId,
    missionType,
    smartPayload: payload,
  });

  if (!ok) {
    return { success: false, error: "تبدیل انجام نشد" };
  }

  revalidateSmartPaths(access.directive.campaignId);
  return { success: true };
}

export async function generateActionSuggestionsAction(
  directiveId: string,
  options?: { providerOverride?: AiProviderId }
): Promise<
  | { success: true; suggestions: pgSmart.DirectiveAiSuggestion[]; skipped?: boolean }
  | { success: false; error: string }
> {
  const access = await requireSession();
  if (access.error || !access.session?.userId) {
    return { success: false, error: access.error ?? "Unauthorized" };
  }

  const directive = await pgDirectives.pgGetDirectiveById(directiveId);
  if (!directive) {
    return { success: false, error: "دستورکار یافت نشد" };
  }

  const openToday = await pgSmart.pgCountOpenAiSuggestionsToday({
    directiveId,
    userId: access.session.userId,
  });
  if (openToday >= 5) {
    const existing = await pgSmart.pgListAiSuggestionsForDirective(directiveId);
    return {
      success: true,
      skipped: true,
      suggestions: existing.filter((item) => item.userId === access.session!.userId),
    };
  }

  const remaining = Math.max(1, Math.min(5, 5 - openToday));

  try {
    const result = await completeAiChat({
      feature: "action_assistant",
      providerOverride: options?.providerOverride,
      temperature: 0.4,
      system: [
        "تو دستیار اقدام برای مجریان دستورکار هستی.",
        `دقیقاً ${remaining} پیشنهاد اقدام عملی برگردان.`,
        "فقط JSON معتبر با شکل زیر:",
        '{"suggestions":[{"title":"","description":"","reason":"","linkedGoal":"","weaknessAddressed":"","expectedOutput":"","evidenceRequired":"","kpiImpact":"","confidence":0.5}]}',
        "confidence عدد بین 0 و 1 باشد. همه متن‌ها فارسی باشند.",
      ].join("\n"),
      user: JSON.stringify(
        {
          title: directive.title,
          body: directive.body,
          missionType: directive.missionType,
          smartPayload: directive.smartPayload,
        },
        null,
        2
      ),
    });

    const parsed = parseJsonObject(result.text);
    const list = Array.isArray(parsed?.suggestions) ? parsed!.suggestions : [];
    const saved: pgSmart.DirectiveAiSuggestion[] = [];

    for (const item of list.slice(0, remaining)) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const title = asString(row.title).trim();
      if (!title) continue;
      const suggestion = await pgSmart.pgUpsertAiSuggestion({
        directiveId,
        campaignId: directive.campaignId,
        userId: access.session.userId,
        title,
        description: asString(row.description),
        reason: asString(row.reason),
        linkedGoal: asString(row.linkedGoal),
        weaknessAddressed: asString(row.weaknessAddressed),
        expectedOutput: asString(row.expectedOutput),
        evidenceRequired: asString(row.evidenceRequired),
        kpiImpact: asString(row.kpiImpact),
        confidence: Number(row.confidence ?? 0.5),
        provider: result.provider,
      });
      saved.push(suggestion);
    }

    revalidateSmartPaths(directive.campaignId);
    return { success: true, suggestions: saved };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "خطا در تولید پیشنهادها",
    };
  }
}

export async function listMyAiSuggestionsAction(
  directiveId: string
): Promise<
  | { success: true; suggestions: pgSmart.DirectiveAiSuggestion[] }
  | { success: false; error: string; suggestions: [] }
> {
  const access = await requireSession();
  if (access.error || !access.session?.userId) {
    return { success: false, error: access.error ?? "Unauthorized", suggestions: [] };
  }

  const directive = await pgDirectives.pgGetDirectiveById(directiveId);
  if (!directive) {
    return { success: false, error: "دستورکار یافت نشد", suggestions: [] };
  }

  const all = await pgSmart.pgListAiSuggestionsForDirective(directiveId);
  return {
    success: true,
    suggestions: all.filter((item) => item.userId === access.session!.userId),
  };
}

export async function listMyOpenAiSuggestionsAction(options?: {
  limit?: number;
}): Promise<
  | { success: true; suggestions: pgSmart.DirectiveAiSuggestion[] }
  | { success: false; error: string; suggestions: [] }
> {
  const access = await requireSession();
  if (access.error || !access.session?.userId) {
    return { success: false, error: access.error ?? "Unauthorized", suggestions: [] };
  }

  const all = await pgSmart.pgListAiSuggestionsForUser(access.session.userId, {
    limit: options?.limit ?? 20,
  });
  const openStatuses = new Set([
    "suggested",
    "accepted",
    "in_progress",
    "evidence_submitted",
    "approved",
  ]);
  return {
    success: true,
    suggestions: all.filter((item) => openStatuses.has(item.status)).slice(0, 5),
  };
}

export async function updateAiSuggestionStatusAction(input: {
  id: string;
  status: AiActionStatus;
  rejectReason?: AiActionRejectReason | null;
  rejectNote?: string | null;
  evidenceUrl?: string | null;
  evidenceNote?: string | null;
  requestAlternative?: boolean;
  providerOverride?: AiProviderId;
}): Promise<
  | {
      success: true;
      suggestion: pgSmart.DirectiveAiSuggestion;
      alternative?: pgSmart.DirectiveAiSuggestion | null;
    }
  | { success: false; error: string }
> {
  const access = await requireSession();
  if (access.error || !access.session?.userId) {
    return { success: false, error: access.error ?? "Unauthorized" };
  }

  if (!(AI_ACTION_STATUSES as readonly string[]).includes(input.status)) {
    return { success: false, error: "وضعیت نامعتبر است" };
  }

  const existing = await pgSmart.pgGetAiSuggestionById(input.id);
  if (!existing) {
    return { success: false, error: "پیشنهاد یافت نشد" };
  }

  const isOwner = existing.userId === access.session.userId;
  const canManage =
    canManageDirectives(access.session) &&
    (await (async () => {
      const directive = await pgDirectives.pgGetDirectiveById(existing.directiveId);
      return directive ? canManageDirectiveRecord(access.session!, directive) : false;
    })());

  if (!isOwner && !canManage) {
    return { success: false, error: "دسترسی ندارید" };
  }

  if (
    input.status === "rejected" &&
    input.rejectReason &&
    !(AI_ACTION_REJECT_REASONS as readonly string[]).includes(input.rejectReason)
  ) {
    return { success: false, error: "دلیل رد نامعتبر است" };
  }

  const updated = await pgSmart.pgUpdateAiSuggestionStatus({
    id: input.id,
    status: input.status,
    rejectReason: input.rejectReason,
    rejectNote: input.rejectNote,
    evidenceUrl: input.evidenceUrl,
    evidenceNote: input.evidenceNote,
  });
  if (!updated) {
    return { success: false, error: "به‌روزرسانی انجام نشد" };
  }

  let alternative: pgSmart.DirectiveAiSuggestion | null = null;
  if (input.requestAlternative) {
    const directive = await pgDirectives.pgGetDirectiveById(existing.directiveId);
    if (directive) {
      try {
        const result = await completeAiChat({
          feature: "action_assistant",
          providerOverride: input.providerOverride,
          temperature: 0.5,
          system: [
            "یک پیشنهاد اقدام جایگزین بده که با پیشنهاد ردشده متفاوت باشد.",
            'فقط JSON: {"title":"","description":"","reason":"","linkedGoal":"","weaknessAddressed":"","expectedOutput":"","evidenceRequired":"","kpiImpact":"","confidence":0.5}',
          ].join("\n"),
          user: JSON.stringify(
            {
              rejected: {
                title: existing.title,
                reason: input.rejectReason,
                note: input.rejectNote,
              },
              directive: {
                title: directive.title,
                body: directive.body,
                missionType: directive.missionType,
                smartPayload: directive.smartPayload,
              },
            },
            null,
            2
          ),
        });
        const parsed = parseJsonObject(result.text);
        if (parsed) {
          const title = asString(parsed.title).trim();
          if (title) {
            alternative = await pgSmart.pgUpsertAiSuggestion({
              directiveId: existing.directiveId,
              campaignId: existing.campaignId,
              userId: access.session.userId,
              title,
              description: asString(parsed.description),
              reason: asString(parsed.reason),
              linkedGoal: asString(parsed.linkedGoal),
              weaknessAddressed: asString(parsed.weaknessAddressed),
              expectedOutput: asString(parsed.expectedOutput),
              evidenceRequired: asString(parsed.evidenceRequired),
              kpiImpact: asString(parsed.kpiImpact),
              confidence: Number(parsed.confidence ?? 0.5),
              provider: result.provider,
            });
          }
        }
      } catch {
        alternative = null;
      }
    }
  }

  revalidateSmartPaths(existing.campaignId);
  return { success: true, suggestion: updated, alternative };
}

export async function getAutopsyAction(directiveId: string) {
  const access = await requireManageDirective(directiveId);
  if (access.error || !access.directive) {
    return { success: false as const, autopsy: null, error: access.error ?? "Unauthorized" };
  }
  const autopsy = await pgSmart.pgGetAutopsyByDirective(directiveId);
  return { success: true as const, autopsy };
}

export async function saveAutopsyAction(input: {
  directiveId: string;
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
}) {
  const access = await requireManageDirective(input.directiveId);
  if (access.error || !access.directive || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }

  const autopsy = await pgSmart.pgSaveAutopsy({
    directiveId: input.directiveId,
    campaignId: access.directive.campaignId,
    plannedSummary: input.plannedSummary,
    actualSummary: input.actualSummary,
    missingSummary: input.missingSummary,
    effectiveSummary: input.effectiveSummary,
    ineffectiveSummary: input.ineffectiveSummary,
    effectProven: input.effectProven,
    effectLikely: input.effectLikely,
    effectNeedsData: input.effectNeedsData,
    externalSurveyData: input.externalSurveyData,
    externalFiles: input.externalFiles,
    aiReport: input.aiReport,
    createdByUserId: access.session.userId,
  });

  revalidateSmartPaths(access.directive.campaignId);
  return { success: true as const, autopsy };
}

export async function generateAutopsyDraftAction(input: {
  directiveId: string;
  externalSurveyData?: Record<string, unknown>;
  providerOverride?: AiProviderId;
}) {
  const access = await requireManageDirective(input.directiveId);
  if (access.error || !access.directive || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }

  const existing = await pgSmart.pgGetAutopsyByDirective(input.directiveId);
  const surveyData =
    input.externalSurveyData ?? existing?.externalSurveyData ?? {};

  try {
    const result = await completeAiChat({
      feature: "autopsy",
      providerOverride: input.providerOverride,
      temperature: 0.3,
      system: [
        "تو تحلیل‌گر کالبدشکافی کمپین/دستورکار هستی.",
        "فقط JSON برگردان با کلیدهای:",
        "plannedSummary, actualSummary, missingSummary, effectiveSummary, ineffectiveSummary,",
        "effectProven, effectLikely, effectNeedsData, aiReport",
        "همه متن‌ها فارسی و مختصر باشند.",
      ].join("\n"),
      user: JSON.stringify(
        {
          title: access.directive.title,
          body: access.directive.body,
          missionType: access.directive.missionType,
          smartPayload: access.directive.smartPayload,
          existingAutopsy: existing,
          externalSurveyData: surveyData,
        },
        null,
        2
      ),
    });

    const parsed = parseJsonObject(result.text);
    if (!parsed) {
      return { success: false as const, error: "پاسخ AI قابل تجزیه نبود" };
    }

    const autopsy = await pgSmart.pgSaveAutopsy({
      directiveId: input.directiveId,
      campaignId: access.directive.campaignId,
      plannedSummary: asString(parsed.plannedSummary),
      actualSummary: asString(parsed.actualSummary),
      missingSummary: asString(parsed.missingSummary),
      effectiveSummary: asString(parsed.effectiveSummary),
      ineffectiveSummary: asString(parsed.ineffectiveSummary),
      effectProven: asString(parsed.effectProven),
      effectLikely: asString(parsed.effectLikely),
      effectNeedsData: asString(parsed.effectNeedsData),
      externalSurveyData: surveyData,
      aiReport: asString(parsed.aiReport) || result.text,
      createdByUserId: access.session.userId,
    });

    revalidateSmartPaths(access.directive.campaignId);
    return { success: true as const, autopsy };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در تولید کالبدشکافی",
    };
  }
}

export async function listDirectiveMemoryAction(directiveId: string) {
  const access = await requireSession();
  if (access.error || !access.session) {
    return { success: false as const, entries: [], error: access.error ?? "Unauthorized" };
  }
  const directive = await pgDirectives.pgGetDirectiveById(directiveId);
  if (!directive) {
    return { success: false as const, entries: [], error: "دستورکار یافت نشد" };
  }
  const isCreator =
    Boolean(access.session.userId) && directive.createdByUserId === access.session.userId;
  const canAccess =
    isCreator ||
    isFullAdmin(access.session) ||
    (canManageDirectives(access.session) &&
      canManageDirectiveRecord(access.session, directive));
  if (!canAccess) {
    return { success: false as const, entries: [], error: "دسترسی ندارید" };
  }
  const entries = await pgSmart.pgListMemoryForDirective(directiveId);
  return { success: true as const, entries };
}

export async function saveDirectiveMemoryAction(input: {
  id?: string;
  directiveId?: string | null;
  campaignId?: string | null;
  layer: pgSmart.DirectiveMemoryLayer;
  title: string;
  body: string;
  tags?: string[];
  isGlobal?: boolean;
}) {
  const access = await requireSession();
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }

  if (input.isGlobal && !isFullAdmin(access.session)) {
    return { success: false as const, error: "فقط ادمین می‌تواند حافظه سراسری ثبت کند" };
  }

  if (input.directiveId) {
    const directive = await pgDirectives.pgGetDirectiveById(input.directiveId);
    if (!directive) {
      return { success: false as const, error: "دستورکار یافت نشد" };
    }
    const isCreator =
      Boolean(access.session.userId) && directive.createdByUserId === access.session.userId;
    const canAccess =
      isCreator ||
      isFullAdmin(access.session) ||
      (canManageDirectives(access.session) &&
        canManageDirectiveRecord(access.session, directive));
    if (!canAccess) {
      return { success: false as const, error: "دسترسی ندارید" };
    }
  } else if (!input.isGlobal && !canManageDirectives(access.session)) {
    return { success: false as const, error: "دسترسی ندارید" };
  }

  const title = input.title?.trim() || "";
  const body = input.body?.trim() || "";
  if (!title || !body) {
    return { success: false as const, error: "عنوان و متن الزامی است" };
  }

  const entry = await pgSmart.pgSaveMemoryEntry({
    id: input.id,
    directiveId: input.directiveId ?? null,
    campaignId: input.campaignId ?? null,
    layer: input.layer,
    title,
    body,
    tags: input.tags,
    isGlobal: Boolean(input.isGlobal),
    createdByUserId: access.session.userId,
  });

  if (input.campaignId) revalidateSmartPaths(input.campaignId);
  return { success: true as const, entry };
}

export async function listGlobalMemoryAction(options?: { limit?: number }) {
  const access = await requireSession();
  if (access.error || !access.session) {
    return { success: false as const, entries: [], error: access.error ?? "Unauthorized" };
  }
  if (!isFullAdmin(access.session)) {
    return { success: false as const, entries: [], error: "دسترسی ندارید" };
  }
  const entries = await pgSmart.pgListGlobalMemory(options);
  return { success: true as const, entries };
}

export async function extractMemoryAction(input: {
  directiveId: string;
  providerOverride?: AiProviderId;
}) {
  const access = await requireManageDirective(input.directiveId);
  if (access.error || !access.directive || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }

  try {
    const result = await completeAiChat({
      feature: "memory_extract",
      providerOverride: input.providerOverride,
      temperature: 0.3,
      system: [
        "از دستورکار، نکات حافظه‌ای قابل بایگانی استخراج کن.",
        'فقط JSON: {"entries":[{"layer":"strategic|operational|content|media|audience|failure|success","title":"","body":"","tags":[]}]}',
        "حداکثر 6 مورد. متن‌ها فارسی باشند.",
      ].join("\n"),
      user: JSON.stringify(
        {
          title: access.directive.title,
          body: access.directive.body,
          missionType: access.directive.missionType,
          smartPayload: access.directive.smartPayload,
        },
        null,
        2
      ),
    });

    const parsed = parseJsonObject(result.text);
    const list = Array.isArray(parsed?.entries) ? parsed!.entries : [];
    const saved: pgSmart.DirectiveMemoryEntry[] = [];

    for (const item of list.slice(0, 6)) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const title = asString(row.title).trim();
      const body = asString(row.body).trim();
      if (!title || !body) continue;
      const layer = String(row.layer ?? "operational");
      if (!(pgSmart.DIRECTIVE_MEMORY_LAYERS as readonly string[]).includes(layer)) {
        continue;
      }
      const entry = await pgSmart.pgSaveMemoryEntry({
        directiveId: input.directiveId,
        campaignId: access.directive.campaignId,
        layer: layer as pgSmart.DirectiveMemoryLayer,
        title,
        body,
        tags: asStringArray(row.tags),
        isGlobal: false,
        createdByUserId: access.session.userId,
      });
      saved.push(entry);
    }

    revalidateSmartPaths(access.directive.campaignId);
    return { success: true as const, entries: saved };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در استخراج حافظه",
    };
  }
}

export async function listPlaybooksAction(options?: {
  patternType?: PlaybookPatternType | null;
  limit?: number;
}) {
  const access = await requireSession();
  if (access.error || !access.session) {
    return { success: false as const, playbooks: [], error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, playbooks: [], error: "دسترسی ندارید" };
  }
  const playbooks = await pgSmart.pgListPlaybooks(options);
  return { success: true as const, playbooks };
}

export async function savePlaybookAction(input: {
  id?: string;
  patternType: PlaybookPatternType;
  title: string;
  structureJson?: Record<string, unknown>;
  sourceDirectiveId?: string | null;
  successScore?: number | null;
  kpiMet?: boolean | null;
}) {
  const access = await requireSession();
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, error: "دسترسی ندارید" };
  }
  if (!(PLAYBOOK_PATTERN_TYPES as readonly string[]).includes(input.patternType)) {
    return { success: false as const, error: "نوع الگو نامعتبر است" };
  }
  const title = input.title?.trim() || "";
  if (!title) {
    return { success: false as const, error: "عنوان الزامی است" };
  }

  const playbook = await pgSmart.pgSavePlaybook({
    id: input.id,
    patternType: input.patternType,
    title,
    structureJson: input.structureJson,
    sourceDirectiveId: input.sourceDirectiveId,
    successScore: input.successScore,
    kpiMet: input.kpiMet,
    createdByUserId: access.session.userId,
  });

  return { success: true as const, playbook };
}

export async function createPlaybookFromDirectiveAction(input: {
  directiveId: string;
  patternType: PlaybookPatternType;
  title?: string;
  successScore?: number | null;
  kpiMet?: boolean | null;
}) {
  const access = await requireManageDirective(input.directiveId);
  if (access.error || !access.directive || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!(PLAYBOOK_PATTERN_TYPES as readonly string[]).includes(input.patternType)) {
    return { success: false as const, error: "نوع الگو نامعتبر است" };
  }

  const playbook = await pgSmart.pgSavePlaybook({
    patternType: input.patternType,
    title: input.title?.trim() || `الگو از: ${access.directive.title}`,
    structureJson: {
      missionType: access.directive.missionType,
      topic: access.directive.topic,
      smartPayload: access.directive.smartPayload,
      body: access.directive.body,
    },
    sourceDirectiveId: input.directiveId,
    successScore: input.successScore,
    kpiMet: input.kpiMet,
    createdByUserId: access.session.userId,
  });

  revalidateSmartPaths(access.directive.campaignId);
  return { success: true as const, playbook };
}

export async function deletePlaybookAction(id: string) {
  const access = await requireSession();
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, error: "دسترسی ندارید" };
  }
  const ok = await pgSmart.pgDeletePlaybook(id);
  if (!ok) {
    return { success: false as const, error: "حذف نشد" };
  }
  return { success: true as const };
}

export async function getCampaignAdvisorTipsAction(input: {
  missionType?: DirectiveMissionType | null;
  topic?: string | null;
  smartPayload?: SmartDirectivePayload | null;
  providerOverride?: AiProviderId;
}): Promise<
  | { success: true; tips: string[]; provider: AiProviderId }
  | { success: false; error: string }
> {
  const access = await requireSession();
  if (access.error || !access.session) {
    return { success: false, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false, error: "دسترسی ندارید" };
  }

  const [memory, playbooks] = await Promise.all([
    isFullAdmin(access.session)
      ? pgSmart.pgListGlobalMemory({ limit: 8 })
      : Promise.resolve([]),
    pgSmart.pgListPlaybooks({
      patternType: null,
      limit: 5,
    }),
  ]);

  try {
    const result = await completeAiChat({
      feature: "campaign_advisor",
      providerOverride: input.providerOverride,
      temperature: 0.4,
      system: [
        "تو مشاور طراحی کمپین ارتباطی هستی.",
        "بین 3 تا 7 نکته عملی کوتاه فارسی برگردان.",
        'فقط JSON: {"tips":["..."]}',
      ].join("\n"),
      user: JSON.stringify(
        {
          missionType: input.missionType,
          topic: input.topic,
          smartPayload: normalizeSmartPayload(input.smartPayload),
          memorySummaries: memory.map((item) => ({
            layer: item.layer,
            title: item.title,
            body: item.body.slice(0, 240),
          })),
          playbookSummaries: playbooks.map((item) => ({
            patternType: item.patternType,
            title: item.title,
            successScore: item.successScore,
          })),
        },
        null,
        2
      ),
    });

    const parsed = parseJsonObject(result.text);
    const tips = asStringArray(parsed?.tips).slice(0, 7);
    if (tips.length < 3) {
      return { success: false, error: "نکات کافی از AI دریافت نشد" };
    }
    return { success: true, tips, provider: result.provider };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "خطا در دریافت نکات مشاور",
    };
  }
}
