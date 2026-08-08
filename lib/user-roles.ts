import type { AdminRole, SessionRole } from "@/lib/types";
import { getOrgRoleLabel, type OrgRole } from "@/lib/org-roles";

export const ADMIN_ROLES = [
  "admin",
  "client",
  "reis",
  "org_user",
  // Legacy values kept for old session cookies until re-login after migration.
  "contributor",
  "ministry_parent",
  "sub_user",
] as const satisfies readonly AdminRole[];

export const SESSION_ROLES = ADMIN_ROLES;

/** Roles accepted when creating/editing users in the panel. */
export const ASSIGNABLE_ADMIN_ROLES = [
  "admin",
  "client",
  "reis",
  "org_user",
] as const satisfies readonly AdminRole[];

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

export function isSessionRole(value: string): value is SessionRole {
  return (SESSION_ROLES as readonly string[]).includes(value);
}

/** Normalize legacy panel roles to the current model. */
export function normalizeAdminRole(role: string | null | undefined): AdminRole {
  if (role === "admin" || role === "client" || role === "reis" || role === "org_user") {
    return role;
  }
  if (
    role === "contributor" ||
    role === "ministry_parent" ||
    role === "sub_user"
  ) {
    return "org_user";
  }
  return "org_user";
}

export function isReisRole(role: SessionRole | AdminRole | string | null | undefined): boolean {
  return role === "reis";
}

export function isOrgUserRole(role: SessionRole | AdminRole | string | null | undefined): boolean {
  return (
    role === "org_user" ||
    role === "contributor" ||
    role === "ministry_parent" ||
    role === "sub_user"
  );
}

export function getRoleLabel(role: AdminRole | SessionRole | string): string {
  switch (role) {
    case "admin":
      return "مدیر سیستم";
    case "client":
      return "کارفرما";
    case "reis":
      return "رییس";
    case "org_user":
      return "کاربر دستگاه";
    case "ministry_parent":
      return "مدیر (قدیمی)";
    case "sub_user":
      return "کاربر زیرمجموعه (قدیمی)";
    case "contributor":
      return "کاربر (قدیمی)";
    default:
      return role;
  }
}

/** Display label: prefer org position when present. */
export function getUserRoleDisplayLabel(user: {
  role: AdminRole | SessionRole | string;
  orgRole?: OrgRole | null;
}): string {
  if (isOrgUserRole(user.role) && user.orgRole) {
    return getOrgRoleLabel(user.orgRole);
  }
  return getRoleLabel(user.role);
}

/** Roles that only see their own (or subtree) content — not the full campaign feed. */
export function isContentScopedRole(role: SessionRole | AdminRole): boolean {
  return isOrgUserRole(role);
}

/** Legacy ministry_parent role only (pre-migration cookies/rows). */
export function isMinistryParentRole(role: SessionRole | AdminRole): boolean {
  return role === "ministry_parent";
}

/** Legacy sub_user role only (pre-migration cookies/rows). */
export function isSubUserRole(role: SessionRole | AdminRole): boolean {
  return role === "sub_user";
}

/** Device-tree scoped panel users (any org position). */
export function isDeviceScopedPanelRole(role: SessionRole | AdminRole): boolean {
  return isOrgUserRole(role);
}

export function canOrgRoleManageSubtreeUsers(orgRole: OrgRole | null | undefined): boolean {
  return orgRole === "primary" || orgRole === "deputy";
}
