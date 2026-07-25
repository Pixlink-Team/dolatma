import type { AuthSession } from "@/lib/types";
import { isFullAdmin } from "@/lib/auth/get-session";
import {
  hasContributorPermission,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import { canOrgRoleManageSubtreeUsers, isOrgUserRole } from "@/lib/user-roles";

export function isClientUser(session: AuthSession): boolean {
  return session.role === "client";
}

export function canAccessNotifications(session: AuthSession): boolean {
  return isFullAdmin(session) || isClientUser(session);
}

/**
 * All authenticated panel users can open the directives inbox.
 * Campaign membership is enforced separately when loading data.
 */
export function canViewDirectives(session: AuthSession): boolean {
  return Boolean(session);
}

/** Admin and client can issue directives to the full campaign audience. */
export function canManageDirectivesGlobally(session: AuthSession): boolean {
  return isFullAdmin(session) || isClientUser(session);
}

function resolveOrgManagementFlag(
  session: AuthSession,
  permissions: ContributorPermissions | null | undefined,
  key: "manageSubtreeUsers" | "manageSubtreeDirectives" | "scoreSubtreeContent" | "manageSubtreeDevices",
  sessionFlag: boolean | undefined,
  orgRoleFallback: boolean
): boolean {
  if (permissions) {
    return hasContributorPermission(permissions, key);
  }
  if (typeof sessionFlag === "boolean") {
    return sessionFlag;
  }
  return orgRoleFallback;
}

/**
 * Who can create/edit directives:
 * - admin / client: full campaign
 * - org_user with manageSubtreeDirectives
 */
export function canManageDirectives(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (canManageDirectivesGlobally(session)) return true;
  if (!isOrgUserRole(session.role)) return false;
  return resolveOrgManagementFlag(
    session,
    permissions,
    "manageSubtreeDirectives",
    session.manageSubtreeDirectives,
    canOrgRoleManageSubtreeUsers(session.orgRole)
  );
}

/** Parent issuers are limited to their subtree; admin/client are not. */
export function isScopedDirectiveIssuer(session: AuthSession): boolean {
  return isOrgUserRole(session.role) && !canManageDirectivesGlobally(session);
}

/** Whether this session may edit/archive/manage workspace for a specific directive. */
export function canManageDirectiveRecord(
  session: AuthSession,
  directive: { createdByUserId?: string | null },
  permissions?: ContributorPermissions | null
): boolean {
  if (!canManageDirectives(session, permissions)) return false;
  if (canManageDirectivesGlobally(session)) return true;
  return Boolean(session.userId && directive.createdByUserId === session.userId);
}

/** Only admin and client (کارفرما) can create/edit form definitions. */
export function canManageForms(session: AuthSession): boolean {
  return isFullAdmin(session) || isClientUser(session);
}

/**
 * Who can score content:
 * - admin / client: always
 * - org_user with scoreSubtreeContent (scoped to owner filter elsewhere)
 */
export function canScoreContent(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (isFullAdmin(session)) return true;
  if (isClientUser(session)) return true;
  if (!isOrgUserRole(session.role)) return false;
  return resolveOrgManagementFlag(
    session,
    permissions,
    "scoreSubtreeContent",
    session.scoreSubtreeContent,
    session.orgRole === "primary"
  );
}

/** Whether an org user may manage users under their device subtree. */
export function canManageSubtreeUsers(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (isFullAdmin(session)) return true;
  if (!isOrgUserRole(session.role)) return false;
  return resolveOrgManagementFlag(
    session,
    permissions,
    "manageSubtreeUsers",
    session.manageSubtreeUsers,
    canOrgRoleManageSubtreeUsers(session.orgRole)
  );
}
