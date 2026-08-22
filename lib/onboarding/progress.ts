import { getUserHomeDeviceId } from "@/lib/auth/device-access";
import type { CampaignFeatures } from "@/lib/types";
import type { ContributorPermissions } from "@/lib/contributor-permissions";
import { hasContributorPermission } from "@/lib/contributor-permissions";
import {
  ONBOARDING_CONTENT_STEP_HREF,
  resolveRequiredContentCategories,
} from "@/lib/onboarding/content-categories";
import type {
  OnboardingProgress,
  OnboardingStep,
  OnboardingStepProgress,
} from "@/lib/onboarding/types";
import {
  pgCountSubordinateUsersOnChildDevices,
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
 * Subsidiaries: need manageSubtreeUsers (mission is completed by adding a subordinate user).
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

  if (step.evaluator === "subsidiaries") {
    return hasContributorPermission(options.permissions, "manageSubtreeUsers");
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
    path = raw || "/admin/users";
  } else if (input.step.evaluator === "content") {
    path = input.firstMissingContentHref || raw || ONBOARDING_CONTENT_STEP_HREF;
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
    /** When set (org-user dashboard), prefer this over device-level subordinate count. */
    subordinateUsersCount?: number;
    /** Subordinate users attached to child devices (not the root unit). */
    subordinateUsersOnSubsidiariesCount?: number;
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
      // Both are required: a child device node AND at least one subordinate user on it.
      // Pre-built org tree alone (or a user on the root ministry) must not complete the step.
      const userCount =
        typeof options.subordinateUsersOnSubsidiariesCount === "number"
          ? options.subordinateUsersOnSubsidiariesCount
          : facts.subordinateUsersOnSubsidiariesCount;
      const hasSubsidiaryDevice = facts.childrenCount >= 1;
      const hasSubordinateUser = userCount >= 1;
      done = hasSubsidiaryDevice && hasSubordinateUser;
      if (done) {
        detail = `${facts.childrenCount} زیرمجموعه و ${userCount} کاربر ثبت شده`;
      } else {
        const gaps: string[] = [];
        if (!hasSubsidiaryDevice) gaps.push("تعریف زیرمجموعه");
        if (!hasSubordinateUser) gaps.push("افزودن کاربر برای زیرمجموعه");
        detail = `ناقص: ${gaps.join(" و ")}`;
      }
      break;
    }
    case "content": {
      const posterCategory = requiredCategories.find((category) => category.key === "posters");
      if (!posterCategory) {
        done = true;
        detail = "بخش پوستر در این راستا فعال نیست";
        break;
      }
      const posterCount = facts.contentCounts.posters ?? 0;
      done = posterCount >= 1;
      detail = done
        ? `${posterCount} پوستر ثبت شده`
        : "هنوز پوستری در بخش تولید بارگذاری نشده";
      firstMissingContentHref = ONBOARDING_CONTENT_STEP_HREF;
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
    subordinateUsersCount?: number;
    subordinateUsersOnSubsidiariesCount?: number;
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
  const [steps, facts, subordinateIds, subordinateUsersOnSubsidiariesCount] =
    await Promise.all([
    pgListOnboardingSteps({ activeOnly: true }),
    pgGetDeviceOnboardingFacts({
      deviceId: input.deviceId,
      campaignId: input.campaignId,
      ownerUserIds: input.ownerUserIds,
    }),
    // Always scope subsidiaries to the issuer when known (dashboard + per-user audit).
    input.issuerUserId
      ? pgListSubUserIds(input.issuerUserId)
      : Promise.resolve(null as string[] | null),
    pgCountSubordinateUsersOnChildDevices({
      homeDeviceId: input.deviceId,
      issuerUserId: input.issuerUserId,
    }),
  ]);

  if (!facts) return null;

  // Prefer issuer-scoped count; fall back to device-level for all-devices audit.
  const subordinateUsersCount =
    subordinateIds !== null
      ? subordinateIds.length
      : facts.subordinateUsersCount;

  return toProgress(facts, steps, {
    features: input.features,
    permissions: input.permissions,
    ignorePermissions: input.ignorePermissions,
    hasSubordinateUsers:
      subordinateIds === null ? undefined : subordinateIds.length > 0,
    subordinateUsersCount,
    subordinateUsersOnSubsidiariesCount,
    campaignId: input.campaignId,
  });
}

/** Admin/audit view: onboarding for a specific user's home device. */
export async function evaluateUserOnboarding(input: {
  userId: string;
  campaignId: string;
  features: CampaignFeatures;
}): Promise<OnboardingProgress | null> {
  const homeDeviceId = await getUserHomeDeviceId(input.userId);
  if (!homeDeviceId) return null;

  return evaluateDeviceOnboarding({
    deviceId: homeDeviceId,
    campaignId: input.campaignId,
    features: input.features,
    ignorePermissions: true,
    ownerUserIds: [input.userId],
    issuerUserId: input.userId,
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
