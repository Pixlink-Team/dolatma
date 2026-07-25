import type { CampaignFeatures } from "@/lib/types";
import type { ContributorPermissions } from "@/lib/contributor-permissions";
import { hasContributorPermission } from "@/lib/contributor-permissions";
import { resolveRequiredContentCategories } from "@/lib/onboarding/content-categories";
import type {
  OnboardingProgress,
  OnboardingStep,
  OnboardingStepProgress,
} from "@/lib/onboarding/types";
import {
  pgGetDeviceOnboardingFacts,
  pgListDevicesWithUsersForOnboarding,
  pgListOnboardingSteps,
  type DeviceOnboardingFacts,
} from "@/lib/db/repository-onboarding";
import { pgListSubUserIds } from "@/lib/db/repository-ministries";
import { adminHref } from "@/lib/utils";

type StepVisibilityOptions = {
  permissions?: ContributorPermissions | null;
  ignorePermissions?: boolean;
  /** Direct subordinate org users under the current issuer (parent_user_id). */
  hasSubordinateUsers?: boolean;
};

/**
 * Steps that require a specific permission / context to appear for the current user.
 * Directives: need manageSubtreeDirectives AND at least one subordinate to assign to.
 */
function isStepVisibleForPermissions(
  step: OnboardingStep,
  options: StepVisibilityOptions
): boolean {
  if (options.ignorePermissions) return true;

  if (step.evaluator === "directives") {
    const canManage = hasContributorPermission(
      options.permissions,
      "manageSubtreeDirectives"
    );
    if (!canManage) return false;
    // No one to issue to — hide the step even when the permission is granted.
    if (options.hasSubordinateUsers === false) return false;
    return true;
  }

  return true;
}

function buildStepHref(input: {
  step: OnboardingStep;
  deviceId: string;
  campaignId: string;
  firstMissingContentHref?: string | null;
}): string {
  const raw = input.step.href?.trim() || "";
  let path = raw;

  if (input.step.evaluator === "passport") {
    path = `/admin/devices/${input.deviceId}`;
  } else if (input.step.evaluator === "subsidiaries") {
    path = raw || "/admin/ministries";
  } else if (input.step.evaluator === "content") {
    path = input.firstMissingContentHref || raw || "/admin";
  } else if (input.step.evaluator === "directives") {
    path = raw || "/admin/directives";
  } else if (!path) {
    path = "/admin";
  }

  if (path.includes("{deviceId}")) {
    path = path.replaceAll("{deviceId}", input.deviceId);
  }

  return adminHref(path, input.campaignId);
}

function evaluateStep(
  step: OnboardingStep,
  facts: DeviceOnboardingFacts,
  options: {
    features: CampaignFeatures;
    permissions?: ContributorPermissions | null;
    ignorePermissions?: boolean;
    campaignId: string;
  }
): OnboardingStepProgress {
  const requiredCategories = resolveRequiredContentCategories({
    features: options.features,
    permissions: options.permissions,
    ignorePermissions: options.ignorePermissions,
  });

  let done = false;
  let detail: string | undefined;
  let firstMissingContentHref: string | null = null;

  switch (step.evaluator) {
    case "passport": {
      const gaps: string[] = [];
      if (!facts.profileComplete) gaps.push("پروفایل");
      if (!facts.hasPrimaryOfficial) gaps.push("مدیر");
      if (!facts.hasStaff) gaps.push("کارکنان");
      if (!facts.hasCapacity) gaps.push("ظرفیت");
      done = gaps.length === 0;
      detail = done
        ? "شناسنامه کامل است"
        : `ناقص: ${gaps.join("، ")}`;
      break;
    }
    case "subsidiaries": {
      done = facts.childrenCount >= 1;
      detail = done
        ? `${facts.childrenCount} زیرمجموعه ثبت شده`
        : "هنوز زیرمجموعه‌ای ثبت نشده";
      break;
    }
    case "content": {
      if (requiredCategories.length === 0) {
        done = true;
        detail = "دسته فعالی برای محتوا تعریف نشده";
        break;
      }
      const missing = requiredCategories.filter(
        (category) => (facts.contentCounts[category.key] ?? 0) < 1
      );
      done = missing.length === 0;
      const filled = requiredCategories.length - missing.length;
      detail = done
        ? `همه ${requiredCategories.length} دسته تکمیل شده`
        : `${filled} از ${requiredCategories.length} دسته — باقی‌مانده: ${missing
            .map((item) => item.label)
            .join("، ")}`;
      firstMissingContentHref = missing[0]?.href ?? null;
      break;
    }
    case "directives": {
      done = facts.directivesIssued >= 1;
      detail = done
        ? `${facts.directivesIssued} دستورکار صادر شده`
        : "هنوز دستورکاری صادر نشده";
      break;
    }
    case "none":
    default: {
      done = false;
      detail = "این مرحله هنوز ارزیابی خودکار ندارد";
      break;
    }
  }

  return {
    stepKey: step.stepKey,
    title: step.title,
    description: step.description,
    href: buildStepHref({
      step,
      deviceId: facts.deviceId,
      campaignId: options.campaignId,
      firstMissingContentHref,
    }),
    evaluator: step.evaluator,
    done,
    detail,
  };
}

function toProgress(
  facts: DeviceOnboardingFacts,
  steps: OnboardingStep[],
  options: {
    features: CampaignFeatures;
    permissions?: ContributorPermissions | null;
    ignorePermissions?: boolean;
    hasSubordinateUsers?: boolean;
    campaignId: string;
  }
): OnboardingProgress {
  const visibleSteps = steps.filter((step) =>
    isStepVisibleForPermissions(step, options)
  );
  const evaluated = visibleSteps.map((step) => evaluateStep(step, facts, options));
  const completedCount = evaluated.filter((step) => step.done).length;
  const totalCount = evaluated.length;
  const percent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return {
    deviceId: facts.deviceId,
    deviceName: facts.deviceName,
    steps: evaluated,
    completedCount,
    totalCount,
    percent,
  };
}

export async function evaluateDeviceOnboarding(input: {
  deviceId: string;
  campaignId: string;
  features: CampaignFeatures;
  permissions?: ContributorPermissions | null;
  ignorePermissions?: boolean;
  ownerUserIds?: string[];
  /** Current user — used to hide directives when they have no subordinates. */
  issuerUserId?: string | null;
}): Promise<OnboardingProgress | null> {
  const [steps, facts, subordinateIds] = await Promise.all([
    pgListOnboardingSteps({ activeOnly: true }),
    pgGetDeviceOnboardingFacts({
      deviceId: input.deviceId,
      campaignId: input.campaignId,
      ownerUserIds: input.ownerUserIds,
    }),
    input.issuerUserId && !input.ignorePermissions
      ? pgListSubUserIds(input.issuerUserId)
      : Promise.resolve(null as string[] | null),
  ]);

  if (!facts) return null;
  return toProgress(facts, steps, {
    features: input.features,
    permissions: input.permissions,
    ignorePermissions: input.ignorePermissions,
    hasSubordinateUsers:
      subordinateIds === null ? undefined : subordinateIds.length > 0,
    campaignId: input.campaignId,
  });
}

export async function evaluateAllDevicesOnboarding(input: {
  campaignId: string;
  features: CampaignFeatures;
}): Promise<OnboardingProgress[]> {
  const [steps, devices] = await Promise.all([
    pgListOnboardingSteps({ activeOnly: true }),
    pgListDevicesWithUsersForOnboarding(),
  ]);

  const results: OnboardingProgress[] = [];
  const chunkSize = 8;
  for (let i = 0; i < devices.length; i += chunkSize) {
    const chunk = devices.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (device) => {
        const facts = await pgGetDeviceOnboardingFacts({
          deviceId: device.id,
          campaignId: input.campaignId,
        });
        if (!facts) return null;
        return toProgress(facts, steps, {
          features: input.features,
          ignorePermissions: true,
          campaignId: input.campaignId,
        });
      })
    );
    for (const item of chunkResults) {
      if (item) results.push(item);
    }
  }

  return results.sort((a, b) => {
    if (a.percent !== b.percent) return a.percent - b.percent;
    return a.deviceName.localeCompare(b.deviceName, "fa");
  });
}
