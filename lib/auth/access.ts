import type { AuthSession } from "@/lib/types";
import { isFullAdmin } from "@/lib/auth/get-session";
import {
  hasContributorPermission,
  type ContributorPermissionKey,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import {
  pgGetUserById,
  pgGetUserPermissionsForCampaign,
} from "@/lib/db/repository-extended";
import { isOrgUserRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";

export function isClientUser(session: AuthSession): boolean {
  return session.role === "client";
}

/** Admin and کارفرما (بالادستی سراسری) manage any campaign content. */
export function canManageAllContent(session: AuthSession): boolean {
  return isFullAdmin(session) || isClientUser(session);
}

const CONTENT_MESSAGE_SECTION_KEYS: ContributorPermissionKey[] = [
  "billboards",
  "posters",
  "videos",
  "files",
  "rawMedia",
  "socialPosts",
  "sitePublications",
  "activities",
  "broadcast",
  "meetings",
  "submissions",
];

/**
 * Who can send content-card messages to owners:
 * - admin / client (کارفرما / بالادستی سراسری)
 * - org_user who can manage any content section (مدیر دستگاه برای زیرشاخه)
 */
export function canSendContentMessages(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (canManageAllContent(session)) return true;
  if (!isOrgUserRole(session.role)) return false;
  if (!permissions) return true;
  return CONTENT_MESSAGE_SECTION_KEYS.some((key) =>
    hasContributorPermission(permissions, key)
  );
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
 * Prefer campaign-scoped permissions when provided; otherwise the session OR-flag.
 * Never fall back to orgRole — presets only apply when saving user permissions.
 */
function resolveOrgManagementFlag(
  permissions: ContributorPermissions | null | undefined,
  key: "manageSubtreeUsers" | "manageSubtreeDirectives" | "scoreSubtreeContent" | "manageSubtreeDevices",
  sessionFlag: boolean | undefined
): boolean {
  if (permissions) {
    return hasContributorPermission(permissions, key);
  }
  return sessionFlag === true;
}

/**
 * Who can create/edit directives:
 * - admin / client: full campaign
 * - org_user with manageSubtreeDirectives on the active campaign (when permissions passed)
 */
export function canManageDirectives(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (canManageDirectivesGlobally(session)) return true;
  if (!isOrgUserRole(session.role)) return false;
  return resolveOrgManagementFlag(
    permissions,
    "manageSubtreeDirectives",
    session.manageSubtreeDirectives
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

/**
 * Admin / client always; org users need the `forms` campaign permission.
 * Pass campaign permissions when available; otherwise only role bypass applies.
 */
export function canManageForms(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  return hasContributorPermission(permissions, "forms");
}

/** Resolve forms access for a specific campaign (loads membership when needed). */
export async function canManageFormsForCampaign(
  session: AuthSession,
  campaignId: string
): Promise<boolean> {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  if (!session.userId || !isPostgresConfigured()) return false;
  const permissions = await pgGetUserPermissionsForCampaign(session.userId, campaignId);
  return hasContributorPermission(permissions, "forms");
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
    permissions,
    "scoreSubtreeContent",
    session.scoreSubtreeContent
  );
}

/**
 * Manage automatic scoring rules (the `/admin/scoring` page): admin/client only.
 * Org users may score content via `canScoreContent`, but never edit the rules themselves.
 */
export function canManageScoringRules(session: AuthSession): boolean {
  return isFullAdmin(session) || isClientUser(session);
}

/**
 * Whether an org user may manage users under their device subtree.
 * Honors `manageSubtreeUsers` on campaign permissions (or the session OR-flag).
 * Section grants for new users are still capped to the actor's own grants.
 */
export function canManageSubtreeUsers(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (isFullAdmin(session)) return true;
  if (!isOrgUserRole(session.role)) return false;
  return resolveOrgManagementFlag(
    permissions,
    "manageSubtreeUsers",
    session.manageSubtreeUsers
  );
}

/** Whether an org user may create/edit/delete devices in their subtree. */
export function canManageSubtreeDevices(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (isFullAdmin(session)) return true;
  if (!isOrgUserRole(session.role)) return false;
  return resolveOrgManagementFlag(
    permissions,
    "manageSubtreeDevices",
    session.manageSubtreeDevices
  );
}

function hasPanelPermission(
  session: AuthSession,
  permissions: ContributorPermissions | null | undefined,
  key: ContributorPermissionKey
): boolean {
  if (isFullAdmin(session)) return true;
  return hasContributorPermission(permissions, key);
}

/** Campaign (راستا) settings page — admin/client, or granted `campaignSettings`. */
export function canAccessCampaignSettings(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  return hasPanelPermission(session, permissions, "campaignSettings");
}

export async function canAccessCampaignSettingsForCampaign(
  session: AuthSession,
  campaignId: string
): Promise<boolean> {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  if (!session.userId || !isPostgresConfigured()) return false;
  const permissions = await pgGetUserPermissionsForCampaign(session.userId, campaignId);
  return hasContributorPermission(permissions, "campaignSettings");
}

/** Site updates page — admin/client, or granted `siteUpdates` on any/active campaign. */
export function canAccessSiteUpdates(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  return hasPanelPermission(session, permissions, "siteUpdates");
}

/**
 * Section tutorials management page.
 * Editing content stays admin-only in actions; this only gates page access.
 */
export function canAccessSectionTutorials(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (isFullAdmin(session)) return true;
  return hasPanelPermission(session, permissions, "sectionTutorials");
}

/** National calendar — admin/client, or granted `nationalCalendar` on any/active campaign. */
export function canAccessNationalCalendar(
  session: AuthSession,
  permissions?: ContributorPermissions | null
): boolean {
  if (isFullAdmin(session) || isClientUser(session)) return true;
  return hasPanelPermission(session, permissions, "nationalCalendar");
}

/** True when any campaign membership grants the panel permission. */
export async function hasAnyCampaignPermission(
  session: AuthSession,
  key: ContributorPermissionKey
): Promise<boolean> {
  if (isFullAdmin(session)) return true;
  if (!session.userId || !isPostgresConfigured()) return false;
  const user = await pgGetUserById(session.userId);
  if (!user) return false;
  return Object.values(user.campaignPermissions ?? {}).some((perms) =>
    hasContributorPermission(perms, key)
  );
}
