import { isFullAdmin } from "@/lib/auth/get-session";
import { isClientUser } from "@/lib/auth/access";
import type { AuthSession } from "@/lib/types";
import type { AdminUser, Permission } from "@taghvim/types/auth";
import { ALL_PERMISSIONS } from "@taghvim/types/auth";

export type TaghvimActor = {
  session: AuthSession;
  /** Local calendar user row id (bigint as number). */
  localUserId: number;
  user: AdminUser;
};

export function elevatedDolatma(session: AuthSession): boolean {
  return (
    isFullAdmin(session) ||
    isClientUser(session) ||
    session.role === "reis" ||
    session.type === "env_admin"
  );
}

export function defaultPermissionsForSession(session: AuthSession): Permission[] {
  if (elevatedDolatma(session)) return [...ALL_PERMISSIONS];
  return [
    "view_admin_views",
    "manage_content",
    "publish",
    "manage_subusers",
    "view_archive",
  ];
}

export function actorHasPermission(
  actor: TaghvimActor,
  permission: Permission
): boolean {
  if (actor.user.role === "super_admin") return true;
  return actor.user.permissions.includes(permission);
}

export function jsonError(message: string, status: number) {
  return Response.json({ message }, { status });
}
