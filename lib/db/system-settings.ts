import { getSql } from "@/lib/db/client";
import { DEFAULT_SMS_SETTINGS } from "@/lib/sms/provider";
import type {
  SmsProviderId,
  SmsProviderSettings,
  SmsProviderSettingsPublic,
} from "@/lib/types";

const SMS_PROVIDER_SETTINGS_KEY = "sms_provider";

const SMS_PROVIDERS: SmsProviderId[] = ["none", "kavenegar", "melipayamak", "custom"];

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

export function isSmsProviderConfigured(settings: SmsProviderSettings): boolean {
  return Boolean(
    settings.enabled &&
      settings.provider !== "none" &&
      settings.apiKey?.trim()
  );
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
    apiKey: data.apiKey?.trim() ? data.apiKey.trim() : existing.apiKey || null,
    sender:
      data.sender !== undefined
        ? data.sender?.trim() || null
        : existing.sender || null,
  };

  if (data.apiKey === "") {
    next.apiKey = null;
  }

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
