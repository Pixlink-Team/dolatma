"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
  getLegacyMockCookieName,
  verifyAdminCredentials,
} from "@/lib/auth/admin-session";
import { createAdminSessionTokenSync } from "@/lib/auth/admin-session-node";

export async function loginAdminAction(email: string, password: string) {
  if (!verifyAdminCredentials(email, password)) {
    return { success: false as const, error: "ایمیل یا رمز عبور اشتباه است" };
  }

  const cookieStore = await cookies();
  const token = createAdminSessionTokenSync();
  const cookieOptions = getAdminSessionCookieOptions();

  cookieStore.set(getAdminSessionCookieName(), token, cookieOptions);
  cookieStore.set(getLegacyMockCookieName(), "", { ...cookieOptions, maxAge: 0 });

  redirect("/admin");
}

export async function logoutAdminAction() {
  const cookieStore = await cookies();
  const cookieOptions = getAdminSessionCookieOptions(0);

  cookieStore.set(getAdminSessionCookieName(), "", cookieOptions);
  cookieStore.set(getLegacyMockCookieName(), "", cookieOptions);
}
