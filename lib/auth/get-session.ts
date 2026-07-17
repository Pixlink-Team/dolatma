import { cookies } from "next/headers";
import { cache } from "react";
import { getAdminSessionCookieName } from "@/lib/auth/admin-session";
import type { OwnerScope } from "@/lib/auth/owner-scope";
import { parseSessionTokenSync } from "@/lib/auth/session-node";
import { isSessionVersionCurrent } from "@/lib/auth/session-versions";
import { pgListSubUserIds } from "@/lib/db/repository-ministries";
import type { AuthSession } from "@/lib/types";
import { isMinistryParentRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";

export const getAuthSession = cache(async (): Promise<AuthSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminSessionCookieName())?.value;
  const session = parseSessionTokenSync(token);
  if (!session) return null;

  const current = await isSessionVersionCurrent(session.userId, session.sessionVersion);
  if (!current) return null;

  return session;
});

export async function requireAuthSession(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export function isFullAdmin(session: AuthSession): boolean {
  return session.type === "env_admin" || session.role === "admin";
}

/**
 * Owner scope for admin panel data.
 * - Admin: no filter (see all)
 * - Client (کارفرما): no filter (needs all content for scoring/oversight)
 * - ministry_parent: own rows + sub-users' rows
 * - sub_user / contributor: only their own rows
 *
 * Ministry users never see the shared "full campaign" feed — only their scope.
 */
export async function getOwnerFilter(session: AuthSession): Promise<OwnerScope> {
  if (isFullAdmin(session)) return undefined;
  if (session.role === "client") return undefined;
  if (!session.userId) return null;

  if (isMinistryParentRole(session.role) && isPostgresConfigured()) {
    const childIds = await pgListSubUserIds(session.userId);
    return [session.userId, ...childIds];
  }

  return session.userId;
}
