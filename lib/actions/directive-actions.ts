"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  canManageDirectiveRecord,
  canManageDirectives,
  canManageDirectivesGlobally,
  isScopedDirectiveIssuer,
} from "@/lib/auth/access";
import * as pgExt from "@/lib/db/repository-extended";
import * as pgDirectives from "@/lib/db/repository-directives";
import { getContentTitleValidationError } from "@/lib/content-constraints";
import {
  normalizeDirectiveCtaInput,
  type DirectiveCtaKind,
} from "@/lib/directive-cta";
import {
  buildDirectiveSmsText,
  sendSms,
} from "@/lib/sms/provider";
import { pgGetSmsProviderSettings } from "@/lib/db/system-settings";
import type {
  AuthSession,
  CampaignDirective,
  DirectiveAudienceType,
  DirectivePriority,
  DirectiveRecipient,
} from "@/lib/types";
import type { UserRegion } from "@/lib/user-regions";
import { isPostgresConfigured } from "@/lib/utils";
import { stripFileAccessTokensDeep } from "@/lib/uploads";

async function assertDirectivesAccess(campaignId: string) {
  const session = await getAuthSession();
  if (!session) return { session: null, error: "Unauthorized" as const };

  if (isFullAdmin(session)) {
    return { session, error: null };
  }

  if (!session.userId || !isPostgresConfigured()) {
    return { session: null, error: "Unauthorized" as const };
  }

  // Any campaign membership is enough to view/confirm directives.
  const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId, campaignId);
  if (!permissions) {
    return { session: null, error: "دسترسی ندارید" as const };
  }

  return { session, error: null };
}

function revalidateDirectives(campaignId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/directives");
  if (campaignId) {
    revalidatePath(`/admin?campaign=${campaignId}`);
    revalidatePath(`/admin/directives?campaign=${campaignId}`);
  }
}

function creatorFilterForSession(session: AuthSession): { createdByUserId?: string } {
  if (isScopedDirectiveIssuer(session) && session.userId) {
    return { createdByUserId: session.userId };
  }
  return {};
}

export async function listDirectivesAction(campaignId: string): Promise<{
  success: boolean;
  canManage: boolean;
  directives: CampaignDirective[];
  error?: string;
}> {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false, canManage: false, directives: [], error: access.error ?? "Unauthorized" };
  }

  if (!isPostgresConfigured()) {
    return { success: false, canManage: false, directives: [], error: "Database required" };
  }

  const canManage = canManageDirectives(access.session);

  if (canManage) {
    const directives = await pgDirectives.pgListDirectivesForCampaign(
      campaignId,
      creatorFilterForSession(access.session)
    );
    return { success: true, canManage: true, directives };
  }

  if (!access.session.userId) {
    return { success: true, canManage: false, directives: [] };
  }

  const directives = await pgDirectives.pgListDirectivesForUserInbox(
    campaignId,
    access.session.userId
  );
  return { success: true, canManage: false, directives };
}

export async function listCampaignDirectiveUsersAction(campaignId: string) {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, users: [], error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, users: [], error: "دسترسی ندارید" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, users: [], error: "Database required" };
  }

  const users = await pgDirectives.pgListCampaignUsersForDirectives(campaignId, {
    parentUserId: isScopedDirectiveIssuer(access.session)
      ? access.session.userId ?? undefined
      : undefined,
  });
  return { success: true as const, users };
}

export async function getDirectiveRecipientsAction(directiveId: string): Promise<{
  success: boolean;
  recipients: DirectiveRecipient[];
  error?: string;
}> {
  const session = await getAuthSession();
  if (!session || !canManageDirectives(session)) {
    return { success: false, recipients: [], error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { success: false, recipients: [], error: "Database required" };
  }

  const directive = await pgDirectives.pgGetDirectiveById(directiveId);
  if (!directive) {
    return { success: false, recipients: [], error: "یافت نشد" };
  }
  if (!canManageDirectiveRecord(session, directive)) {
    return { success: false, recipients: [], error: "دسترسی ندارید" };
  }

  const access = await assertDirectivesAccess(directive.campaignId);
  if (access.error) {
    return { success: false, recipients: [], error: access.error };
  }

  const recipients = await pgDirectives.pgListDirectiveRecipients(directiveId);
  return { success: true, recipients };
}

export async function saveDirectiveAction(input: {
  id?: string;
  campaignId: string;
  title: string;
  body: string;
  priority: DirectivePriority;
  startDate?: string | null;
  endDate?: string | null;
  letterFileUrl?: string | null;
  letterFileName?: string | null;
  letterMimeType?: string | null;
  letterFileSize?: number;
  ctaKind?: DirectiveCtaKind | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  ctaTarget?: string | null;
  attachments?: Array<{
    id?: string;
    title: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }>;
  audienceType: DirectiveAudienceType;
  audienceRegion?: UserRegion | null;
  audienceMinistryId?: string | null;
  audienceOrganizationId?: string | null;
  audienceProvinces?: string[];
  audienceCities?: string[];
  selectedUserIds?: string[];
  sendSmsOnPublish?: boolean;
  crisisMode?: boolean;
  escalationAfterMinutes?: number;
  topic?: string | null;
}) {
  const titleError = getContentTitleValidationError(input.title);
  if (titleError) return { success: false as const, error: titleError };

  if (!input.startDate?.trim()) {
    return { success: false as const, error: "تاریخ شروع الزامی است" };
  }
  if (!input.endDate?.trim()) {
    return { success: false as const, error: "تاریخ پایان الزامی است" };
  }
  if (input.startDate.trim() > input.endDate.trim()) {
    return { success: false as const, error: "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد" };
  }

  if (!input.letterFileUrl?.trim()) {
    return { success: false as const, error: "آپلود نامه رسمی (PDF یا تصویر) الزامی است" };
  }

  const cta = normalizeDirectiveCtaInput({
    ctaKind: input.ctaKind,
    ctaLabel: input.ctaLabel,
    ctaUrl: input.ctaUrl,
    ctaTarget: input.ctaTarget,
  });
  if (!cta.ok) {
    return { success: false as const, error: cta.error };
  }

  const access = await assertDirectivesAccess(input.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, error: "اجازه ثبت دستورکار ندارید" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const scoped = isScopedDirectiveIssuer(access.session);
  if (scoped && !access.session.userId) {
    return { success: false as const, error: "برای ثبت دستورکار باید با حساب کاربری وارد شوید" };
  }

  if (input.id) {
    const existing = await pgDirectives.pgGetDirectiveById(input.id);
    if (!existing) {
      return { success: false as const, error: "دستورکار یافت نشد" };
    }
    if (existing.archivedAt) {
      return { success: false as const, error: "دستورکار آرشیو شده قابل ویرایش نیست" };
    }
    if (!canManageDirectiveRecord(access.session, existing)) {
      return { success: false as const, error: "فقط دستورکارهای خودتان را می‌توانید ویرایش کنید" };
    }
  }

  let selectedUserIds = input.selectedUserIds;
  let parentUserId: string | null = null;
  const audienceType = input.audienceType;

  if (scoped) {
    parentUserId = access.session.userId!;
    if (audienceType === "region" || audienceType === "ministry_city") {
      return {
        success: false as const,
        error: "شما فقط می‌توانید برای زیرمجموعه‌های خودتان دستورکار صادر کنید",
      };
    }
    if (audienceType !== "all" && audienceType !== "users") {
      return {
        success: false as const,
        error: "نوع مخاطب برای زیرمجموعه نامعتبر است",
      };
    }

    const subordinateUsers = await pgDirectives.pgListCampaignUsersForDirectives(
      input.campaignId,
      { parentUserId }
    );
    const allowedIds = new Set(subordinateUsers.map((user) => user.id));
    if (allowedIds.size === 0) {
      return {
        success: false as const,
        error: "هنوز کاربر زیرمجموعه‌ای برای صدور دستورکار ندارید",
      };
    }

    if (audienceType === "users") {
      const selected = (selectedUserIds ?? []).filter((id) => allowedIds.has(id));
      if (selected.length === 0) {
        return {
          success: false as const,
          error: "حداقل یک کاربر از زیرمجموعه‌های خودتان را انتخاب کنید",
        };
      }
      if ((selectedUserIds ?? []).some((id) => !allowedIds.has(id))) {
        return {
          success: false as const,
          error: "فقط زیرمجموعه‌های خودتان را می‌توانید مخاطب قرار دهید",
        };
      }
      selectedUserIds = selected;
    }
  } else if (!canManageDirectivesGlobally(access.session)) {
    return { success: false as const, error: "اجازه ثبت دستورکار ندارید" };
  }

  if (audienceType === "region" && !input.audienceRegion) {
    return { success: false as const, error: "منطقه مخاطب را انتخاب کنید" };
  }
  if (audienceType === "users" && !(selectedUserIds?.length)) {
    return { success: false as const, error: "حداقل یک کاربر را انتخاب کنید" };
  }
  if (audienceType === "ministry_city") {
    if (!input.audienceMinistryId?.trim()) {
      return { success: false as const, error: "وزارتخانه مخاطب را انتخاب کنید" };
    }
    const provinces = input.audienceProvinces ?? input.audienceCities ?? [];
    if (!provinces.length) {
      return { success: false as const, error: "حداقل یک استان را انتخاب کنید" };
    }
  }

  const cleaned = stripFileAccessTokensDeep({
    ...input,
    body: input.body?.trim() ?? "",
  });

  const attachments = (cleaned.attachments ?? []).map((item) => ({
    id: item.id,
    title: item.title?.trim() ?? "",
    fileUrl: item.fileUrl?.trim() ?? "",
    fileName: item.fileName?.trim() ?? "",
    mimeType: item.mimeType?.trim() ?? "application/octet-stream",
    fileSize: Number(item.fileSize ?? 0),
  }));

  for (const [index, attachment] of attachments.entries()) {
    if (!attachment.title) {
      return {
        success: false as const,
        error: `عنوان فایل اقدام شماره ${index + 1} الزامی است`,
      };
    }
    const attachmentTitleError = getContentTitleValidationError(attachment.title);
    if (attachmentTitleError) {
      return {
        success: false as const,
        error: `عنوان فایل اقدام شماره ${index + 1}: ${attachmentTitleError}`,
      };
    }
    if (!attachment.fileUrl) {
      return {
        success: false as const,
        error: `فایل اقدام «${attachment.title}» هنوز آپلود نشده است`,
      };
    }
  }

  const isUpdate = Boolean(cleaned.id);
  const previous = cleaned.id ? await pgDirectives.pgGetDirectiveById(cleaned.id) : null;
  const wasAlreadyPublished = Boolean(previous?.publishedAt);

  const result = await pgDirectives.pgSaveDirective({
    id: cleaned.id,
    campaignId: cleaned.campaignId,
    createdByUserId: access.session.userId,
    title: cleaned.title.trim(),
    body: cleaned.body,
    priority: cleaned.priority,
    startDate: cleaned.startDate,
    endDate: cleaned.endDate,
    letterFileUrl: cleaned.letterFileUrl,
    letterFileName: cleaned.letterFileName,
    letterMimeType: cleaned.letterMimeType,
    letterFileSize: cleaned.letterFileSize,
    ctaKind: cta.ctaKind,
    ctaLabel: cta.ctaLabel,
    ctaUrl: cta.ctaUrl,
    ctaTarget: cta.ctaTarget,
    attachments,
    audienceType,
    audienceRegion: cleaned.audienceRegion,
    audienceMinistryId: cleaned.audienceMinistryId,
    audienceOrganizationId: cleaned.audienceOrganizationId,
    audienceProvinces: cleaned.audienceProvinces ?? cleaned.audienceCities,
    published: true,
    selectedUserIds,
    parentUserId,
    crisisMode: cleaned.crisisMode,
    escalationAfterMinutes: cleaned.escalationAfterMinutes,
    topic: cleaned.topic,
  });

  const shouldSendSms =
    (cleaned.sendSmsOnPublish ?? true) && (!isUpdate || !wasAlreadyPublished);

  if (shouldSendSms) {
    await dispatchDirectiveSms(result.id, cleaned.title.trim(), cleaned.campaignId);
  }

  revalidateDirectives(cleaned.campaignId);
  return { success: true as const, id: result.id };
}

async function dispatchDirectiveSms(
  directiveId: string,
  title: string,
  campaignId: string
) {
  const pending = await pgDirectives.pgGetPendingSmsRecipients(directiveId);
  const smsSettings = await pgGetSmsProviderSettings();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  const path = `/admin/directives?campaign=${encodeURIComponent(campaignId)}`;
  const link = baseUrl ? `${baseUrl}${path}` : path;
  const message = buildDirectiveSmsText(title, link);

  for (const recipient of pending) {
    const smsResult = await sendSms(recipient.phone, message, smsSettings);

    if (!recipient.phone) {
      await pgDirectives.pgUpdateRecipientSmsStatus({
        directiveId,
        userId: recipient.userId,
        smsStatus: "no_phone",
        smsError: "شماره موبایل ثبت نشده",
      });
      continue;
    }

    if (smsResult.ok) {
      await pgDirectives.pgUpdateRecipientSmsStatus({
        directiveId,
        userId: recipient.userId,
        smsStatus: "sent",
      });
      continue;
    }

    await pgDirectives.pgUpdateRecipientSmsStatus({
      directiveId,
      userId: recipient.userId,
      smsStatus: smsResult.skipped ? "skipped" : "failed",
      smsError: smsResult.error,
    });
  }
}

export async function archiveDirectiveAction(id: string, campaignId: string) {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, error: "دسترسی ندارید" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const existing = await pgDirectives.pgGetDirectiveById(id);
  if (!existing || existing.campaignId !== campaignId) {
    return { success: false as const, error: "دستورکار یافت نشد" };
  }
  if (!canManageDirectiveRecord(access.session, existing)) {
    return { success: false as const, error: "فقط دستورکارهای خودتان را می‌توانید آرشیو کنید" };
  }

  const ok = await pgDirectives.pgArchiveDirective(id);
  if (!ok) {
    return { success: false as const, error: "دستورکار یافت نشد" };
  }

  revalidateDirectives(campaignId);
  return { success: true as const };
}

export async function confirmDirectiveSeenAction(directiveId: string, campaignId: string) {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!access.session.userId) {
    return { success: false as const, error: "برای تأیید مشاهده باید با حساب کاربری وارد شوید" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const ok = await pgDirectives.pgConfirmDirectiveSeen(directiveId, access.session.userId);
  if (!ok) {
    return { success: false as const, error: "این دستورکار برای شما ثبت نشده است" };
  }

  revalidateDirectives(campaignId);
  return { success: true as const };
}

export async function markDirectiveSeenAction(directiveId: string, campaignId: string) {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session?.userId) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  const ok = await pgDirectives.pgMarkDirectiveSeen(directiveId, access.session.userId);
  if (!ok) {
    return { success: false as const, error: "این دستورکار برای شما ثبت نشده است" };
  }
  revalidateDirectives(campaignId);
  revalidatePath(`/admin/directives/${directiveId}`);
  return { success: true as const };
}

export async function markDirectiveExecutedAction(directiveId: string, campaignId: string) {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session?.userId) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  const ok = await pgDirectives.pgMarkDirectiveExecuted(directiveId, access.session.userId);
  if (!ok) {
    return { success: false as const, error: "این دستورکار برای شما ثبت نشده است" };
  }
  revalidateDirectives(campaignId);
  revalidatePath(`/admin/directives/${directiveId}`);
  return { success: true as const };
}

export async function verifyDirectiveExecutionAction(
  directiveId: string,
  campaignId: string,
  userId: string
) {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session?.userId) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, error: "فقط مدیر یا کارفرما می‌تواند اجرا را تأیید کند" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  const ok = await pgDirectives.pgVerifyDirectiveExecution(
    directiveId,
    userId,
    access.session.userId
  );
  if (!ok) {
    return { success: false as const, error: "مخاطب یافت نشد" };
  }
  revalidateDirectives(campaignId);
  revalidatePath(`/admin/directives/${directiveId}`);
  return { success: true as const };
}

export async function processCrisisEscalationAction(directiveId: string, campaignId: string) {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized", sent: 0 };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required", sent: 0 };
  }

  const directive = await pgDirectives.pgGetDirectiveById(directiveId);
  if (!directive || directive.campaignId !== campaignId || !directive.crisisMode) {
    return { success: true as const, sent: 0 };
  }
  if (directive.escalatedAt) {
    return { success: true as const, sent: 0 };
  }

  const targets = await pgDirectives.pgListCrisisEscalationTargets(directiveId);
  if (targets.length === 0) {
    return { success: true as const, sent: 0 };
  }

  const smsSettings = await pgGetSmsProviderSettings();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  const path = `/admin/directives/${encodeURIComponent(directiveId)}?campaign=${encodeURIComponent(campaignId)}`;
  const link = baseUrl ? `${baseUrl}${path}` : path;
  let sent = 0;

  for (const target of targets) {
    const phone = target.alternateContactPhone || target.phone;
    if (!phone) continue;
    const message = `هشدار بحران: دستورکار «${directive.title}» هنوز تأیید دریافت نشده است. مخاطب: ${target.userName}. ${link}`;
    const smsResult = await sendSms(phone, message, smsSettings);
    if (smsResult.ok) sent += 1;
  }

  await pgDirectives.pgMarkDirectiveEscalated(directiveId);
  revalidateDirectives(campaignId);
  revalidatePath(`/admin/directives/${directiveId}`);
  return { success: true as const, sent };
}
