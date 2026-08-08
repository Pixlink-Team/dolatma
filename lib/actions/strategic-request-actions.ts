"use server";

import { revalidatePath } from "next/cache";
import {
  canManageDirectivesGlobally,
  canManageDirectives,
} from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgGetUserById, pgGetUserPermissionsForCampaign } from "@/lib/db/repository-extended";
import {
  pgCreateStrategicUpwardRequest,
  pgListStrategicUpwardRequestsByRequester,
  pgListStrategicUpwardRequestsForCampaign,
  pgListStrategicUpwardRequestsForTarget,
  pgGetStrategicUpwardRequestById,
  pgRespondStrategicUpwardRequest,
  pgUpdateStrategicUpwardRequestStatus,
} from "@/lib/db/repository-strategic-requests";
import {
  isStrategicRequestStatus,
  type StrategicRequestStatus,
} from "@/lib/strategic-requests";
import { isReisRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";

function revalidateStrategic(campaignId: string) {
  revalidatePath("/admin/reis/strategic");
  revalidatePath("/admin/directives");
  revalidatePath(`/admin/reis/strategic?campaign=${campaignId}`);
  revalidatePath(`/admin/directives?campaign=${campaignId}`);
}

async function resolveAccess(campaignId: string) {
  const session = await getAuthSession();
  if (!session) return { session: null, permissions: null, error: "Unauthorized" as const };
  if (isFullAdmin(session) || isReisRole(session.role) || session.role === "client") {
    return { session, permissions: null, error: null };
  }
  if (!session.userId || !isPostgresConfigured()) {
    return { session: null, permissions: null, error: "Unauthorized" as const };
  }
  const permissions = await pgGetUserPermissionsForCampaign(session.userId, campaignId);
  if (!permissions) {
    return { session: null, permissions: null, error: "دسترسی ندارید" as const };
  }
  return { session, permissions, error: null };
}

export async function listStrategicUpwardRequestsAction(campaignId: string) {
  const access = await resolveAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, requests: [], error: access.error ?? "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, requests: [], error: "Database required" };
  }

  const session = access.session;
  if (canManageDirectivesGlobally(session) || isReisRole(session.role)) {
    const requests = await pgListStrategicUpwardRequestsForCampaign(campaignId);
    return { success: true as const, requests };
  }

  if (!session.userId) {
    return { success: true as const, requests: [] };
  }

  const [incoming, mine] = await Promise.all([
    pgListStrategicUpwardRequestsForTarget(campaignId, session.userId),
    pgListStrategicUpwardRequestsByRequester(campaignId, session.userId),
  ]);
  const byId = new Map(incoming.concat(mine).map((row) => [row.id, row]));
  return { success: true as const, requests: Array.from(byId.values()) };
}

export async function createStrategicUpwardRequestAction(input: {
  campaignId: string;
  title: string;
  body: string;
}) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) return { success: false as const, error: "عنوان الزامی است" };
  if (!body) return { success: false as const, error: "متن درخواست الزامی است" };

  const access = await resolveAccess(input.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!access.session.userId || !isPostgresConfigured()) {
    return { success: false as const, error: "Unauthorized" };
  }

  // Highest roles don't send upward requests inside this flow.
  if (canManageDirectivesGlobally(access.session)) {
    return {
      success: false as const,
      error: "این بخش برای ارسال درخواست از زیرمجموعه به بالاسری است",
    };
  }

  const user = await pgGetUserById(access.session.userId);
  const targetUserId = user?.parentUserId ?? null;

  const created = await pgCreateStrategicUpwardRequest({
    campaignId: input.campaignId,
    requesterUserId: access.session.userId,
    targetUserId,
    title,
    body,
  });
  revalidateStrategic(input.campaignId);
  return { success: true as const, request: created };
}

export async function respondStrategicUpwardRequestAction(input: {
  id: string;
  responseBody: string;
  status?: StrategicRequestStatus;
}) {
  const responseBody = input.responseBody.trim();
  if (!responseBody) return { success: false as const, error: "متن پاسخ الزامی است" };

  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const existing = await pgGetStrategicUpwardRequestById(input.id);
  if (!existing) return { success: false as const, error: "درخواست یافت نشد" };

  const access = await resolveAccess(existing.campaignId);
  if (access.error || !access.session?.userId) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }

  const canRespond =
    canManageDirectivesGlobally(access.session) ||
    isReisRole(access.session.role) ||
    existing.targetUserId === access.session.userId ||
    canManageDirectives(access.session, access.permissions);

  if (!canRespond) {
    return { success: false as const, error: "دسترسی پاسخ ندارید" };
  }

  const status =
    input.status && isStrategicRequestStatus(input.status) ? input.status : "answered";

  const updated = await pgRespondStrategicUpwardRequest({
    id: input.id,
    status,
    responseBody,
    respondedByUserId: access.session.userId,
  });
  revalidateStrategic(existing.campaignId);
  return { success: true as const, request: updated };
}

export async function updateStrategicUpwardRequestStatusAction(input: {
  id: string;
  status: StrategicRequestStatus;
}) {
  if (!isStrategicRequestStatus(input.status)) {
    return { success: false as const, error: "وضعیت نامعتبر است" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const existing = await pgGetStrategicUpwardRequestById(input.id);
  if (!existing) return { success: false as const, error: "درخواست یافت نشد" };

  const access = await resolveAccess(existing.campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }

  const canUpdate =
    canManageDirectivesGlobally(access.session) ||
    isReisRole(access.session.role) ||
    existing.targetUserId === access.session.userId;

  if (!canUpdate) {
    return { success: false as const, error: "دسترسی ندارید" };
  }

  const updated = await pgUpdateStrategicUpwardRequestStatus({
    id: input.id,
    status: input.status,
  });
  revalidateStrategic(existing.campaignId);
  return { success: true as const, request: updated };
}
