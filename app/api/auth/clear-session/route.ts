import { NextResponse, type NextRequest } from "next/server";
import {
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
  getLegacyMockCookieName,
} from "@/lib/auth/admin-session";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";

/**
 * Clears a stale/invalid admin session cookie and sends the user to login.
 * Used when the signed cookie still passes middleware but server session checks fail
 * (e.g. session version revoked after logout elsewhere).
 */
export async function GET(request: NextRequest) {
  const next = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));
  const loginUrl = new URL("/admin/login", request.nextUrl.origin);
  if (next !== "/admin") {
    loginUrl.searchParams.set("next", next);
  }

  const response = NextResponse.redirect(loginUrl);
  const cookieOptions = {
    ...getAdminSessionCookieOptions(0),
    maxAge: 0,
  };
  response.cookies.set(getAdminSessionCookieName(), "", cookieOptions);
  response.cookies.set(getLegacyMockCookieName(), "", cookieOptions);
  return response;
}
