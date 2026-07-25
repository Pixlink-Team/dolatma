"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgCreateOnboardingStep,
  pgDeleteOnboardingStep,
  pgListOnboardingSteps,
  pgUpdateOnboardingStep,
} from "@/lib/db/repository-onboarding";
import {
  isOnboardingEvaluator,
  type OnboardingEvaluator,
  type OnboardingStep,
} from "@/lib/onboarding/types";
import { isPostgresConfigured } from "@/lib/utils";

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
