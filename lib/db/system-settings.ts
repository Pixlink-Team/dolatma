import { decryptSecret, encryptSecret } from "@/lib/ai/crypto";
import { getSql } from "@/lib/db/client";
import { DEFAULT_SMS_SETTINGS } from "@/lib/sms/provider";
import type {
  SmsProviderId,
  SmsProviderSettings,
  SmsProviderSettingsPublic,
} from "@/lib/types";

const SMS_PROVIDER_SETTINGS_KEY = "sms_provider";

const SMS_PROVIDERS: SmsProviderId[] = ["none", "smsir", "kavenegar", "melipayamak", "custom"];

function normalizeSmsProvider(value: unknown): SmsProviderId {
  if (typeof value === "string" && SMS_PROVIDERS.includes(value as SmsProviderId)) {
    return value as SmsProviderId;
  }
  return "none";
}

function normalizeSmsSettings(value: unknown): SmsProviderSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_SMS_SETTINGS };
  }

  const record = value as Partial<SmsProviderSettings>;
  const provider = normalizeSmsProvider(record.provider);
  return {
    enabled: Boolean(record.enabled) && provider !== "none",
    provider,
    apiKey: record.apiKey?.trim() || null,
    sender: record.sender?.trim() || null,
  };
}

function decryptApiKey(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const plain = decryptSecret(value).trim();
    return plain || null;
  } catch {
    return null;
  }
}

function resolveStoredApiKey(
  incoming: string | null | undefined,
  existingEncryptedOrPlain: string | null
): string | null {
  if (incoming === "" || incoming === null) {
    return null;
  }
  if (incoming?.trim()) {
    return encryptSecret(incoming.trim());
  }
  if (!existingEncryptedOrPlain?.trim()) {
    return null;
  }
  // Migrate legacy plaintext keys on any save that keeps the existing key.
  if (!existingEncryptedOrPlain.startsWith("enc:v1:")) {
    return encryptSecret(existingEncryptedOrPlain.trim());
  }
  return existingEncryptedOrPlain;
}

export function isSmsProviderConfigured(settings: SmsProviderSettings): boolean {
  const hasApiKey = Boolean(settings.apiKey?.trim());
  const hasSender = Boolean(settings.sender?.trim());

  if (!settings.enabled || settings.provider === "none" || !hasApiKey) {
    return false;
  }

  if (settings.provider === "smsir") {
    return hasSender;
  }

  return true;
}

export function toPublicSmsSettings(settings: SmsProviderSettings): SmsProviderSettingsPublic {
  return {
    enabled: settings.enabled,
    provider: settings.provider,
    sender: settings.sender?.trim() ?? "",
    hasApiKey: Boolean(settings.apiKey?.trim()),
    configured: isSmsProviderConfigured(settings),
  };
}

export async function pgGetSmsProviderSettings(): Promise<SmsProviderSettings> {
  const sql = getSql();
  const rows = await sql`
    SELECT value FROM system_settings WHERE key = ${SMS_PROVIDER_SETTINGS_KEY} LIMIT 1
  `;

  if (!rows[0]?.value) {
    return { ...DEFAULT_SMS_SETTINGS };
  }

  return normalizeSmsSettings(rows[0].value);
}

/** Decrypted credentials for server-side SMS sends. Never expose to the client. */
export async function pgGetSmsProviderSettingsForRuntime(): Promise<SmsProviderSettings> {
  const settings = await pgGetSmsProviderSettings();
  return {
    ...settings,
    apiKey: decryptApiKey(settings.apiKey),
  };
}

export async function pgSaveSmsProviderSettings(
  data: Partial<SmsProviderSettings>
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const existing = await pgGetSmsProviderSettings();
  const now = new Date().toISOString();
  const provider = normalizeSmsProvider(data.provider ?? existing.provider);

  const next: SmsProviderSettings = {
    enabled: data.enabled ?? existing.enabled,
    provider,
    apiKey: resolveStoredApiKey(data.apiKey, existing.apiKey ?? null),
    sender:
      data.sender !== undefined
        ? data.sender?.trim() || null
        : existing.sender || null,
  };

  if (provider === "none") {
    next.enabled = false;
  }

  await sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${SMS_PROVIDER_SETTINGS_KEY}, ${sql.json(JSON.parse(JSON.stringify(next)))}, ${now})
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at
  `;

  return { success: true };
}
