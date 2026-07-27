"use server";

import { revalidatePath } from "next/cache";
import { canManageScoringRules, canScoreContent } from "@/lib/auth/access";
import { getAuthSession } from "@/lib/auth/get-session";
import { logAuditForSession } from "@/lib/audit/log-event";
import {
  recalculateCampaignScores,
  saveCampaignScoringRules,
  setManualScore,
} from "@/lib/scoring/persist-content-score";
import { normalizeScoringRules } from "@/lib/scoring/normalize-scoring-rules";
import type { CampaignScoringRules, ScoreableContentType } from "@/lib/types";

async function resolveScorePermissions(campaignId: string) {
  const session = await getAuthSession();
  let permissions = null;
  if (session?.userId && session.role === "org_user") {
    const { pgGetUserById } = await import("@/lib/db/repository-extended");
    const user = await pgGetUserById(session.userId);
    permissions = user?.campaignPermissions[campaignId] ?? null;
  }
  return { session, permissions };
}

export async function saveContentScoreAction(input: {
  campaignId: string;
  contentType: ScoreableContentType;
  contentId: string;
  score: number | null;
}): Promise<{
  success: boolean;
  autoScore?: number;
  manualScore?: number;
  score?: number;
  error?: string;
}> {
  const { session, permissions } = await resolveScorePermissions(input.campaignId);
  if (!session || !canScoreContent(session, permissions)) {
    return { success: false, error: "دسترسی امتیازدهی ندارید" };
  }

  const result = await setManualScore({
    campaignId: input.campaignId,
    contentType: input.contentType,
    contentId: input.contentId,
    manualScore: input.score,
  });
  if (!result.success) return result;

  await logAuditForSession(session, {
    category: "content",
    action: "content.score",
    entityType: input.contentType,
    entityId: input.contentId,
    campaignId: input.campaignId,
    label: `امتیازدهی (${result.score ?? "حذف امتیاز"})`,
    metadata: { autoScore: result.autoScore, manualScore: result.manualScore, score: result.score },
  });

  revalidatePath(`/admin`);
  revalidatePath(`/campaign`);
  return result;
}

/** Admin + client only: manage automatic scoring rules for a campaign. */
export async function saveScoringRulesAction(input: {
  campaignId: string;
  scoringRules: CampaignScoringRules;
  /** Recalculate all content scores with the new rules (resets manual bonuses). */
  recalculate?: boolean;
}): Promise<{ success: boolean; updated?: number; error?: string }> {
  const session = await getAuthSession();
  if (!session || !canManageScoringRules(session)) {
    return { success: false, error: "دسترسی مدیریت قوانین امتیازدهی ندارید" };
  }

  const normalized = normalizeScoringRules(input.scoringRules);
  const saveResult = await saveCampaignScoringRules(input.campaignId, normalized);
  if (!saveResult.success) return saveResult;

  let updated = 0;
  if (input.recalculate) {
    const recalcResult = await recalculateCampaignScores({
      campaignId: input.campaignId,
      scoringRules: normalized,
      resetManual: true,
    });
    if (!recalcResult.success) return recalcResult;
    updated = recalcResult.updated;
  }

  await logAuditForSession(session, {
    category: "content",
    action: "scoring_rules.save",
    entityType: "campaign",
    entityId: input.campaignId,
    campaignId: input.campaignId,
    label: "بروزرسانی قوانین امتیازدهی خودکار",
  });

  revalidatePath(`/admin`);
  revalidatePath(`/admin/scoring`);
  revalidatePath(`/campaign`);
  return { success: true, updated };
}
