"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  clearBillboardApiTokenCache,
  resolveBillboardApiToken,
} from "@/lib/services/billboard-api-auth";
import {
  pgGetMapBilboardApiSettings,
  pgSaveMapBilboardApiSettings,
  toPublicMapBilboardSettings,
} from "@/lib/db/system-settings";
import type { MapBilboardApiSettingsPublic } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

async function revalidateIntegrationPaths() {
  revalidatePath("/admin/integrations");
  revalidatePath("/admin/billboards");
}

export async function getMapBilboardSettingsAction(): Promise<MapBilboardApiSettingsPublic | null> {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return null;
  }

  if (!isPostgresConfigured()) {
    return {
      baseUrl: "https://billboard.pixlink.ir",
      email: "",
      hasPassword: false,
      hasToken: false,
      configured: false,
    };
  }

  const settings = await pgGetMapBilboardApiSettings();
  return toPublicMapBilboardSettings(settings);
}

export async function saveMapBilboardSettingsAction(data: {
  baseUrl?: string;
  email?: string;
  password?: string;
  token?: string;
}) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  const result = await pgSaveMapBilboardApiSettings(data);
  if (!result.success) {
    return result;
  }

  clearBillboardApiTokenCache();
  await revalidateIntegrationPaths();
  return { success: true };
}

export async function testMapBilboardConnectionAction() {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await resolveBillboardApiToken({ forceRefresh: true });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "اتصال ناموفق بود",
    };
  }
}
