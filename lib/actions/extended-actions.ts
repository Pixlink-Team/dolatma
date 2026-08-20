"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, getOwnerFilter, isFullAdmin } from "@/lib/auth/get-session";
import { assertCanMutateOwnedContent } from "@/lib/auth/assert-content-ownership";
import { canAccessCampaignSettingsForCampaign, canManageSubtreeUsers, isClientUser } from "@/lib/auth/access";
import { getSessionHomeDeviceId } from "@/lib/auth/device-access";
import { pgIsDeviceInSubtree } from "@/lib/db/repository-devices";
import { pgGetOrganizationById } from "@/lib/db/repository-ministries";
import {
  assertTutorialForPossibleCreate,
} from "@/lib/auth/require-tutorial-completion";
import {
  hasContributorPermission,
  limitCampaignPermissionsToGrantor,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import { hashPassword } from "@/lib/auth/password";
import * as pgExt from "@/lib/db/repository-extended";
import type { MeetingDecisionPayload, MeetingTaskPayload } from "@/lib/db/repository-extended";
import type { AdminRole, BroadcastReport, CampaignActivity, CampaignMeeting, SmsSendReport, SocialMediaPost, SocialPlatform, SocialPlatformStat } from "@/lib/types";
import {
  inferDefaultAuthorityLevel,
  type DirectiveAuthorityLevel,
} from "@/lib/directive-authority";
import type { OrgRole } from "@/lib/org-roles";
import { isOrgRole } from "@/lib/org-roles";
import { isOrgUserRole, normalizeAdminRole } from "@/lib/user-roles";
import { isGroupSocialPost, isWebOutletPublication } from "@/lib/social-posts";
import { isPostgresConfigured } from "@/lib/utils";
import { resolveSaveOwnerUserId } from "@/lib/admin-content-owner";
import { stripFileAccessTokensDeep } from "@/lib/uploads";
import {
  auditContentChange,
  auditContentDelete,
  logAuditForSession,
} from "@/lib/audit/log-event";
import { getContentTitleValidationError } from "@/lib/content-constraints";
import type { TutorialSectionKey } from "@/lib/section-tutorials";
import { assertProductionSourceAllowed } from "@/lib/production-source";

function validateTitlePayload(data: { title?: unknown }) {
  const error = getContentTitleValidationError(data.title);
  return error ? { success: false as const, error } : null;
}

function activityTutorialKey(
  activityType: CampaignActivity["activityType"] | undefined
): TutorialSectionKey {
  if (activityType === "magazine" || activityType === "newspaper") {
    return "pressPublications";
  }
  return "activities";
}

async function revalidateExtended(slug?: string) {
  revalidatePath("/admin/social-posts");
  revalidatePath("/admin/social-analytics");
  revalidatePath("/admin/site-publications");
  revalidatePath("/admin/news-agencies");
  revalidatePath("/admin/activities");
  revalidatePath("/admin/broadcast");
  revalidatePath("/admin/meetings");
  revalidatePath("/admin/sms-reports");
  revalidatePath("/admin/users");
  revalidatePath("/admin/profile");
  revalidatePath("/admin/analytics");
  revalidatePath("/campaign");
  if (slug) revalidatePath(`/campaign/${slug}`);
}

async function withSaveOwnerScope<T extends { id?: string; ownerUserId?: string | null; published?: boolean }>(
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>,
  data: T
): Promise<T> {
  const cleaned = stripFileAccessTokensDeep(data);
  const ownerUserId = await resolveSaveOwnerUserId({
    session,
    explicitOwnerUserId: cleaned.ownerUserId,
    contentId: cleaned.id,
  });

  if (!isFullAdmin(session)) {
    return {
      ...cleaned,
      ownerUserId,
      published: true,
    };
  }

  return {
    ...cleaned,
    ownerUserId,
  };
}

export async function saveSocialPostAction(data: Partial<SocialMediaPost> & { id?: string }) {
  const validationError = validateTitlePayload(data);
  if (validationError) return validationError;
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (!isFullAdmin(session) && data.campaignId) {
    const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId!, data.campaignId);
    if (!hasContributorPermission(permissions, "socialPosts")) {
      return { success: false, error: "دسترسی ندارید" };
    }
  }

  const payload = await withSaveOwnerScope(session, data);

  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  if (data.id) {
    const denied = await assertCanMutateOwnedContent(session, "social_media_posts", data.id);
    if (denied) return denied;
  }

  const sourceDenied = await assertProductionSourceAllowed(
    session,
    payload.campaignId ?? data.campaignId ?? "",
    { ...payload, id: data.id }
  );
  if (sourceDenied) return sourceDenied;

  const tutorialKey = isWebOutletPublication({ platform: data.platform ?? "other" })
    ? "sitePublications"
    : "socialPosts";
  const tutorialDenied = await assertTutorialForPossibleCreate(
    tutorialKey,
    "social_media_posts",
    data.id
  );
  if (tutorialDenied) return tutorialDenied;

  const { denyIfCreateQuotaExceeded } = await import("@/lib/scoring/daily-cap-and-duplicates");
  const quota = await denyIfCreateQuotaExceeded({
    campaignId: payload.campaignId ?? data.campaignId ?? "",
    ownerUserId: payload.ownerUserId ?? session.userId,
    contentId: data.id,
    table: "social_media_posts",
    contentType: isWebOutletPublication({ platform: data.platform ?? "other" })
      ? "site_publication"
      : "social_post",
  });
  if (quota) return quota;

  const result = await pgExt.pgSaveSocialPost(payload);
  await auditContentChange({
    isUpdate: Boolean(data.id),
    entityType: "social_post",
    entityId: data.id,
    campaignId: data.campaignId,
    label: data.title ?? data.platform,
  });
  await revalidateExtended();
  return result;
}

export async function deleteSocialPostAction(id: string) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };
  const denied = await assertCanMutateOwnedContent(session, "social_media_posts", id);
  if (denied) return denied;
  await pgExt.pgDeleteSocialPost(id);
  await auditContentDelete({ entityType: "social_post", entityId: id });
  await revalidateExtended();
  return { success: true };
}

export async function fetchSocialLinkMetricsAction(input: {
  url: string;
  platform?: string | null;
}) {
  const session = await getAuthSession();
  if (!session) return { success: false as const, error: "Unauthorized" };

  const { fetchSocialLinkMetrics } = await import("@/lib/services/link-metrics");
  const metrics = await fetchSocialLinkMetrics(input.url, input.platform);

  if (metrics.error || metrics.supported === false) {
    return {
      success: false as const,
      error: metrics.error ?? "واکشی از این لینک پشتیبانی نمی‌شود",
      platform: metrics.platform,
    };
  }

  return {
    success: true as const,
    platform: metrics.platform,
    views: metrics.views,
    likes: metrics.likes,
    comments: metrics.comments,
    shares: metrics.shares,
    title: metrics.title ?? null,
    description: metrics.description ?? null,
    coverImageUrl: metrics.coverImageUrl ?? null,
    publishedDate: metrics.publishedDate ?? null,
  };
}

export async function refreshSocialPostMetricsAction(postId: string) {
  const session = await getAuthSession();
  if (!session) return { success: false as const, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const denied = await assertCanMutateOwnedContent(session, "social_media_posts", postId);
  if (denied) return { success: false as const, error: denied.error };

  const existing = await pgExt.pgGetSocialPostById(postId);
  if (!existing) return { success: false as const, error: "پست یافت نشد" };

  if (isGroupSocialPost(existing)) {
    return {
      success: false as const,
      error: "برای پخش گروهی، بازدید هر لینک را دستی وارد کنید",
    };
  }

  if (!isFullAdmin(session) && existing.campaignId) {
    const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId!, existing.campaignId);
    if (!hasContributorPermission(permissions, "socialPosts")) {
      return { success: false as const, error: "دسترسی ندارید" };
    }
  }

  const { fetchSocialLinkMetrics } = await import("@/lib/services/link-metrics");
  const metrics = await fetchSocialLinkMetrics(existing.link, existing.platform);

  if (metrics.error || metrics.supported === false) {
    return {
      success: false as const,
      error: metrics.error ?? "واکشی از این لینک پشتیبانی نمی‌شود",
      platform: metrics.platform,
    };
  }

  const nextTitle =
    existing.title?.trim() || metrics.title?.trim() || existing.title || "";
  const nextDescription = existing.description?.trim()
    ? existing.description
    : metrics.description ?? existing.description;
  const nextCover = existing.coverImageUrl?.trim()
    ? existing.coverImageUrl
    : metrics.coverImageUrl ?? existing.coverImageUrl;
  const nextPublishedDate = existing.publishedDate || metrics.publishedDate || existing.publishedDate;

  const result = await pgExt.pgSaveSocialPost({
    ...existing,
    title: nextTitle,
    description: nextDescription,
    coverImageUrl: nextCover,
    publishedDate: nextPublishedDate,
    views: metrics.views ?? existing.views,
    likes: metrics.likes ?? existing.likes,
    comments: metrics.comments ?? existing.comments,
    shares: metrics.shares ?? existing.shares,
  });

  await auditContentChange({
    isUpdate: true,
    entityType: "social_post",
    entityId: postId,
    campaignId: existing.campaignId,
    label: nextTitle || existing.platform,
  });
  await revalidateExtended();

  return {
    success: true as const,
    id: result.id,
    views: metrics.views ?? existing.views,
    likes: metrics.likes ?? existing.likes,
    comments: metrics.comments ?? existing.comments,
    shares: metrics.shares ?? existing.shares,
    title: nextTitle,
    description: nextDescription ?? null,
    coverImageUrl: nextCover ?? null,
    publishedDate: nextPublishedDate,
  };
}

export async function saveSocialPlatformStatAction(data: Partial<SocialPlatformStat> & { id?: string }) {
  const validationError = validateTitlePayload(data);
  if (validationError) return validationError;
  const profileUrl = typeof data.profileUrl === "string" ? data.profileUrl.trim() : "";
  if (!profileUrl) {
    return { success: false, error: "لینک صفحه الزامی است" };
  }
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (!isFullAdmin(session) && data.campaignId) {
    const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId!, data.campaignId);
    if (!hasContributorPermission(permissions, "socialPosts")) {
      return { success: false, error: "دسترسی ندارید" };
    }
  }

  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  if (data.id && !isFullAdmin(session)) {
    const existing = await pgExt.pgGetSocialPlatformStatById(data.id);
    if (!existing) {
      return { success: false, error: "رکورد یافت نشد" };
    }
    if (existing.ownerUserId !== session.userId) {
      return { success: false, error: "دسترسی ندارید" };
    }
  }

  const tutorialDenied = await assertTutorialForPossibleCreate(
    "socialAnalytics",
    "social_platform_stats",
    data.id
  );
  if (tutorialDenied) return tutorialDenied;

  const payload = await withSaveOwnerScope(session, { ...data, profileUrl });

  const result = await pgExt.pgSaveSocialPlatformStat(payload);
  if (result.success && result.id) {
    const { syncSocialCapacityFromContent } = await import(
      "@/lib/db/sync-capacity-from-content"
    );
    await syncSocialCapacityFromContent({
      ownerUserId: payload.ownerUserId,
      sourceId: result.id,
      platform: (payload.platform ?? "instagram") as SocialPlatform,
      title: payload.title,
      profileUrl: payload.profileUrl,
      followers: payload.followers,
    });
  }
  await auditContentChange({
    isUpdate: Boolean(data.id),
    entityType: "social_platform_stat",
    entityId: data.id,
    campaignId: data.campaignId,
    label: data.title ?? data.platform,
  });
  await revalidateExtended();
  return result;
}

export async function deleteSocialPlatformStatAction(id: string) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };

  if (!isFullAdmin(session)) {
    const existing = await pgExt.pgGetSocialPlatformStatById(id);
    if (!existing) {
      return { success: false, error: "رکورد یافت نشد" };
    }
    if (existing.ownerUserId !== session.userId) {
      return { success: false, error: "دسترسی ندارید" };
    }
  }

  await pgExt.pgDeleteSocialPlatformStat(id);
  const { removeSyncedCapacity } = await import("@/lib/db/sync-capacity-from-content");
  await removeSyncedCapacity("social_platform_stat", id);
  await auditContentDelete({ entityType: "social_platform_stat", entityId: id });
  await revalidateExtended();
  return { success: true };
}

export async function saveBroadcastReportAction(data: Partial<BroadcastReport> & { id?: string }) {
  const validationError = validateTitlePayload(data);
  if (validationError) return validationError;
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (!isFullAdmin(session) && data.campaignId) {
    const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId!, data.campaignId);
    if (!hasContributorPermission(permissions, "broadcast")) {
      return { success: false, error: "دسترسی ندارید" };
    }
  }

  const payload = await withSaveOwnerScope(session, data);

  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  const sourceDenied = await assertProductionSourceAllowed(
    session,
    payload.campaignId ?? data.campaignId ?? "",
    { ...payload, id: data.id }
  );
  if (sourceDenied) return sourceDenied;

  const tutorialDenied = await assertTutorialForPossibleCreate(
    "broadcast",
    "broadcast_reports",
    data.id
  );
  if (tutorialDenied) return tutorialDenied;

  const { denyIfCreateQuotaExceeded } = await import("@/lib/scoring/daily-cap-and-duplicates");
  const quota = await denyIfCreateQuotaExceeded({
    campaignId: payload.campaignId ?? data.campaignId ?? "",
    ownerUserId: payload.ownerUserId ?? session.userId,
    contentId: data.id,
    table: "broadcast_reports",
  });
  if (quota) return quota;

  const result = await pgExt.pgSaveBroadcastReport(payload);
  await auditContentChange({
    isUpdate: Boolean(data.id),
    entityType: "broadcast_report",
    entityId: data.id,
    campaignId: data.campaignId,
    label: data.title,
  });
  await revalidateExtended();
  return result;
}

export async function deleteBroadcastReportAction(id: string) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };
  const denied = await assertCanMutateOwnedContent(session, "broadcast_reports", id);
  if (denied) return denied;
  await pgExt.pgDeleteBroadcastReport(id);
  await auditContentDelete({ entityType: "broadcast_report", entityId: id });
  await revalidateExtended();
  return { success: true };
}

export async function saveSmsSendReportAction(data: Partial<SmsSendReport> & { id?: string }) {
  const validationError = validateTitlePayload(data);
  if (validationError) return validationError;
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (!isFullAdmin(session) && data.campaignId) {
    const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId!, data.campaignId);
    if (!hasContributorPermission(permissions, "smsReports")) {
      return { success: false, error: "دسترسی ندارید" };
    }
  }

  const payload = await withSaveOwnerScope(session, data);

  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  const sourceDenied = await assertProductionSourceAllowed(
    session,
    payload.campaignId ?? data.campaignId ?? "",
    { ...payload, id: data.id }
  );
  if (sourceDenied) return sourceDenied;

  const tutorialDenied = await assertTutorialForPossibleCreate(
    "smsReports",
    "sms_send_reports",
    data.id
  );
  if (tutorialDenied) return tutorialDenied;

  if (data.id) {
    const denied = await assertCanMutateOwnedContent(session, "sms_send_reports", data.id);
    if (denied) return denied;
  }

  const result = await pgExt.pgSaveSmsSendReport(payload);
  await auditContentChange({
    isUpdate: Boolean(data.id),
    entityType: "sms_send_report",
    entityId: data.id,
    campaignId: data.campaignId,
    label: data.title,
  });
  await revalidateExtended();
  return result;
}

export async function deleteSmsSendReportAction(id: string) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };
  const denied = await assertCanMutateOwnedContent(session, "sms_send_reports", id);
  if (denied) return denied;
  await pgExt.pgDeleteSmsSendReport(id);
  await auditContentDelete({ entityType: "sms_send_report", entityId: id });
  await revalidateExtended();
  return { success: true };
}

export async function saveCampaignActivityAction(data: Partial<CampaignActivity> & { id?: string }) {
  const validationError = validateTitlePayload(data);
  if (validationError) return validationError;
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (!isFullAdmin(session) && data.campaignId) {
    const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId!, data.campaignId);
    if (!hasContributorPermission(permissions, "activities")) {
      return { success: false, error: "دسترسی ندارید" };
    }
  }

  const payload = await withSaveOwnerScope(session, data);

  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  const sourceDenied = await assertProductionSourceAllowed(
    session,
    payload.campaignId ?? data.campaignId ?? "",
    { ...payload, id: data.id }
  );
  if (sourceDenied) return sourceDenied;

  const tutorialDenied = await assertTutorialForPossibleCreate(
    activityTutorialKey(data.activityType),
    "campaign_activities",
    data.id
  );
  if (tutorialDenied) return tutorialDenied;

  const { denyIfCreateQuotaExceeded } = await import("@/lib/scoring/daily-cap-and-duplicates");
  const quota = await denyIfCreateQuotaExceeded({
    campaignId: payload.campaignId ?? data.campaignId ?? "",
    ownerUserId: payload.ownerUserId ?? session.userId,
    contentId: data.id,
    table: "campaign_activities",
  });
  if (quota) return quota;

  const result = await pgExt.pgSaveCampaignActivity(payload);
  await auditContentChange({
    isUpdate: Boolean(data.id),
    entityType: "activity",
    entityId: data.id,
    campaignId: data.campaignId,
    label: data.title,
    metadata: { activityType: data.activityType },
  });
  await revalidateExtended();
  return result;
}

export async function deleteCampaignActivityAction(id: string) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };
  const denied = await assertCanMutateOwnedContent(session, "campaign_activities", id);
  if (denied) return denied;
  await pgExt.pgDeleteCampaignActivity(id);
  await auditContentDelete({ entityType: "activity", entityId: id });
  await revalidateExtended();
  return { success: true };
}

export async function saveMeetingAction(
  data: Partial<CampaignMeeting> & { id?: string },
  tasks: MeetingTaskPayload[],
  decisions: MeetingDecisionPayload[] = []
) {
  const validationError = validateTitlePayload(data);
  if (validationError) return validationError;
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (!isFullAdmin(session) && data.campaignId) {
    const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId!, data.campaignId);
    if (!hasContributorPermission(permissions, "meetings")) {
      return { success: false, error: "دسترسی ندارید" };
    }
  }

  const payload = await withSaveOwnerScope(session, data);

  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  const tutorialDenied = await assertTutorialForPossibleCreate(
    "meetings",
    "campaign_meetings",
    data.id
  );
  if (tutorialDenied) return tutorialDenied;

  const { denyIfCreateQuotaExceeded } = await import("@/lib/scoring/daily-cap-and-duplicates");
  const quota = await denyIfCreateQuotaExceeded({
    campaignId: payload.campaignId ?? data.campaignId ?? "",
    ownerUserId: payload.ownerUserId ?? session.userId,
    contentId: data.id,
    table: "campaign_meetings",
  });
  if (quota) return quota;

  const result = await pgExt.pgSaveMeetingWithTasks(payload, tasks, decisions);
  await auditContentChange({
    isUpdate: Boolean(data.id),
    entityType: "meeting",
    entityId: data.id,
    campaignId: data.campaignId,
    label: data.title,
    metadata: { taskCount: tasks.length, decisionCount: decisions.length },
  });
  await revalidateExtended();
  return result;
}

export async function saveMeetingsViewPasswordAction(
  campaignId: string,
  options: { password?: string; removePassword?: boolean }
) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (!isFullAdmin(session)) {
    const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId!, campaignId);
    if (!hasContributorPermission(permissions, "meetings")) {
      return { success: false, error: "دسترسی ندارید" };
    }
  }

  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  if (options.removePassword) {
    await pgExt.pgUpdateMeetingsViewPassword(campaignId, null);
    await revalidateExtended();
    return { success: true };
  }

  const password = options.password?.trim();
  if (!password) {
    return { success: false, error: "رمز الزامی است" };
  }

  const passwordHash = await hashPassword(password);
  await pgExt.pgUpdateMeetingsViewPassword(campaignId, passwordHash);
  await revalidateExtended();
  return { success: true };
}

export async function saveCampaignPagePasswordAction(
  campaignId: string,
  options: { password?: string; removePassword?: boolean }
) {
  const session = await getAuthSession();
  if (!session || !(await canAccessCampaignSettingsForCampaign(session, campaignId))) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  if (options.removePassword) {
    await pgExt.pgUpdatePageViewPassword(campaignId, null);
    await revalidateExtended();
    revalidatePath("/campaign");
    return { success: true };
  }

  const password = options.password?.trim();
  if (!password) {
    return { success: false, error: "رمز الزامی است" };
  }
  if (password.length < 4) {
    return { success: false, error: "رمز باید حداقل ۴ کاراکتر باشد" };
  }

  const passwordHash = await hashPassword(password);
  await pgExt.pgUpdatePageViewPassword(campaignId, passwordHash);
  await revalidateExtended();
  revalidatePath("/campaign");
  return { success: true };
}

export async function deleteMeetingAction(id: string) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };

  const meeting = await pgExt.pgGetMeetingById(id);
  if (!meeting) return { success: false, error: "جلسه یافت نشد" };

  if (!isFullAdmin(session)) {
    if (!session.userId || meeting.ownerUserId !== session.userId) {
      return { success: false, error: "دسترسی ندارید" };
    }
  }

  await pgExt.pgDeleteMeeting(id);
  await auditContentDelete({ entityType: "meeting", entityId: id });
  await revalidateExtended();
  return { success: true };
}

export async function toggleMeetingTaskAction(taskId: string, completed: boolean) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };

  const meeting = await pgExt.pgGetMeetingTaskOwner(taskId);
  if (!meeting) return { success: false, error: "وظیفه یافت نشد" };

  if (!isFullAdmin(session)) {
    if (meeting.ownerUserId !== session.userId) {
      return { success: false, error: "دسترسی ندارید" };
    }
  }

  await pgExt.pgToggleMeetingTask(taskId, completed);
  await revalidateExtended();
  return { success: true };
}

export async function saveProfileAction(data: {
  name: string;
  province?: string | null;
  city?: string | null;
  accountManagerName?: string | null;
  phone?: string | null;
  alternateContactName?: string | null;
  alternateContactPhone?: string | null;
}) {
  const session = await getAuthSession();
  if (!session?.userId) {
    return { success: false, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  const user = await pgExt.pgGetUserById(session.userId);
  if (!user) {
    return { success: false, error: "کاربر یافت نشد" };
  }

  // Preserve org/device placement — profile edits must not clear ministry linkage.
  const result = await pgExt.pgSaveUser({
    id: session.userId,
    email: user.email,
    name: data.name,
    role: user.role,
    orgRole: user.orgRole ?? null,
    province: data.province,
    city: data.city,
    region: user.region,
    phone: data.phone?.trim() || null,
    accountManagerName: data.accountManagerName,
    alternateContactName: data.alternateContactName,
    alternateContactPhone: data.alternateContactPhone,
    ministryId: user.ministryId ?? null,
    organizationId: user.organizationId ?? null,
    parentUserId: user.parentUserId ?? null,
    campaignIds: user.campaignIds,
    campaignPermissions: user.campaignPermissions,
  });
  await logAuditForSession(session, {
    category: "admin",
    action: "profile.update",
    entityType: "user",
    entityId: session.userId,
    label: "به‌روزرسانی پروفایل",
  });
  await revalidateExtended();
  return result;
}

export async function saveUserAction(data: {
  id?: string;
  email: string;
  name: string;
  role: AdminRole;
  orgRole?: OrgRole | null;
  password?: string;
  province?: string | null;
  city?: string | null;
  region?: string | null;
  phone?: string | null;
  accountManagerName?: string | null;
  ministryId?: string | null;
  organizationId?: string | null;
  parentUserId?: string | null;
  authorityLevel?: DirectiveAuthorityLevel | null;
  authorityOther?: string | null;
  campaignIds?: string[];
  campaignPermissions?: Record<string, ContributorPermissions>;
}) {
  try {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };

  const isAdmin = isFullAdmin(session);
  const actor =
    session.userId && isOrgUserRole(session.role)
      ? await pgExt.pgGetUserById(session.userId)
      : null;
  const isSubtreeManager = canManageSubtreeUsers(session);

  if (!isAdmin && !isSubtreeManager) {
    return { success: false, error: "Unauthorized" };
  }

  let role = normalizeAdminRole(data.role);
  let orgRole: OrgRole | null = isOrgRole(data.orgRole) ? data.orgRole : null;
  let ministryId = data.ministryId ?? null;
  let organizationId = data.organizationId ?? null;
  let parentUserId = data.parentUserId ?? null;
  let campaignIds = data.campaignIds;
  let campaignPermissions = data.campaignPermissions;

  if (isSubtreeManager && !isAdmin) {
    if (!session.userId || !actor) return { success: false, error: "Unauthorized" };

    // Subtree managers may only create/edit org users under themselves.
    role = "org_user";
    orgRole = isOrgRole(data.orgRole) ? data.orgRole : "pr";
    parentUserId = session.userId;
    ministryId = actor.ministryId ?? null;
    organizationId = data.organizationId ?? actor.organizationId ?? null;
    const actorCampaignIds = actor.campaignIds ?? [];
    const requestedCampaignIds = campaignIds?.length ? campaignIds : actorCampaignIds;
    // Never assign campaigns the actor themselves does not belong to.
    campaignIds = requestedCampaignIds.filter((id) => actorCampaignIds.includes(id));
    // Cannot grant section access the actor does not have — cascades down the tree.
    campaignPermissions = limitCampaignPermissionsToGrantor(
      campaignPermissions ?? actor.campaignPermissions,
      actor.campaignPermissions,
      campaignIds
    );

    // Subunit managers may only assign their home org or device-tree descendants.
    if (actor.organizationId) {
      organizationId = organizationId || actor.organizationId;
      const homeId = await getSessionHomeDeviceId(session);
      if (!homeId) {
        if (organizationId !== actor.organizationId) {
          return {
            success: false,
            error: "فقط زیرمجموعه خودتان را می‌توانید انتخاب کنید",
          };
        }
      } else {
        const inSubtree = await pgIsDeviceInSubtree(organizationId, homeId);
        if (!inSubtree) {
          return {
            success: false,
            error: "فقط زیرمجموعه خودتان یا زیرمجموعه‌های زیر آن را می‌توانید انتخاب کنید",
          };
        }
      }
    } else if (organizationId && actor.ministryId) {
      const org = await pgGetOrganizationById(organizationId);
      if (org && org.ministryId !== actor.ministryId) {
        return {
          success: false,
          error: "زیرمجموعه باید متعلق به وزارتخانه خودتان باشد",
        };
      }
      if (!org) {
        const inMinistryTree = await pgIsDeviceInSubtree(organizationId, actor.ministryId);
        if (!inMinistryTree) {
          return {
            success: false,
            error: "زیرمجموعه باید متعلق به وزارتخانه خودتان باشد",
          };
        }
      }
    }

    if (data.id) {
      const existing = await pgExt.pgGetUserById(data.id);
      if (
        !existing ||
        existing.parentUserId !== session.userId ||
        !isOrgUserRole(existing.role)
      ) {
        return { success: false, error: "فقط زیرمجموعه‌های خودتان را می‌توانید ویرایش کنید" };
      }
    }
  } else if (role === "org_user") {
    if (!ministryId) {
      return { success: false, error: "برای کاربر دستگاه انتخاب وزارتخانه/دستگاه الزامی است" };
    }
    if (!isOrgRole(orgRole)) {
      orgRole = "pr";
    }
    if (!parentUserId) {
      parentUserId = null;
    } else {
      const parent = await pgExt.pgGetUserById(parentUserId);
      if (!parent || !isOrgUserRole(parent.role)) {
        // Stale parent must not block admin permission edits.
        parentUserId = null;
      } else {
        ministryId = parent.ministryId ?? ministryId;
        if (!organizationId) {
          organizationId = parent.organizationId ?? null;
        }
      }
    }
  } else {
    // admin / client — ministry is optional categorization
    orgRole = null;
    parentUserId = null;
    ministryId = ministryId ?? null;
  }

  // Authority level is computed automatically from ministry/org placement.
  const authorityLevel = inferDefaultAuthorityLevel({
    role,
    organizationId,
    ministryId,
  });

  let accountManagerName = data.accountManagerName;
  let phone = data.phone;
  if (data.id) {
    const existing = await pgExt.pgGetUserById(data.id);
    // Preserve profile-owned field unless explicitly provided
    if (accountManagerName === undefined) {
      accountManagerName = existing?.accountManagerName ?? null;
    }
    if (phone === undefined) {
      phone = existing?.phone ?? null;
    }
  }

  const result = await pgExt.pgSaveUser({
    ...data,
    role,
    orgRole,
    ministryId,
    organizationId,
    parentUserId,
    authorityLevel,
    authorityOther: null,
    campaignIds,
    campaignPermissions,
    accountManagerName,
    phone,
  });
  if (!result.success) return result;

  try {
    await logAuditForSession(session, {
      category: "admin",
      action: data.id ? "user.update" : "user.create",
      entityType: "user",
      entityId: data.id,
      label: data.name,
      metadata: {
        role,
        orgRole,
        email: data.email,
        ministryId,
        organizationId,
        parentUserId,
        authorityLevel,
      },
    });
    await revalidateExtended();
  } catch (error) {
    console.error("[saveUserAction] post-save side effects failed", error);
  }
  return result;
  } catch (error) {
    console.error("[saveUserAction] failed", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "ذخیره کاربر ناموفق بود",
    };
  }
}

export async function saveUserRegionAction(data: {
  userId: string;
  region: string | null;
}) {
  const session = await getAuthSession();
  if (!session || (!isFullAdmin(session) && !isClientUser(session))) {
    return { success: false, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };

  const result = await pgExt.pgUpdateUserRegion(data.userId, data.region);
  await revalidateExtended();
  return result;
}

export async function saveUserMinistryAction(data: {
  userId: string;
  ministryId: string | null;
  organizationId?: string | null;
}) {
  const session = await getAuthSession();
  if (!session || (!isFullAdmin(session) && !isClientUser(session))) {
    return { success: false, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };

  const result = await pgExt.pgUpdateUserMinistry(
    data.userId,
    data.ministryId,
    data.organizationId
  );
  await revalidateExtended();
  return result;
}

export async function deleteUserAction(id: string) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };

  const isAdmin = isFullAdmin(session);
  const isSubtreeManager = canManageSubtreeUsers(session);
  if (!isAdmin && !isSubtreeManager) {
    return { success: false, error: "Unauthorized" };
  }

  if (isSubtreeManager && !isAdmin) {
    const existing = await pgExt.pgGetUserById(id);
    if (
      !existing ||
      existing.parentUserId !== session.userId ||
      !isOrgUserRole(existing.role)
    ) {
      return { success: false, error: "فقط زیرمجموعه‌های خودتان را می‌توانید حذف کنید" };
    }
  }

  await pgExt.pgDeleteUser(id);
  await logAuditForSession(session, {
    category: "admin",
    action: "user.delete",
    entityType: "user",
    entityId: id,
    label: "حذف کاربر",
  });
  await revalidateExtended();
  return { success: true };
}

export async function deleteUsersAction(ids: string[]) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };
  if (ids.length === 0) return { success: true, deleted: 0 };

  const result = await pgExt.pgDeleteUsers(ids);
  await logAuditForSession(session, {
    category: "admin",
    action: "user.delete",
    entityType: "user",
    label: "حذف گروهی کاربران",
    metadata: { count: ids.length, ids },
  });
  await revalidateExtended();
  return result;
}

/** Replace campaign + section access for many users at once (admin only). */
export async function bulkUpdateUsersAccessAction(input: {
  userIds: string[];
  campaignIds: string[];
  permissions: ContributorPermissions;
}) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };

  const userIds = [...new Set(input.userIds.map((id) => id.trim()).filter(Boolean))];
  if (userIds.length === 0) {
    return { success: false, error: "هیچ کاربری انتخاب نشده است" };
  }

  const users = await Promise.all(userIds.map((id) => pgExt.pgGetUserById(id)));
  const editableIds: string[] = [];
  for (const user of users) {
    if (!user) continue;
    if (
      user.role === "org_user" ||
      user.role === "client" ||
      user.role === "contributor" ||
      user.role === "ministry_parent" ||
      user.role === "sub_user"
    ) {
      editableIds.push(user.id);
    }
  }

  if (editableIds.length === 0) {
    return {
      success: false,
      error: "برای کاربران انتخاب‌شده امکان تنظیم دسترسی پنل وجود ندارد",
    };
  }

  const result = await pgExt.pgBulkUpdateUsersAccess({
    userIds: editableIds,
    campaignIds: input.campaignIds,
    permissions: input.permissions,
  });
  if (!result.success) return result;

  await logAuditForSession(session, {
    category: "admin",
    action: "user.access.bulk_update",
    entityType: "user",
    label: "ویرایش گروهی دسترسی کاربران",
    metadata: {
      count: editableIds.length,
      skipped: userIds.length - editableIds.length,
      campaignIds: input.campaignIds,
    },
  });
  await revalidateExtended();
  return {
    success: true as const,
    updated: result.updated,
    skipped: userIds.length - editableIds.length,
  };
}

export async function getSessionContextAction(campaignId?: string) {
  try {
    const session = await getAuthSession();
    if (!session) return null;

    if (session.type === "db_user" && session.userId) {
      const user = await pgExt.pgGetUserById(session.userId);
      // Missing campaign membership must deny sections — do not fall back to all-true defaults.
      const permissions =
        session.role === "admin" || !campaignId
          ? null
          : (user?.campaignPermissions?.[campaignId] ?? null);

      return {
        ...session,
        email: user?.email,
        name: user?.name,
        orgRole: user?.orgRole ?? null,
        campaignIds: user?.campaignIds ?? [],
        campaignPermissions: user?.campaignPermissions ?? {},
        permissions,
      };
    }

    return {
      ...session,
      email: process.env.ADMIN_EMAIL ?? "admin",
      name: "مدیر سیستم",
      campaignIds: [] as string[],
      campaignPermissions: {} as Record<string, ContributorPermissions>,
      permissions: null,
    };
  } catch (error) {
    console.error("[getSessionContextAction] failed", error);
    return null;
  }
}

export { getOwnerFilter, isFullAdmin };

const SECTION_TO_DAILY_CAP_TABLE: Record<
  string,
  import("@/lib/scoring/daily-cap-and-duplicates").DailyCapTable | null
> = {
  billboards: "billboards",
  posters: "posters",
  videos: "videos",
  files: "campaign_files",
  rawMedia: "raw_media_uploads",
  textContents: "text_contents",
  socialPosts: "social_media_posts",
  sitePublications: "social_media_posts",
  pressPublications: "social_media_posts",
  activities: "campaign_activities",
  broadcast: "broadcast_reports",
  meetings: "campaign_meetings",
  analytics: null,
  socialAnalytics: null,
  submissions: null,
  smsReports: null,
};

const SECTION_TO_CONTENT_TYPE: Record<string, import("@/lib/types").ScoreableContentType | undefined> = {
  billboards: "billboard",
  posters: "poster",
  videos: "video",
  files: "file",
  rawMedia: "raw_media",
  textContents: "text_content",
  sitePublications: "site_publication",
  pressPublications: "social_post",
  socialPosts: "social_post",
  activities: "activity",
  broadcast: "broadcast",
  meetings: "meeting",
};

const SECTION_TO_POSTER_VIDEO: Record<string, "poster" | "video" | undefined> = {
  posters: "poster",
  videos: "video",
};

export async function checkDailyQuotaAction(
  sectionKey: string,
  campaignId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getAuthSession();
  if (!session) return { ok: false, error: "Unauthorized" };

  const table = SECTION_TO_DAILY_CAP_TABLE[sectionKey];
  if (!table) return { ok: true };

  const { assertUserCategoryDailyLimit, assertDailyCapForCreate } = await import(
    "@/lib/scoring/daily-cap-and-duplicates"
  );

  const contentType = SECTION_TO_CONTENT_TYPE[sectionKey];
  const categoryCap = await assertUserCategoryDailyLimit({
    campaignId,
    ownerUserId: session.userId,
    contentType,
  });
  if (!categoryCap.ok) return categoryCap;

  const section = SECTION_TO_POSTER_VIDEO[sectionKey];
  if (section) {
    const sectionCap = await assertDailyCapForCreate({
      campaignId,
      ownerUserId: session.userId,
      section,
    });
    if (!sectionCap.ok) return sectionCap;
  }

  return { ok: true };
}
