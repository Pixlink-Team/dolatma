import { cookies } from "next/headers";
import {
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
  getLegacyMockCookieName,
} from "@/lib/auth/admin-session";

/** Clears admin session cookies. Safe to call from Server Actions / Route Handlers. */
export async function clearAdminSessionCookies() {
  const cookieStore = await cookies();
  const cookieOptions = getAdminSessionCookieOptions(0);
  cookieStore.set(getAdminSessionCookieName(), "", cookieOptions);
  cookieStore.set(getLegacyMockCookieName(), "", cookieOptions);
}

/**
 * Best-effort cookie clear. In RSC render, Next.js forbids cookie mutation —
 * swallow that error so callers can still redirect via /api/auth/clear-session.
 */
export async function tryClearAdminSessionCookies() {
  try {
    await clearAdminSessionCookies();
  } catch {
    // Ignore: cookie writes are only allowed in actions / route handlers.
  }
}
