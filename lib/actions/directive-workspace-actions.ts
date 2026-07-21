"use server";

import { revalidatePath } from "next/cache";
import { canManageDirectives, canViewDirectives } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import * as pgWorkspace from "@/lib/db/repository-directive-workspace";
import * as pgDirectives from "@/lib/db/repository-directives";
import * as pgExt from "@/lib/db/repository-extended";
import {
  isDirectiveUrgency,
  isWorkspaceAssetCategory,
} from "@/lib/directive-workspace";
import type {
  DirectiveAssetEventType,
  DirectiveReplacementAlert,
  DirectiveUrgency,
  DirectiveWorkspaceAssetCategory,
  DirectiveWorkspaceBundle,
  DirectiveWorkspaceFaqItem,
  DirectiveWorkspaceKpi,
  DirectiveWorkspaceMeta,
} from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";
import { stripFileAccessTokensDeep, withFileAccessTokensDeep } from "@/lib/uploads";

async function assertWorkspaceAccess(campaignId: string) {
  const session = await getAuthSession();
  if (!session || !canViewDirectives(session)) {
    return { session: null, error: "Unauthorized" as const };
  }

  if (isFullAdmin(session)) {
    return { session, error: null };
  }

  if (!session.userId || !isPostgresConfigured()) {
    return { session: null, error: "Unauthorized" as const };
  }

  const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId, campaignId);
  if (!permissions) {
    return { session: null, error: "دسترسی ندارید" as const };
  }

  return { session, error: null };
}

function revalidateWorkspace(campaignId: string, directiveId: string) {
  revalidatePath("/admin/directives");
  revalidatePath(`/admin/directives?campaign=${campaignId}`);
  revalidatePath(`/admin/directives/${directiveId}`);
  revalidatePath(`/admin/directives/${directiveId}?campaign=${campaignId}`);
  revalidatePath("/admin");
}

function normalizeStringList(values: string[] | undefined): string[] {
  return (values ?? []).map((item) => item.trim()).filter(Boolean);
}

function normalizeKpis(values: DirectiveWorkspaceKpi[] | undefined): DirectiveWorkspaceKpi[] {
  return (values ?? [])
    .map((item) => ({
      id: item.id?.trim() || crypto.randomUUID(),
      title: item.title.trim(),
      target: Number(item.target ?? 0),
      unit: item.unit?.trim() ?? "",
    }))
    .filter((item) => item.title);
}

function normalizeFaq(values: DirectiveWorkspaceFaqItem[] | undefined): DirectiveWorkspaceFaqItem[] {
  return (values ?? [])
    .map((item) => ({
      id: item.id?.trim() || crypto.randomUUID(),
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question);
}

export async function getDirectiveWorkspaceAction(directiveId: string): Promise<{
  success: boolean;
  canManage: boolean;
  bundle: DirectiveWorkspaceBundle | null;
  alerts: DirectiveReplacementAlert[];
  error?: string;
}> {
  if (!isPostgresConfigured()) {
    return { success: false, canManage: false, bundle: null, alerts: [], error: "Database required" };
  }

  const directive = await pgDirectives.pgGetDirectiveById(directiveId);
  if (!directive) {
    return { success: false, canManage: false, bundle: null, alerts: [], error: "یافت نشد" };
  }

  const access = await assertWorkspaceAccess(directive.campaignId);
  if (access.error || !access.session) {
    return {
      success: false,
      canManage: false,
      bundle: null,
      alerts: [],
      error: access.error ?? "Unauthorized",
    };
  }

  const canManage = canManageDirectives(access.session);
  const bundle = await pgWorkspace.pgGetDirectiveWorkspaceBundle(directiveId, {
    pendingAlertsForUserId: canManage ? null : access.session.userId,
  });

  if (!bundle) {
    return { success: false, canManage, bundle: null, alerts: [], error: "یافت نشد" };
  }

  const alerts = canManage
    ? await pgWorkspace.pgListReplacementAlertsForDirective(directiveId)
    : access.session.userId
      ? await pgWorkspace.pgListReplacementAlertsForUser(access.session.userId, {
          directiveId,
        })
      : [];

  return {
    success: true,
    canManage,
    bundle: withFileAccessTokensDeep(bundle),
    alerts: withFileAccessTokensDeep(alerts),
  };
}

export async function saveDirectiveWorkspaceMetaAction(input: {
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
  faq: DirectiveWorkspaceFaqItem[];
  targetMinistryIds: string[];
  targetOrganizationIds: string[];
  targetProvinces: string[];
  targetCities: string[];
}) {
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  if (!isDirectiveUrgency(input.urgency)) {
    return { success: false as const, error: "درجه فوریت نامعتبر است" };
  }

  const directive = await pgDirectives.pgGetDirectiveById(input.directiveId);
  if (!directive) return { success: false as const, error: "یافت نشد" };

  const access = await assertWorkspaceAccess(directive.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, error: "فقط مدیر و کارفرما می‌توانند اتاق عملیات را ویرایش کنند" };
  }

  const payload: Omit<DirectiveWorkspaceMeta, "directiveId" | "centralOwnerName"> = {
    objective: input.objective.trim(),
    expectedResults: input.expectedResults.trim(),
    urgency: input.urgency,
    mandatoryActions: normalizeStringList(input.mandatoryActions),
    suggestedActions: normalizeStringList(input.suggestedActions),
    kpis: normalizeKpis(input.kpis),
    brandGuide: input.brandGuide.trim(),
    executionGuide: input.executionGuide.trim(),
    approvalRequirements: input.approvalRequirements.trim(),
    centralOwnerUserId: input.centralOwnerUserId?.trim() || null,
    centralOwnerLabel: input.centralOwnerLabel?.trim() || null,
    faq: normalizeFaq(input.faq),
    targetMinistryIds: normalizeStringList(input.targetMinistryIds),
    targetOrganizationIds: normalizeStringList(input.targetOrganizationIds),
    targetProvinces: normalizeStringList(input.targetProvinces),
    targetCities: normalizeStringList(input.targetCities),
  };

  await pgWorkspace.pgSaveDirectiveWorkspaceMeta(input.directiveId, payload);
  revalidateWorkspace(directive.campaignId, input.directiveId);
  return { success: true as const };
}

export async function createDirectiveWorkspaceAssetAction(input: {
  directiveId: string;
  category: DirectiveWorkspaceAssetCategory;
  title: string;
  description?: string;
  printSize?: string | null;
  contentText?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
  changeNote?: string;
}) {
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  if (!isWorkspaceAssetCategory(input.category)) {
    return { success: false as const, error: "دسته فایل نامعتبر است" };
  }
  if (!input.title.trim()) {
    return { success: false as const, error: "عنوان الزامی است" };
  }

  const cleaned = stripFileAccessTokensDeep({
    fileUrl: input.fileUrl,
    contentText: input.contentText,
  });

  const hasFile = Boolean(cleaned.fileUrl?.trim());
  const hasText = Boolean(cleaned.contentText?.trim());
  if (!hasFile && !hasText) {
    return { success: false as const, error: "فایل یا متن نسخه الزامی است" };
  }

  const directive = await pgDirectives.pgGetDirectiveById(input.directiveId);
  if (!directive) return { success: false as const, error: "یافت نشد" };

  const access = await assertWorkspaceAccess(directive.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, error: "دسترسی ندارید" };
  }

  const result = await pgWorkspace.pgCreateDirectiveWorkspaceAsset({
    directiveId: input.directiveId,
    category: input.category,
    title: input.title,
    description: input.description,
    printSize: input.printSize,
    contentText: cleaned.contentText,
    fileUrl: cleaned.fileUrl,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    changeNote: input.changeNote,
    createdByUserId: access.session.userId,
  });

  revalidateWorkspace(directive.campaignId, input.directiveId);
  return { success: true as const, ...result };
}

export async function addDirectiveWorkspaceAssetVersionAction(input: {
  assetId: string;
  directiveId: string;
  contentText?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
  changeNote?: string;
}) {
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const cleaned = stripFileAccessTokensDeep({
    fileUrl: input.fileUrl,
    contentText: input.contentText,
  });
  const hasFile = Boolean(cleaned.fileUrl?.trim());
  const hasText = Boolean(cleaned.contentText?.trim());
  if (!hasFile && !hasText) {
    return { success: false as const, error: "فایل یا متن نسخه جدید الزامی است" };
  }

  const directive = await pgDirectives.pgGetDirectiveById(input.directiveId);
  if (!directive) return { success: false as const, error: "یافت نشد" };

  const access = await assertWorkspaceAccess(directive.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, error: "دسترسی ندارید" };
  }

  try {
    const result = await pgWorkspace.pgAddDirectiveWorkspaceAssetVersion({
      assetId: input.assetId,
      contentText: cleaned.contentText,
      fileUrl: cleaned.fileUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      changeNote: input.changeNote,
      createdByUserId: access.session.userId,
    });
    revalidateWorkspace(directive.campaignId, input.directiveId);
    return { success: true as const, ...result };
  } catch (error) {
    if (error instanceof Error && error.message === "ASSET_NOT_FOUND") {
      return { success: false as const, error: "فایل یافت نشد" };
    }
    throw error;
  }
}

export async function deleteDirectiveWorkspaceAssetAction(input: {
  assetId: string;
  directiveId: string;
}) {
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const directive = await pgDirectives.pgGetDirectiveById(input.directiveId);
  if (!directive) return { success: false as const, error: "یافت نشد" };

  const access = await assertWorkspaceAccess(directive.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, error: "دسترسی ندارید" };
  }

  await pgWorkspace.pgDeleteDirectiveWorkspaceAsset(input.assetId);
  revalidateWorkspace(directive.campaignId, input.directiveId);
  return { success: true as const };
}

export async function recordDirectiveAssetEventAction(input: {
  directiveId: string;
  assetId: string;
  versionId: string;
  eventType: DirectiveAssetEventType;
}) {
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  if (input.eventType !== "downloaded" && input.eventType !== "published") {
    return { success: false as const, error: "نوع رویداد نامعتبر است" };
  }

  const directive = await pgDirectives.pgGetDirectiveById(input.directiveId);
  if (!directive) return { success: false as const, error: "یافت نشد" };

  const access = await assertWorkspaceAccess(directive.campaignId);
  if (access.error || !access.session?.userId) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }

  const user = await pgExt.pgGetUserById(access.session.userId);
  await pgWorkspace.pgRecordDirectiveAssetEvent({
    assetId: input.assetId,
    versionId: input.versionId,
    userId: access.session.userId,
    ministryId: user?.ministryId ?? null,
    organizationId: user?.organizationId ?? null,
    eventType: input.eventType,
  });

  return { success: true as const };
}

export async function ackDirectiveReplacementAlertAction(input: {
  alertId: string;
  status?: "acked" | "replaced";
}) {
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const session = await getAuthSession();
  if (!session?.userId) {
    return { success: false as const, error: "Unauthorized" };
  }

  const ok = await pgWorkspace.pgAckReplacementAlert(
    input.alertId,
    session.userId,
    input.status ?? "acked"
  );
  if (!ok) {
    return { success: false as const, error: "هشدار یافت نشد یا قبلاً رسیدگی شده" };
  }

  revalidatePath("/admin/directives");
  revalidatePath("/admin");
  return { success: true as const };
}

export async function listMyReplacementAlertsAction(campaignId: string): Promise<{
  success: boolean;
  alerts: DirectiveReplacementAlert[];
  error?: string;
}> {
  if (!isPostgresConfigured()) {
    return { success: false, alerts: [], error: "Database required" };
  }

  const access = await assertWorkspaceAccess(campaignId);
  if (access.error || !access.session?.userId) {
    return { success: false, alerts: [], error: access.error ?? "Unauthorized" };
  }

  const alerts = await pgWorkspace.pgListReplacementAlertsForUser(access.session.userId, {
    campaignId,
    status: "pending",
  });
  return { success: true, alerts };
}
