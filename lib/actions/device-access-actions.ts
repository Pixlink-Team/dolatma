"use server";

import { revalidatePath } from "next/cache";
import {
  canAccessDevicesPage,
  canViewDevice,
  getSessionHomeDeviceId,
  isDeviceTreeScopedRole,
} from "@/lib/auth/device-access";
import { canManageSubtreeUsers, isClientUser } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  defaultContributorPermissions,
  intersectContributorPermissions,
  limitCampaignPermissionsToGrantor,
  normalizeContributorPermissions,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import {
  pgClearDeviceCampaignAccess,
  pgGetDevicePermissionsForCampaign,
  pgGetDeviceSubtreeAccess,
  pgGetEffectiveDeviceCeiling,
  pgGetParentDeviceCeiling,
  pgPushCampaignAccessToSubtreeUsers,
  pgSaveDeviceCampaignAccess,
  type DeviceSubtreeAccessNode,
} from "@/lib/db/repository-device-access";
import { pgGetUserById } from "@/lib/db/repository-extended";
import { isOrgUserRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";

function canManageDeviceAccess(session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>) {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  if (isOrgUserRole(session.role) && canManageSubtreeUsers(session)) return true;
  return false;
}

async function assertDeviceInScope(
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>,
  deviceId: string
): Promise<true | string> {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  if (!isDeviceTreeScopedRole(session)) return "Unauthorized";
  const allowed = await canViewDevice(session, deviceId);
  if (!allowed) return "فقط دستگاه‌های زیرشاخه خودتان";
  return true;
}

async function revalidateAccessPaths(deviceId: string) {
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/devices");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/devices/${deviceId}`);
}

export async function getDeviceAccessAction(deviceId: string, campaignId: string) {
  const session = await getAuthSession();
  if (!session || !canAccessDevicesPage(session) || !canManageDeviceAccess(session)) {
    return {
      success: false as const,
      error: "Unauthorized",
      permissions: null,
      parentCeiling: null,
      hasOwnRow: false,
    };
  }
  if (!isPostgresConfigured()) {
    return {
      success: false as const,
      error: "Database required",
      permissions: null,
      parentCeiling: null,
      hasOwnRow: false,
    };
  }

  if (!isFullAdmin(session) && isDeviceTreeScopedRole(session)) {
    const scope = await assertDeviceInScope(session, deviceId);
    if (scope !== true) {
      return {
        success: false as const,
        error: scope,
        permissions: null,
        parentCeiling: null,
        hasOwnRow: false,
      };
    }
  }

  const [own, parentCeiling, effective] = await Promise.all([
    pgGetDevicePermissionsForCampaign(deviceId, campaignId),
    pgGetParentDeviceCeiling(deviceId, campaignId),
    pgGetEffectiveDeviceCeiling(deviceId, campaignId),
  ]);

  // UI starts from own row, else inherited ceiling, else defaults.
  const permissions =
    own ??
    effective ??
    parentCeiling ??
    defaultContributorPermissions();

  return {
    success: true as const,
    permissions,
    parentCeiling,
    hasOwnRow: Boolean(own),
  };
}

/** Access ceilings for a device and all descendants (full tree edit). */
export async function getDeviceSubtreeAccessAction(
  deviceId: string,
  campaignId: string
) {
  const session = await getAuthSession();
  if (!session || !canAccessDevicesPage(session) || !canManageDeviceAccess(session)) {
    return {
      success: false as const,
      error: "Unauthorized",
      nodes: [] as DeviceSubtreeAccessNode[],
    };
  }
  if (!isPostgresConfigured()) {
    return {
      success: false as const,
      error: "Database required",
      nodes: [] as DeviceSubtreeAccessNode[],
    };
  }

  if (!isFullAdmin(session) && isDeviceTreeScopedRole(session)) {
    const scope = await assertDeviceInScope(session, deviceId);
    if (scope !== true) {
      return {
        success: false as const,
        error: scope,
        nodes: [] as DeviceSubtreeAccessNode[],
      };
    }
  }

  const nodes = await pgGetDeviceSubtreeAccess(deviceId, campaignId);
  return { success: true as const, nodes };
}

/**
 * Save access for many devices in parent→child order.
 * Each node is written explicitly so deep levels can differ from the root ceiling.
 */
export async function saveDeviceSubtreeAccessAction(data: {
  campaignId: string;
  nodes: Array<{ deviceId: string; permissions: ContributorPermissions }>;
}) {
  const session = await getAuthSession();
  if (!session || !canManageDeviceAccess(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  if (!data.nodes.length) {
    return { success: false as const, error: "هیچ دستگاهی برای ذخیره ارسال نشده است" };
  }

  let actorPermissions: Record<string, ContributorPermissions> | null = null;
  let homeCeiling: ContributorPermissions | null = null;
  if (!isFullAdmin(session) && !isClientUser(session) && session.userId) {
    const actor = await pgGetUserById(session.userId);
    actorPermissions = actor?.campaignPermissions ?? null;
    const homeId = await getSessionHomeDeviceId(session);
    if (homeId) {
      homeCeiling = await pgGetEffectiveDeviceCeiling(homeId, data.campaignId);
    }
  }

  let savedDevices = 0;

  for (const node of data.nodes) {
    if (!isFullAdmin(session) && isDeviceTreeScopedRole(session)) {
      const scope = await assertDeviceInScope(session, node.deviceId);
      if (scope !== true) {
        return { success: false as const, error: scope };
      }
    }

    let permissions = normalizeContributorPermissions(node.permissions);
    if (actorPermissions) {
      const limited = limitCampaignPermissionsToGrantor(
        { [data.campaignId]: permissions },
        actorPermissions,
        [data.campaignId]
      );
      permissions = limited[data.campaignId] ?? permissions;
    }
    if (homeCeiling) {
      permissions = intersectContributorPermissions(permissions, homeCeiling);
    }

    // Write each device ceiling first; users are pushed once after the full tree is saved.
    const result = await pgSaveDeviceCampaignAccess({
      deviceId: node.deviceId,
      campaignId: data.campaignId,
      permissions,
      applyToSubtree: false,
    });
    if (!result.success) return result;
    savedDevices += 1;
  }

  const rootId = data.nodes[0]?.deviceId;
  const clampedUsers = rootId
    ? await pgPushCampaignAccessToSubtreeUsers(rootId, data.campaignId)
    : 0;

  if (rootId) await revalidateAccessPaths(rootId);

  return {
    success: true as const,
    savedDevices,
    clampedUsers,
  };
}

/** Ceiling for a home device — used when editing a user's permissions. */
export async function getDeviceCeilingAction(deviceId: string, campaignId: string) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false as const, error: "Unauthorized", ceiling: null };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required", ceiling: null };
  }
  if (!canManageDeviceAccess(session) && !canAccessDevicesPage(session)) {
    return { success: false as const, error: "Unauthorized", ceiling: null };
  }

  const ceiling = await pgGetEffectiveDeviceCeiling(deviceId, campaignId);
  return { success: true as const, ceiling };
}

export async function saveDeviceAccessAction(data: {
  deviceId: string;
  campaignId: string;
  permissions: ContributorPermissions;
  applyToSubtree?: boolean;
}) {
  const session = await getAuthSession();
  if (!session || !canManageDeviceAccess(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  if (!isFullAdmin(session) && isDeviceTreeScopedRole(session)) {
    const scope = await assertDeviceInScope(session, data.deviceId);
    if (scope !== true) {
      return { success: false as const, error: scope };
    }
  }

  let permissions = normalizeContributorPermissions(data.permissions);

  // Org managers cannot grant more than they themselves have.
  if (!isFullAdmin(session) && !isClientUser(session) && session.userId) {
    const actor = await pgGetUserById(session.userId);
    if (actor) {
      const limited = limitCampaignPermissionsToGrantor(
        { [data.campaignId]: permissions },
        actor.campaignPermissions,
        [data.campaignId]
      );
      permissions = limited[data.campaignId] ?? permissions;
    }
    // Also cannot exceed own home device ceiling.
    const homeId = await getSessionHomeDeviceId(session);
    if (homeId) {
      const homeCeiling = await pgGetEffectiveDeviceCeiling(homeId, data.campaignId);
      if (homeCeiling) {
        permissions = intersectContributorPermissions(permissions, homeCeiling);
      }
    }
  }

  const result = await pgSaveDeviceCampaignAccess({
    deviceId: data.deviceId,
    campaignId: data.campaignId,
    permissions,
    applyToSubtree: data.applyToSubtree !== false,
  });

  if (!result.success) return result;

  await revalidateAccessPaths(data.deviceId);
  return result;
}

export async function clearDeviceAccessAction(deviceId: string, campaignId: string) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "فقط مدیر سیستم می‌تواند سقف دسترسی دستگاه را حذف کند" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const result = await pgClearDeviceCampaignAccess(deviceId, campaignId);
  if (!result.success) return result;
  await revalidateAccessPaths(deviceId);
  return result;
}
