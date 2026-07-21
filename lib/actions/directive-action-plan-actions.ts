"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { canManageDirectives } from "@/lib/auth/access";
import * as pgExt from "@/lib/db/repository-extended";
import * as pgActionPlans from "@/lib/db/repository-action-plans";
import * as pgDirectives from "@/lib/db/repository-directives";
import type { DirectiveActionPlan, DirectiveActionPlanInput } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

async function assertDirectivesAccess(campaignId: string) {
  const session = await getAuthSession();
  if (!session) return { session: null, error: "Unauthorized" as const };

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

function revalidateActionPlanPaths(campaignId: string, directiveId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/directives");
  revalidatePath(`/admin?campaign=${campaignId}`);
  revalidatePath(`/admin/directives?campaign=${campaignId}`);
  if (directiveId) {
    revalidatePath(`/admin/directives/${directiveId}`);
    revalidatePath(`/admin/directives/${directiveId}?campaign=${campaignId}`);
  }
  revalidatePath("/admin/devices");
}

export async function getMyDirectiveActionPlanAction(
  directiveId: string,
  campaignId: string
): Promise<{
  success: boolean;
  plan: DirectiveActionPlan | null;
  capacities: Array<{ id: string; title: string; capacityType: string }>;
  error?: string;
}> {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session) {
    return {
      success: false,
      plan: null,
      capacities: [],
      error: access.error ?? "Unauthorized",
    };
  }
  if (!access.session.userId) {
    return {
      success: false,
      plan: null,
      capacities: [],
      error: "برای ثبت برنامه اقدام باید با حساب کاربری وارد شوید",
    };
  }
  if (!isPostgresConfigured()) {
    return { success: false, plan: null, capacities: [], error: "Database required" };
  }

  const [plan, capacities] = await Promise.all([
    pgActionPlans.pgGetActionPlanForUser(directiveId, access.session.userId),
    pgActionPlans.pgGetDeviceCapacitiesForUser(access.session.userId),
  ]);

  return { success: true, plan, capacities };
}

export async function submitDirectiveActionPlanAction(
  directiveId: string,
  campaignId: string,
  data: DirectiveActionPlanInput
) {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!access.session.userId) {
    return {
      success: false as const,
      error: "برای ثبت برنامه اقدام باید با حساب کاربری وارد شوید",
    };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const result = await pgActionPlans.pgUpsertActionPlan({
    directiveId,
    userId: access.session.userId,
    data,
  });

  if (!result.success) {
    return { success: false as const, error: result.error };
  }

  revalidateActionPlanPaths(campaignId, directiveId);
  return { success: true as const, plan: result.plan };
}

export async function getDirectiveActionPlanByIdAction(
  planId: string,
  campaignId: string
): Promise<{
  success: boolean;
  plan: DirectiveActionPlan | null;
  error?: string;
}> {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false, plan: null, error: access.error ?? "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { success: false, plan: null, error: "Database required" };
  }

  const plan = await pgActionPlans.pgGetActionPlanById(planId);
  if (!plan) {
    return { success: false, plan: null, error: "برنامه اقدام یافت نشد" };
  }

  const isOwner = access.session.userId === plan.userId;
  const canManage = canManageDirectives(access.session);
  if (!isOwner && !canManage) {
    return { success: false, plan: null, error: "دسترسی ندارید" };
  }

  if (canManage && !isOwner) {
    const directive = await pgDirectives.pgGetDirectiveById(plan.directiveId);
    if (!directive || directive.campaignId !== campaignId) {
      return { success: false, plan: null, error: "برنامه اقدام یافت نشد" };
    }
  }

  return { success: true, plan };
}

export async function listDirectiveActionPlansAction(
  directiveId: string,
  campaignId: string
): Promise<{
  success: boolean;
  plans: DirectiveActionPlan[];
  error?: string;
}> {
  const access = await assertDirectivesAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false, plans: [], error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false, plans: [], error: "فقط مدیر می‌تواند تعهدها را ببیند" };
  }
  if (!isPostgresConfigured()) {
    return { success: false, plans: [], error: "Database required" };
  }

  const plans = await pgActionPlans.pgListActionPlansForDirective(directiveId);
  return { success: true, plans };
}
