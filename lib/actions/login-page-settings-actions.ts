"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  DEFAULT_LOGIN_PAGE_SETTINGS,
  pgGetLoginPageSettings,
  pgSaveLoginPageSettings,
} from "@/lib/db/login-page-settings";
import type { LoginPageSettings } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

/** Public: login page needs copy without an authenticated session. */
export async function getLoginPageSettingsAction(): Promise<LoginPageSettings> {
  if (!isPostgresConfigured()) {
    return { ...DEFAULT_LOGIN_PAGE_SETTINGS };
  }

  try {
    return await pgGetLoginPageSettings();
  } catch (error) {
    console.error("[login-page-settings] get failed:", error);
    return { ...DEFAULT_LOGIN_PAGE_SETTINGS };
  }
}

export async function getAdminLoginPageSettingsAction(): Promise<LoginPageSettings | null> {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return null;
  }

  return getLoginPageSettingsAction();
}

export async function saveLoginPageSettingsAction(data: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  footer?: string;
}) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }

  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const result = await pgSaveLoginPageSettings(data);
  if (!result.success) {
    return result;
  }

  revalidatePath("/admin/login");
  revalidatePath("/admin/settings");
  return { success: true as const };
}
