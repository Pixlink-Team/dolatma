"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { canManageDirectives, canViewDirectives } from "@/lib/auth/access";
import {
  pgCreateDirectiveBlocker,
  pgListDirectiveBlockers,
} from "@/lib/db/repository-blockers";
import type { DirectiveBlockerCategory } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";
import * as pgExt from "@/lib/db/repository-extended";

async function assertCampaignAccess(campaignId: string) {
  const session = await getAuthSession();
  if (!session || !canViewDirectives(session)) {
    return { session: null, error: "Unauthorized" as const };
  }
  if (isFullAdmin(session)) return { session, error: null };
  if (!session.userId || !isPostgresConfigured()) {
    return { session: null, error: "Unauthorized" as const };
  }
  const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId, campaignId);
  if (!permissions) return { session: null, error: "دسترسی ندارید" as const };
  return { session, error: null };
}

export async function listDirectiveBlockersAction(directiveId: string, campaignId: string) {
  const access = await assertCampaignAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, blockers: [], error: access.error };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, blockers: [], error: "Database required" };
  }
  const blockers = await pgListDirectiveBlockers(directiveId);
  return { success: true as const, blockers };
}

export async function createDirectiveBlockerAction(input: {
  directiveId: string;
  campaignId: string;
  category: DirectiveBlockerCategory;
  note?: string;
}) {
  const access = await assertCampaignAccess(input.campaignId);
  if (access.error || !access.session?.userId) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  // Executors (non-manager) and managers can register blockers; managers rarely need to.
  const result = await pgCreateDirectiveBlocker({
    directiveId: input.directiveId,
    userId: access.session.userId,
    category: input.category,
    note: input.note,
  });
  if (result.success) {
    revalidatePath(`/admin/directives/${input.directiveId}`);
    revalidatePath("/admin/directives");
  }
  return result;
}

export async function canRegisterBlockerAction() {
  const session = await getAuthSession();
  if (!session) return { canRegister: false };
  // Managers can view; executors register. Allow all authenticated panel users.
  return { canRegister: !canManageDirectives(session) || true };
}
