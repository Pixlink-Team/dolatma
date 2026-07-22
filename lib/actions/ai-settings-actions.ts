"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { testAiProviderConnection } from "@/lib/ai/client";
import {
  DEFAULT_AI_SETTINGS,
  toPublicAiSettings,
  type AiFeatureId,
  type AiProviderId,
  type AiSettingsPublic,
} from "@/lib/ai/settings";
import {
  pgGetAiSettings,
  pgSaveAiSettings,
  type AiSettingsSaveInput,
} from "@/lib/db/ai-settings";
import { isPostgresConfigured } from "@/lib/utils";

async function revalidateAiPaths() {
  revalidatePath("/admin/settings");
}

export async function getAiSettingsAction(): Promise<AiSettingsPublic | null> {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return null;
  }

  if (!isPostgresConfigured()) {
    return toPublicAiSettings({
      ...DEFAULT_AI_SETTINGS,
      openai: { ...DEFAULT_AI_SETTINGS.openai },
      gemini: { ...DEFAULT_AI_SETTINGS.gemini },
      featureProviders: { ...DEFAULT_AI_SETTINGS.featureProviders },
    });
  }

  const settings = await pgGetAiSettings();
  return toPublicAiSettings(settings);
}

export async function saveAiSettingsAction(data: {
  enabled?: boolean;
  defaultProvider?: AiProviderId;
  openai?: {
    apiKey?: string;
    baseUrl?: string | null;
    model?: string;
  };
  gemini?: {
    apiKey?: string;
    baseUrl?: string | null;
    model?: string;
  };
  featureProviders?: Partial<Record<AiFeatureId, AiProviderId>>;
  dailyTokenLimit?: number | null;
}) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }

  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  const payload: AiSettingsSaveInput = {
    enabled: data.enabled,
    defaultProvider: data.defaultProvider,
    openai: data.openai,
    gemini: data.gemini,
    featureProviders: data.featureProviders,
    dailyTokenLimit: data.dailyTokenLimit,
  };

  const result = await pgSaveAiSettings(payload);
  if (!result.success) {
    return result;
  }

  await revalidateAiPaths();
  return { success: true as const };
}

export async function testAiConnectionAction(provider: AiProviderId) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { ok: false as const, error: "Unauthorized" };
  }

  if (!isPostgresConfigured()) {
    return { ok: false as const, error: "Database required" };
  }

  if (provider !== "openai" && provider !== "gemini") {
    return { ok: false as const, error: "ارائه‌دهنده نامعتبر است." };
  }

  return testAiProviderConnection(provider);
}
