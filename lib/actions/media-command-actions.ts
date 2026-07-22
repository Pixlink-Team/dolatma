"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { hasContributorPermission } from "@/lib/contributor-permissions";
import { logAuditFromCurrentSession } from "@/lib/audit/log-event";
import * as pgExt from "@/lib/db/repository-extended";
import {
  pgDeleteMediaAccount,
  pgDuplicateMediaContent,
  pgGetMediaCommandBundle,
  pgGetMediaContent,
  pgGetMediaOpsSnapshot,
  pgListMediaContentEvents,
  pgReconnectMediaAccount,
  pgRescheduleMediaContent,
  pgUpdateMediaContentStatus,
  pgUpsertMediaAccount,
  pgUpsertMediaContent,
  pgUpsertMediaInteraction,
  pgUpsertMediaLibraryItem,
  pgUpsertMediaOrder,
  type MediaContentUpsertInput,
} from "@/lib/db/repository-media-command";
import type {
  MediaAccountPermission,
  MediaAccountStatus,
  MediaContentStatus,
  MediaInteractionStatus,
  MediaLibraryCategory,
  MediaPublishMode,
  MediaPublishOrderMode,
  MediaPublishOrderStatus,
} from "@/lib/media-command/types";
import type { MediaPlatformId } from "@/lib/media-command/platforms";
import { isPostgresConfigured } from "@/lib/utils";

function revalidateMedia(campaignId: string) {
  revalidatePath("/admin/media-command");
  revalidatePath("/admin/media-command/publish");
  revalidatePath("/admin/media-command/calendar");
  revalidatePath("/admin/media-command/contents");
  revalidatePath("/admin/media-command/orders");
  revalidatePath("/admin/media-command/inbox");
  revalidatePath("/admin/media-command/smart-reply");
  revalidatePath("/admin/media-command/accounts");
  revalidatePath("/admin/media-command/analytics");
  revalidatePath("/admin/media-command/library");
  revalidatePath("/admin/media-command/settings");
  revalidatePath(`/admin/media-command?campaign=${campaignId}`);
}

async function assertMediaAccess(campaignId: string) {
  const session = await getAuthSession();
  if (!session) return { session: null, error: "Unauthorized" as const };
  if (isFullAdmin(session)) return { session, error: null };
  if (!session.userId || !isPostgresConfigured()) {
    return { session: null, error: "Unauthorized" as const };
  }
  const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId, campaignId);
  if (!permissions || !hasContributorPermission(permissions, "mediaCommand")) {
    return { session: null, error: "دسترسی به میز فرمان رسانه‌ای ندارید" as const };
  }
  return { session, error: null };
}

export async function getMediaCommandBundleAction(campaignId: string) {
  const access = await assertMediaAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  const bundle = await pgGetMediaCommandBundle(campaignId);
  return { success: true as const, bundle };
}

export async function getMediaOpsSnapshotAction(campaignId: string, directiveId?: string | null) {
  const access = await assertMediaAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  const snapshot = await pgGetMediaOpsSnapshot(campaignId, directiveId);
  return { success: true as const, snapshot };
}

export async function upsertMediaAccountAction(input: {
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
}) {
  const access = await assertMediaAccess(input.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  const result = await pgUpsertMediaAccount({
    ...input,
    ownerUserId: access.session.userId ?? null,
  });
  if (result.success) {
    await logAuditFromCurrentSession({
      category: "content",
      action: input.id ? "media_account.update" : "media_account.create",
      entityType: "media_account",
      entityId: result.id,
      campaignId: input.campaignId,
      label: input.id ? "به‌روزرسانی حساب رسانه‌ای" : "اتصال حساب رسانه‌ای",
      metadata: { platform: input.platform, accountName: input.accountName },
    });
    revalidateMedia(input.campaignId);
  }
  return result;
}

export async function deleteMediaAccountAction(campaignId: string, id: string) {
  const access = await assertMediaAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  const result = await pgDeleteMediaAccount(campaignId, id);
  if (result.success) {
    await logAuditFromCurrentSession({
      category: "content",
      action: "media_account.delete",
      entityType: "media_account",
      entityId: id,
      campaignId,
      label: "حذف حساب رسانه‌ای",
    });
    revalidateMedia(campaignId);
  }
  return result;
}

export async function reconnectMediaAccountAction(campaignId: string, id: string) {
  const access = await assertMediaAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  const result = await pgReconnectMediaAccount(campaignId, id);
  if (result.success) {
    await logAuditFromCurrentSession({
      category: "content",
      action: "media_account.reconnect",
      entityType: "media_account",
      entityId: id,
      campaignId,
      label: "اتصال مجدد حساب رسانه‌ای",
    });
    revalidateMedia(campaignId);
  }
  return result;
}

export async function upsertMediaContentAction(
  input: Omit<MediaContentUpsertInput, "actorUserId" | "actorName">
) {
  const access = await assertMediaAccess(input.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  const result = await pgUpsertMediaContent({
    ...input,
    ownerUserId: input.ownerUserId ?? access.session.userId ?? null,
    actorUserId: access.session.userId ?? null,
    actorName: access.session.name ?? null,
  });
  if (result.success) {
    await logAuditFromCurrentSession({
      category: "content",
      action: input.id ? "media_content.update" : "media_content.create",
      entityType: "media_content",
      entityId: result.id,
      campaignId: input.campaignId,
      label: input.id ? "ویرایش محتوای رسانه‌ای" : "ساخت محتوای رسانه‌ای",
      metadata: { status: input.status },
    });
    revalidateMedia(input.campaignId);
  }
  return result;
}

export async function updateMediaContentStatusAction(input: {
  campaignId: string;
  id: string;
  status: MediaContentStatus;
  scheduledAt?: string | null;
  summary?: string;
}) {
  const access = await assertMediaAccess(input.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  const result = await pgUpdateMediaContentStatus({
    ...input,
    actorUserId: access.session.userId ?? null,
  });
  if (result.success) {
    await logAuditFromCurrentSession({
      category: "content",
      action: "media_content.status",
      entityType: "media_content",
      entityId: input.id,
      campaignId: input.campaignId,
      label: input.summary ?? `تغییر وضعیت محتوا به ${input.status}`,
      metadata: { status: input.status },
    });
    revalidateMedia(input.campaignId);
  }
  return result;
}

export async function rescheduleMediaContentAction(input: {
  campaignId: string;
  id: string;
  scheduledAt: string;
}) {
  const access = await assertMediaAccess(input.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  const existing = await pgGetMediaContent(input.campaignId, input.id);
  if (!existing) return { success: false as const, error: "محتوا یافت نشد" };
  if (
    (existing.publishMode === "central" ||
      existing.publishMode === "urgent" ||
      existing.publishMode === "crisis") &&
    !isFullAdmin(access.session) &&
    access.session.role !== "client"
  ) {
    return {
      success: false as const,
      error: "تغییر زمان محتوای مرکزی یا فوری فقط با مجوز مدیر/کارفرما مجاز است",
    };
  }
  const result = await pgRescheduleMediaContent({
    ...input,
    actorUserId: access.session.userId ?? null,
  });
  if (result.success) {
    await logAuditFromCurrentSession({
      category: "content",
      action: "media_content.reschedule",
      entityType: "media_content",
      entityId: input.id,
      campaignId: input.campaignId,
      label: "جابه‌جایی زمان انتشار در تقویم",
      metadata: { scheduledAt: input.scheduledAt },
    });
    revalidateMedia(input.campaignId);
  }
  return result;
}

export async function duplicateMediaContentAction(campaignId: string, id: string) {
  const access = await assertMediaAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  const result = await pgDuplicateMediaContent({
    campaignId,
    id,
    actorUserId: access.session.userId ?? null,
  });
  if (result.success) revalidateMedia(campaignId);
  return result;
}

export async function listMediaContentEventsAction(campaignId: string, contentId: string) {
  const access = await assertMediaAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, events: [], error: access.error };
  }
  const events = await pgListMediaContentEvents(contentId);
  return { success: true as const, events };
}

export async function upsertMediaOrderAction(input: {
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
}) {
  const access = await assertMediaAccess(input.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  const result = await pgUpsertMediaOrder({
    ...input,
    ownerUserId: access.session.userId ?? null,
  });
  if (result.success) {
    await logAuditFromCurrentSession({
      category: "content",
      action: input.id ? "media_order.update" : "media_order.create",
      entityType: "media_publish_order",
      entityId: result.id,
      campaignId: input.campaignId,
      label: input.id ? "ویرایش دستور انتشار" : "ثبت دستور انتشار",
    });
    revalidateMedia(input.campaignId);
  }
  return result;
}

export async function upsertMediaInteractionAction(input: {
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
}) {
  const access = await assertMediaAccess(input.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  const result = await pgUpsertMediaInteraction(input);
  if (result.success) revalidateMedia(input.campaignId);
  return result;
}

export async function upsertMediaLibraryItemAction(input: {
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
}) {
  const access = await assertMediaAccess(input.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }
  const result = await pgUpsertMediaLibraryItem({
    ...input,
    ownerUserId: access.session.userId ?? null,
  });
  if (result.success) revalidateMedia(input.campaignId);
  return result;
}

export async function generateSmartReplyAction(input: {
  campaignId: string;
  interactionId: string;
  body: string;
  topicTag?: string | null;
}) {
  const access = await assertMediaAccess(input.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error };
  }

  const suggestedReply =
    `با سپاس از بازخورد شما. براساس پیام مصوب کمپین و منابع رسمی راستا: ` +
    `موضوع مطرح‌شده بررسی شده و اطلاعات تکمیلی به‌زودی از کانال‌های رسمی اعلام می‌شود. ` +
    (input.topicTag ? `برچسب موضوعی: ${input.topicTag}. ` : "") +
    `در صورت نیاز به پیگیری، لطفاً از مسیر رسمی سازمان اقدام فرمایید.`;

  const actionSuggestion =
    input.body.includes("شایعه") || input.body.includes("غلط")
      ? "ثبت به‌عنوان شایعه"
      : input.body.includes("شکایت")
        ? "ارجاع به مدیر"
        : "پاسخ عمومی";

  const { getSql } = await import("@/lib/db/client");
  const { ensureMediaCommandSchema } = await import("@/lib/db/repository-media-command");
  await ensureMediaCommandSchema();
  const sql = getSql();
  await sql`
    UPDATE media_interactions SET
      suggested_reply = ${suggestedReply},
      status = 'suggested_reply_ready',
      updated_at = now()
    WHERE id = ${input.interactionId} AND campaign_id = ${input.campaignId}
  `;

  revalidateMedia(input.campaignId);
  return {
    success: true as const,
    suggestedReply,
    actionSuggestion,
    sources: [
      "پیام‌های مصوب کمپین",
      "کتابخانه محتوای رسمی",
      "پاسخ‌های تأییدشده قبلی",
      "سیاست لحن سازمان",
    ],
  };
}

export type { MediaPublishMode };
