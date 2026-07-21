"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { canManageDirectives } from "@/lib/auth/access";
import {
  pgListBestPractices,
  pgListHighScoreSuggestions,
  pgSetBestPracticeStatus,
  pgSuggestBestPractice,
} from "@/lib/db/repository-best-practices";
import { BEST_PRACTICE_SCORE_SUGGEST_THRESHOLD } from "@/lib/command-feature-labels";
import type { ScoreableContentType } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";
import * as pgExt from "@/lib/db/repository-extended";

async function assertCampaignMember(campaignId: string) {
  const session = await getAuthSession();
  if (!session) return { session: null, error: "Unauthorized" as const };
  if (isFullAdmin(session)) return { session, error: null };
  if (!session.userId || !isPostgresConfigured()) {
    return { session: null, error: "Unauthorized" as const };
  }
  const permissions = await pgExt.pgGetUserPermissionsForCampaign(session.userId, campaignId);
  if (!permissions) return { session: null, error: "دسترسی ندارید" as const };
  return { session, error: null };
}

export async function listBestPracticesAction(
  campaignId: string,
  status?: "pending" | "approved" | "rejected" | "all"
) {
  const access = await assertCampaignMember(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, items: [], error: access.error };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, items: [], error: "Database required" };
  }
  const items = await pgListBestPractices(campaignId, status ?? "approved");
  return { success: true as const, items, canManage: canManageDirectives(access.session) };
}

export async function listBestPracticeSuggestionsAction(campaignId: string) {
  const access = await assertCampaignMember(campaignId);
  if (access.error || !access.session) {
    return { success: false as const, items: [], highScore: [], error: access.error };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, items: [], highScore: [], error: "دسترسی ندارید" };
  }
  if (!isPostgresConfigured()) {
    return {
      success: false as const,
      items: [],
      highScore: [],
      error: "Database required",
    };
  }
  const [items, highScore] = await Promise.all([
    pgListBestPractices(campaignId, "pending"),
    pgListHighScoreSuggestions(campaignId, BEST_PRACTICE_SCORE_SUGGEST_THRESHOLD),
  ]);
  return { success: true as const, items, highScore };
}

export async function suggestBestPracticeAction(input: {
  campaignId: string;
  contentType: ScoreableContentType;
  contentId: string;
  title: string;
  suggestedScore?: number | null;
}) {
  const access = await assertCampaignMember(input.campaignId);
  if (access.error || !access.session?.userId) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, error: "فقط مدیر یا کارفرما می‌تواند پیشنهاد دهد" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  const result = await pgSuggestBestPractice({
    ...input,
    suggestedBy: access.session.userId,
  });
  if (result.success) {
    revalidatePath("/admin/best-practices");
  }
  return result;
}

export async function setBestPracticeStatusAction(input: {
  id: string;
  campaignId: string;
  status: "approved" | "rejected";
}) {
  const access = await assertCampaignMember(input.campaignId);
  if (access.error || !access.session?.userId) {
    return { success: false as const, error: access.error ?? "Unauthorized" };
  }
  if (!canManageDirectives(access.session)) {
    return { success: false as const, error: "دسترسی ندارید" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  const result = await pgSetBestPracticeStatus({
    id: input.id,
    status: input.status,
    approvedBy: access.session.userId,
  });
  if (result.success) {
    revalidatePath("/admin/best-practices");
  }
  return result;
}
