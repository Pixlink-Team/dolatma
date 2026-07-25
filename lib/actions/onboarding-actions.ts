"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgGetAllCampaigns } from "@/lib/db/repository";
import {
  pgCreateOnboardingStep,
  pgDeleteOnboardingStep,
  pgListOnboardingSteps,
  pgUpdateOnboardingStep,
} from "@/lib/db/repository-onboarding";
import { evaluateUserOnboarding } from "@/lib/onboarding/progress";
import {
  isOnboardingEvaluator,
  type OnboardingEvaluator,
  type OnboardingProgress,
  type OnboardingStep,
} from "@/lib/onboarding/types";
import { isPostgresConfigured } from "@/lib/utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireAdmin() {
  return getAuthSession().then((session) => {
    if (!session || !isFullAdmin(session)) {
      return { ok: false as const, error: "دسترسی مجاز نیست" };
    }
    if (!isPostgresConfigured()) {
      return { ok: false as const, error: "پایگاه داده پیکربندی نشده است" };
    }
    return { ok: true as const };
  });
}

export async function listOnboardingStepsAction(): Promise<
  { success: true; steps: OnboardingStep[] } | { success: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  const steps = await pgListOnboardingSteps();
  return { success: true, steps };
}

/** Onboarding checklist for one user (used in رصد کاربران profile dialog). */
export async function getUserOnboardingProgressAction(
  userId: string
): Promise<
  | {
      success: true;
      progress: OnboardingProgress | null;
      campaignTitle: string | null;
    }
  | { success: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const trimmed = userId?.trim() || "";
  if (!trimmed || !UUID_RE.test(trimmed)) {
    return { success: false, error: "شناسه کاربر نامعتبر است" };
  }

  try {
    const campaigns = await pgGetAllCampaigns();
    const campaign =
      campaigns.find((item) => item.published && item.status === "live") ??
      campaigns.find((item) => item.published) ??
      campaigns[0] ??
      null;
    if (!campaign) {
      return { success: true, progress: null, campaignTitle: null };
    }

    const progress = await evaluateUserOnboarding({
      userId: trimmed,
      campaignId: campaign.id,
      features: campaign.features,
    });
    return {
      success: true,
      progress,
      campaignTitle: campaign.title,
    };
  } catch (error) {
    console.error("getUserOnboardingProgressAction failed:", error);
    return { success: false, error: "بارگذاری پیشرفت راه‌اندازی ناموفق بود" };
  }
}

export async function createOnboardingStepAction(input: {
  stepKey: string;
  title: string;
  description?: string;
  href?: string;
  evaluator: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<
  { success: true; step: OnboardingStep } | { success: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!isOnboardingEvaluator(input.evaluator)) {
    return { success: false, error: "نوع ارزیابی نامعتبر است" };
  }
  const result = await pgCreateOnboardingStep({
    ...input,
    evaluator: input.evaluator as OnboardingEvaluator,
  });
  if (result.success) {
    revalidatePath("/admin/onboarding-steps");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");
  }
  return result;
}

export async function updateOnboardingStepAction(input: {
  id: string;
  title?: string;
  description?: string;
  href?: string;
  evaluator?: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<
  { success: true; step: OnboardingStep } | { success: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (input.evaluator !== undefined && !isOnboardingEvaluator(input.evaluator)) {
    return { success: false, error: "نوع ارزیابی نامعتبر است" };
  }
  const result = await pgUpdateOnboardingStep({
    ...input,
    evaluator: input.evaluator as OnboardingEvaluator | undefined,
  });
  if (result.success) {
    revalidatePath("/admin/onboarding-steps");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");
  }
  return result;
}

export async function deleteOnboardingStepAction(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  const result = await pgDeleteOnboardingStep(id);
  if (result.success) {
    revalidatePath("/admin/onboarding-steps");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");
  }
  return result;
}
