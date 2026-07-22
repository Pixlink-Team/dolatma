import { getSql } from "@/lib/db/client";
import { decryptSecret, encryptSecret } from "@/lib/ai/crypto";
import {
  DEFAULT_AI_SETTINGS,
  normalizeAiSettings,
  toPublicAiSettings,
  utcToday,
  type AiFeatureId,
  type AiProviderId,
  type AiSettings,
  type AiSettingsPublic,
  type AiSettingsRuntime,
} from "@/lib/ai/settings";

export {
  DEFAULT_AI_SETTINGS,
  isDailyTokenLimitExceeded,
  normalizeAiSettings,
  toPublicAiSettings,
} from "@/lib/ai/settings";

const AI_SETTINGS_KEY = "ai_settings";

export type AiSettingsSaveInput = {
  enabled?: boolean;
  defaultProvider?: AiProviderId;
  openai?: {
    /** undefined = keep existing; "" = clear; otherwise encrypt and store */
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
  /** undefined = keep; null or <= 0 = unlimited */
  dailyTokenLimit?: number | null;
};

export async function pgGetAiSettings(): Promise<AiSettings> {
  const sql = getSql();
  const rows = await sql`
    SELECT value FROM system_settings WHERE key = ${AI_SETTINGS_KEY} LIMIT 1
  `;

  if (!rows[0]?.value) {
    return normalizeAiSettings(DEFAULT_AI_SETTINGS);
  }

  return normalizeAiSettings(rows[0].value);
}

export async function pgGetAiSettingsPublic(): Promise<AiSettingsPublic> {
  const settings = await pgGetAiSettings();
  return toPublicAiSettings(settings);
}

/**
 * Returns decrypted API keys for server-side AI calls.
 * Never expose this object to the client or log it.
 */
export async function pgGetAiSettingsForRuntime(): Promise<AiSettingsRuntime> {
  const settings = await pgGetAiSettings();

  const decryptKey = (encrypted: string | null): string | null => {
    if (!encrypted?.trim()) return null;
    try {
      const plain = decryptSecret(encrypted).trim();
      return plain || null;
    } catch {
      return null;
    }
  };

  return {
    enabled: settings.enabled,
    defaultProvider: settings.defaultProvider,
    openai: {
      apiKey: decryptKey(settings.openai.apiKeyEncrypted),
      baseUrl: settings.openai.baseUrl,
      model: settings.openai.model,
    },
    gemini: {
      apiKey: decryptKey(settings.gemini.apiKeyEncrypted),
      baseUrl: settings.gemini.baseUrl,
      model: settings.gemini.model,
    },
    featureProviders: { ...settings.featureProviders },
    dailyTokenLimit: settings.dailyTokenLimit,
    usageDate: settings.usageDate,
    usageTokens: settings.usageTokens,
  };
}

function resolveApiKeyEncrypted(
  incoming: string | undefined,
  existingEncrypted: string | null
): string | null {
  if (incoming === undefined) {
    return existingEncrypted;
  }
  if (incoming === "") {
    return null;
  }
  const trimmed = incoming.trim();
  if (!trimmed) {
    return null;
  }
  return encryptSecret(trimmed);
}

export async function pgSaveAiSettings(
  data: AiSettingsSaveInput
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const existing = await pgGetAiSettings();
  const now = new Date().toISOString();

  const next = normalizeAiSettings({
    enabled: data.enabled ?? existing.enabled,
    defaultProvider: data.defaultProvider ?? existing.defaultProvider,
    openai: {
      apiKeyEncrypted: resolveApiKeyEncrypted(
        data.openai?.apiKey,
        existing.openai.apiKeyEncrypted
      ),
      baseUrl:
        data.openai?.baseUrl !== undefined
          ? data.openai.baseUrl?.trim() || null
          : existing.openai.baseUrl,
      model: data.openai?.model ?? existing.openai.model,
    },
    gemini: {
      apiKeyEncrypted: resolveApiKeyEncrypted(
        data.gemini?.apiKey,
        existing.gemini.apiKeyEncrypted
      ),
      baseUrl:
        data.gemini?.baseUrl !== undefined
          ? data.gemini.baseUrl?.trim() || null
          : existing.gemini.baseUrl,
      model: data.gemini?.model ?? existing.gemini.model,
    },
    featureProviders: {
      ...existing.featureProviders,
      ...(data.featureProviders ?? {}),
    },
    dailyTokenLimit:
      data.dailyTokenLimit !== undefined
        ? data.dailyTokenLimit
        : existing.dailyTokenLimit,
    usageDate: existing.usageDate,
    usageTokens: existing.usageTokens,
  });

  await sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${AI_SETTINGS_KEY}, ${sql.json(JSON.parse(JSON.stringify(next)))}, ${now})
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at
  `;

  return { success: true };
}

/**
 * Increment daily token usage. Resets the counter when the UTC date changes.
 * Still increments even if the limit would be exceeded; callers must check beforehand.
 */
export async function pgIncrementAiTokenUsage(tokens: number): Promise<AiSettings> {
  const amount = Math.max(0, Math.floor(tokens));
  const sql = getSql();
  const existing = await pgGetAiSettings();
  const today = utcToday();
  const now = new Date().toISOString();

  const next: AiSettings = {
    ...existing,
    openai: { ...existing.openai },
    gemini: { ...existing.gemini },
    featureProviders: { ...existing.featureProviders },
    usageDate: today,
    usageTokens: existing.usageDate === today ? existing.usageTokens + amount : amount,
  };

  await sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${AI_SETTINGS_KEY}, ${sql.json(JSON.parse(JSON.stringify(next)))}, ${now})
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at
  `;

  return next;
}
