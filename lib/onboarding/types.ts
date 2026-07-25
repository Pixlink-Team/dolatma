export const ONBOARDING_EVALUATORS = [
  "passport",
  "subsidiaries",
  "content",
  "directives",
  "none",
] as const;

export type OnboardingEvaluator = (typeof ONBOARDING_EVALUATORS)[number];

export interface OnboardingStep {
  id: string;
  stepKey: string;
  title: string;
  description: string;
  href: string;
  evaluator: OnboardingEvaluator;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingStepProgress {
  stepKey: string;
  title: string;
  description: string;
  href: string;
  evaluator: OnboardingEvaluator;
  done: boolean;
  detail?: string;
}

export interface OnboardingProgress {
  deviceId: string;
  deviceName: string;
  steps: OnboardingStepProgress[];
  completedCount: number;
  totalCount: number;
  percent: number;
}

export interface OnboardingContentCategoryStatus {
  key: string;
  label: string;
  href: string;
  done: boolean;
  count: number;
}

export function isOnboardingEvaluator(value: unknown): value is OnboardingEvaluator {
  return (
    typeof value === "string" &&
    (ONBOARDING_EVALUATORS as readonly string[]).includes(value)
  );
}
