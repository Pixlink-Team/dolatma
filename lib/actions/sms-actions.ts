"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgGetSmsProviderSettings,
  pgSaveSmsProviderSettings,
  toPublicSmsSettings,
} from "@/lib/db/system-settings";
import { DEFAULT_SMS_SETTINGS } from "@/lib/sms/provider";
import type { SmsProviderId, SmsProviderSettingsPublic } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

async function revalidateSmsPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/directives");
}

export async function getSmsSettingsAction(): Promise<SmsProviderSettingsPublic | null> {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return null;
  }

  if (!isPostgresConfigured()) {
    return toPublicSmsSettings({ ...DEFAULT_SMS_SETTINGS });
  }

  const settings = await pgGetSmsProviderSettings();
  return toPublicSmsSettings(settings);
}

export async function saveSmsSettingsAction(data: {
  enabled?: boolean;
  provider?: SmsProviderId;
  apiKey?: string;
  sender?: string;
}) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }

  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const result = await pgSaveSmsProviderSettings({
    enabled: data.enabled,
    provider: data.provider,
    apiKey: data.apiKey,
    sender: data.sender,
  });

  if (!result.success) {
    return result;
  }

  await revalidateSmsPaths();
  return { success: true as const };
}
