import type { AuthSession } from "@/lib/types";
import { isFullAdmin } from "@/lib/auth/get-session";
import { pgGetUserById } from "@/lib/db/repository-extended";
import {
  pgIsDeviceInSubtree,
  pgListDevices,
  pgListDeviceSubtree,
} from "@/lib/db/repository-devices";
import { isMinistryParentRole, isSubUserRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";
import type { Device } from "@/lib/types";

/** Roles that manage their own org subtree (not the full catalog). */
export function isDeviceTreeScopedRole(session: AuthSession): boolean {
  return isMinistryParentRole(session.role) || isSubUserRole(session.role);
}

/** Who can open the devices tree page. */
export function canAccessDevicesPage(session: AuthSession): boolean {
  return isFullAdmin(session) || isDeviceTreeScopedRole(session);
}

/** Resolve the device node this user is attached to (home of their subtree). */
export async function getSessionHomeDeviceId(
  session: AuthSession
): Promise<string | null> {
  if (!session.userId || !isPostgresConfigured()) return null;
  const user = await pgGetUserById(session.userId);
  if (!user) return null;
  return user.deviceId ?? user.organizationId ?? user.ministryId ?? null;
}

export async function listAccessibleDevices(
  session: AuthSession
): Promise<Device[]> {
  if (!isPostgresConfigured()) return [];
  if (isFullAdmin(session)) return pgListDevices();
  if (!isDeviceTreeScopedRole(session)) return [];
  const homeId = await getSessionHomeDeviceId(session);
  if (!homeId) return [];
  return pgListDeviceSubtree(homeId);
}

/** Whether the session may mutate this device (edit/delete) or use it as a parent. */
export async function canMutateDevice(
  session: AuthSession,
  deviceId: string
): Promise<boolean> {
  if (isFullAdmin(session)) return true;
  if (!isDeviceTreeScopedRole(session)) return false;
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
  parentId: string | null | undefined
): Promise<boolean> {
  if (isFullAdmin(session)) return true;
  if (!isDeviceTreeScopedRole(session)) return false;
  if (!parentId) return false;
  return canMutateDevice(session, parentId);
}
