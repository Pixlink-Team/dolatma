import { canManageSubtreeUsers, canManageSubtreeDevices, isClientUser } from "@/lib/auth/access";
import { isFullAdmin } from "@/lib/auth/get-session";
import {
  hasContributorPermission,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import { pgGetUserById } from "@/lib/db/repository-extended";
import {
  pgGetDeviceById,
  pgIsDeviceInSubtree,
  pgListDevices,
  pgListDeviceSubtree,
} from "@/lib/db/repository-devices";
import { pgListDescendantUserIds } from "@/lib/db/repository-ministries";
import { isDeviceScopedPanelRole, isOrgUserRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";
import type { AdminUser, AuthSession, Device } from "@/lib/types";

/** Roles that manage their own org subtree (not the full catalog). */
export function isDeviceTreeScopedRole(session: AuthSession): boolean {
  return isDeviceScopedPanelRole(session.role);
}

/** Device active/inactive/suspended status — admin and کارفرما only. */
export function canManageDeviceStatus(session: AuthSession): boolean {
  return isFullAdmin(session) || isClientUser(session);
}

/**
 * View passport / home device (profile link). Org users can open their subtree
 * devices even without manageSubtreeDevices.
 */
export function canAccessDevicesPage(session: AuthSession): boolean {
  return isFullAdmin(session) || isClientUser(session) || isDeviceTreeScopedRole(session);
}

/**
 * Devices tree nav + /admin/ministries management page.
 * Requires manageSubtreeDevices for org users (matches sidebar).
 */
export function canAccessDevicesTree(session: AuthSession): boolean {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  if (!isDeviceTreeScopedRole(session)) return false;
  return canManageSubtreeDevices(session);
}

/** Resolve the device node a user is attached to (home of their subtree). */
export async function getUserHomeDeviceId(
  userId: string | null | undefined
): Promise<string | null> {
  const id = userId?.trim() || "";
  if (!id || !isPostgresConfigured()) return null;
  const user = await pgGetUserById(id);
  if (!user) return null;

  // Canonical attachment: org node wins over ministry root.
  const canonical =
    user.organizationId?.trim() || user.ministryId?.trim() || null;
  const storedDeviceId = user.deviceId?.trim() || null;

  // Trust device_id only when it matches the org/ministry attachment (or when
  // those fields are empty). A stale device_id must not steal home resolution.
  if (storedDeviceId && (!canonical || storedDeviceId === canonical)) {
    const device = await pgGetDeviceById(storedDeviceId);
    if (device) return storedDeviceId;
  }

  if (canonical) {
    const device = await pgGetDeviceById(canonical);
    if (device) return canonical;
    // Keep canonical even if the row is temporarily missing so subtree checks
    // still resolve to the intended node after migration/repair.
    return canonical;
  }

  if (storedDeviceId) {
    const device = await pgGetDeviceById(storedDeviceId);
    if (device) return storedDeviceId;
  }

  return null;
}

/** Resolve the device node this session user is attached to. */
export async function getSessionHomeDeviceId(
  session: AuthSession
): Promise<string | null> {
  return getUserHomeDeviceId(session.userId);
}

export async function listAccessibleDevices(
  session: AuthSession
): Promise<Device[]> {
  if (!isPostgresConfigured()) return [];
  if (isFullAdmin(session) || isClientUser(session)) return pgListDevices();
  if (!isDeviceTreeScopedRole(session)) return [];
  const homeId = await getSessionHomeDeviceId(session);
  if (!homeId) return [];
  return pgListDeviceSubtree(homeId);
}

function canMutateDevicesFromPermissions(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (isFullAdmin(session)) return true;
  if (!isOrgUserRole(session.role)) return false;
  if (permissions) {
    return hasContributorPermission(permissions, "manageSubtreeDevices");
  }
  if (typeof session.manageSubtreeDevices === "boolean") {
    return session.manageSubtreeDevices;
  }
  return canManageSubtreeUsers(session);
}

/**
 * View passport / device details for any node in the caller's subtree
 * (including org users without manageSubtreeDevices — e.g. via profile).
 */
export async function canViewDevice(
  session: AuthSession,
  deviceId: string
): Promise<boolean> {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  if (!isDeviceTreeScopedRole(session)) return false;
  const homeId = await getSessionHomeDeviceId(session);
  if (!homeId) return false;
  return pgIsDeviceInSubtree(deviceId, homeId);
}

/**
 * Only the user attached to this device (home) may complete its passport.
 * Upstream managers can view via canViewDevice but not edit.
 */
export async function canEditDevicePassport(
  session: AuthSession,
  deviceId: string
): Promise<boolean> {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  if (!isDeviceTreeScopedRole(session)) return false;
  const homeId = await getSessionHomeDeviceId(session);
  if (!homeId) return false;
  return homeId === deviceId;
}

/** Whether the session may mutate this device (tree edit/delete) or use it as a parent. */
export async function canMutateDevice(
  session: AuthSession,
  deviceId: string,
  permissions?: ContributorPermissions | null
): Promise<boolean> {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  if (!isDeviceTreeScopedRole(session)) return false;
  if (!canMutateDevicesFromPermissions(session, permissions)) return false;
  const homeId = await getSessionHomeDeviceId(session);
  if (!homeId) return false;
  return pgIsDeviceInSubtree(deviceId, homeId);
}

/**
 * Scoped users may create children under any node in their subtree.
 * They may not create root devices (parentId null).
 */
export async function canCreateDeviceUnder(
  session: AuthSession,
  parentId: string | null | undefined,
  permissions?: ContributorPermissions | null
): Promise<boolean> {
  if (isFullAdmin(session)) return true;
  // کارفرما may create under existing parents, not new root ministries.
  if (isClientUser(session)) return Boolean(parentId);
  if (!isDeviceTreeScopedRole(session)) return false;
  if (!parentId) return false;
  return canMutateDevice(session, parentId, permissions);
}

/**
 * Hide peer-level users: org users only see themselves and parent_user_id descendants.
 * Admin and client retain full visibility.
 */
export async function filterUsersVisibleToSession(
  session: AuthSession,
  users: AdminUser[]
): Promise<AdminUser[]> {
  if (isFullAdmin(session) || isClientUser(session)) return users;
  if (!session.userId || !isOrgUserRole(session.role)) return [];
  if (!isPostgresConfigured()) return users.filter((user) => user.id === session.userId);

  const descendantIds = await pgListDescendantUserIds(session.userId);
  const allowed = new Set([session.userId, ...descendantIds]);
  return users.filter((user) => allowed.has(user.id));
}
