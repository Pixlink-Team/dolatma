import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAdminSessionCookieName } from "@/lib/auth/admin-session";
import { tryClearAdminSessionCookies } from "@/lib/auth/clear-session-cookies";
import type { OwnerScope } from "@/lib/auth/owner-scope";
import { parseSessionTokenSync } from "@/lib/auth/session-node";
import { isSessionVersionCurrent } from "@/lib/auth/session-versions";
import { pgGetUserById } from "@/lib/db/repository-extended";
import { pgListDescendantUserIds } from "@/lib/db/repository-ministries";
import type { AuthSession } from "@/lib/types";
import { isOrgUserRole, normalizeAdminRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";

export const getAuthSession = cache(async (): Promise<AuthSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminSessionCookieName())?.value;
  const session = parseSessionTokenSync(token);
  if (!session) return null;

  const current = await isSessionVersionCurrent(session.userId, session.sessionVersion);
  if (!current) {
    // Stale signed cookie (e.g. logged out elsewhere). Drop it when allowed.
    await tryClearAdminSessionCookies();
    return null;
  }

  // Enrich org_user sessions from DB so role/orgRole stay current after migration.
  if (session.type === "db_user" && session.userId && isPostgresConfigured()) {
    try {
      const user = await pgGetUserById(session.userId);
      if (user) {
        const permissionSets = Object.values(user.campaignPermissions ?? {});
        const anyFlag = (
          key:
            | "manageSubtreeUsers"
            | "manageSubtreeDirectives"
            | "scoreSubtreeContent"
            | "manageSubtreeDevices"
            | "viewSubtreeLiveReport"
            | "viewSubtreePerformance"
        ) => permissionSets.some((perms) => Boolean(perms?.[key]));

        return {
          ...session,
          role: normalizeAdminRole(user.role),
          orgRole: user.orgRole ?? null,
          manageSubtreeUsers: anyFlag("manageSubtreeUsers"),
          manageSubtreeDirectives: anyFlag("manageSubtreeDirectives"),
          scoreSubtreeContent: anyFlag("scoreSubtreeContent"),
          manageSubtreeDevices: anyFlag("manageSubtreeDevices"),
          viewSubtreeLiveReport: anyFlag("viewSubtreeLiveReport"),
          viewSubtreePerformance: anyFlag("viewSubtreePerformance"),
          email: user.email,
          name: user.name,
        };
      }
    } catch {
      // Fall through to cookie session if enrichment fails.
    }
  }

  return session;
});

/** Prefer this in server actions: silent logout + redirect instead of throwing Unauthorized. */
export async function requireAuthSession(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session) {
    redirect("/api/auth/clear-session");
  }
  return session;
}

export function isFullAdmin(session: AuthSession): boolean {
  return session.type === "env_admin" || session.role === "admin";
}

/**
 * Owner scope for admin panel content lists.
 * - Admin / client / reis: no filter (see all)
 * - org_user: own content only (subordinates are loaded via getSubordinatesOwnerFilter on a separate page)
 */
export async function getOwnerFilter(session: AuthSession): Promise<OwnerScope> {
  if (isFullAdmin(session)) return undefined;
  if (session.role === "client" || session.role === "reis") return undefined;
  if (!session.userId) return null;
  return session.userId;
}

/**
 * Owner scope for viewing subordinates' content (exclude self).
 * Returns null when the session cannot load a subtree.
 */
export async function getSubordinatesOwnerFilter(session: AuthSession): Promise<OwnerScope> {
  if (isFullAdmin(session) || session.role === "client" || session.role === "reis") {
    return undefined;
  }
  if (!session.userId || !isOrgUserRole(session.role) || !isPostgresConfigured()) {
    return null;
  }

  const descendantIds = await pgListDescendantUserIds(session.userId);
  if (descendantIds.length === 0) return null;
  return descendantIds;
}
