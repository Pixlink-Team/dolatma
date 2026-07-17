import type { AdminRole, SessionRole } from "@/lib/types";

export const ADMIN_ROLES = [
  "admin",
  "contributor",
  "client",
  "ministry_parent",
  "sub_user",
] as const satisfies readonly AdminRole[];

export const SESSION_ROLES = ADMIN_ROLES;

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

export function isSessionRole(value: string): value is SessionRole {
  return (SESSION_ROLES as readonly string[]).includes(value);
}

export function getRoleLabel(role: AdminRole | SessionRole | string): string {
  switch (role) {
    case "admin":
      return "مدیر";
    case "client":
      return "کارفرما";
    case "ministry_parent":
      return "یوزر مادر";
    case "sub_user":
      return "کاربر زیرمجموعه";
    case "contributor":
      return "کاربر";
    default:
      return role;
  }
}

/** Roles that only see their own (or team) content — not the full campaign feed. */
export function isContentScopedRole(role: SessionRole | AdminRole): boolean {
  return (
    role === "contributor" ||
    role === "ministry_parent" ||
    role === "sub_user"
  );
}

export function isMinistryParentRole(role: SessionRole | AdminRole): boolean {
  return role === "ministry_parent";
}

export function isSubUserRole(role: SessionRole | AdminRole): boolean {
  return role === "sub_user";
}
