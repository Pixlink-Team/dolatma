import { redirect } from "next/navigation";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import type { AuthSession } from "@/lib/types";

export const FORBIDDEN = { success: false as const, error: "دسترسی مجاز نیست" };

/**
 * For server actions: missing/invalid session → clear cookies and redirect to login
 * (no "Unauthorized" toast). Never returns null.
 */
export async function requireAuthSessionOrRedirect(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session) {
    redirect("/api/auth/clear-session");
  }
  return session;
}

/** Full admin only. Missing session redirects; insufficient role returns a Persian error. */
export async function requireFullAdminOrRedirect(): Promise<
  AuthSession | typeof FORBIDDEN
> {
  const session = await requireAuthSessionOrRedirect();
  if (!isFullAdmin(session)) return FORBIDDEN;
  return session;
}
