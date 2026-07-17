/**
 * SMS provider placeholder.
 * Credentials live in system_settings (key: sms_provider) and are edited from campaign settings UI.
 */

import type { SmsProviderSettings } from "@/lib/types";

export type SmsSendResult =
  | { ok: true; providerMessageId?: string }
  | { ok: false; error: string; skipped?: boolean };

export type { SmsProviderSettings };

export const DEFAULT_SMS_SETTINGS: SmsProviderSettings = {
  enabled: false,
  provider: "none",
  apiKey: null,
  sender: null,
};

export function buildDirectiveSmsText(title: string, linkUrl: string): string {
  const shortTitle = title.trim().slice(0, 60);
  return `دستورکار جدید «${shortTitle}» در سامانه ثبت شد. مشاهده: ${linkUrl}`;
}

/**
 * Attempts to send an SMS. Until a provider is configured, returns a skipped/failed result
 * so callers can persist status without blocking publish.
 */
export async function sendSms(
  phone: string | null | undefined,
  message: string,
  settings: SmsProviderSettings = DEFAULT_SMS_SETTINGS
): Promise<SmsSendResult> {
  const normalized = phone?.trim() ?? "";
  if (!normalized) {
    return { ok: false, error: "شماره موبایل ثبت نشده", skipped: true };
  }

  if (!settings.enabled || settings.provider === "none") {
    return { ok: false, error: "سرویس پیامک هنوز پیکربندی نشده است", skipped: true };
  }

  if (!settings.apiKey?.trim()) {
    return { ok: false, error: "کلید API پیامک تنظیم نشده است", skipped: true };
  }

  // Provider integrations will be added when credentials are available.
  void message;
  return { ok: false, error: `اتصال ${settings.provider} هنوز پیاده‌سازی نشده است` };
}
