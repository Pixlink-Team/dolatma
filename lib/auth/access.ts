import type { AuthSession } from "@/lib/types";
import { isFullAdmin } from "@/lib/auth/get-session";
import { isMinistryParentRole } from "@/lib/user-roles";

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

/**
 * Who can create/edit directives:
 * - admin / client: full campaign
 * - ministry_parent: only their own subordinates (زیردست‌ها)
 */
export function canManageDirectives(session: AuthSession): boolean {
  return canManageDirectivesGlobally(session) || isMinistryParentRole(session.role);
}

/** Parent issuers are limited to their sub-users; admin/client are not. */
export function isScopedDirectiveIssuer(session: AuthSession): boolean {
  return isMinistryParentRole(session.role) && !canManageDirectivesGlobally(session);
}

/** Whether this session may edit/archive/manage workspace for a specific directive. */
export function canManageDirectiveRecord(
  session: AuthSession,
  directive: { createdByUserId?: string | null }
): boolean {
  if (!canManageDirectives(session)) return false;
  if (canManageDirectivesGlobally(session)) return true;
  return Boolean(session.userId && directive.createdByUserId === session.userId);
}

/** Only admin and client (کارفرما) can create/edit form definitions. */
export function canManageForms(session: AuthSession): boolean {
  return isFullAdmin(session) || isClientUser(session);
}

/** Only admin and client (کارفرما) can score. Contributors never can. */
export function canScoreContent(session: AuthSession): boolean {
  if (isFullAdmin(session)) return true;
  if (isClientUser(session)) return true;
  return false;
}
