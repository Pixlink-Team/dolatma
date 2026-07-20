import type { LoginPageSettings } from "@/lib/types";

export const DEFAULT_LOGIN_PAGE_SETTINGS: LoginPageSettings = {
  eyebrow: "ورود به سامانه",
  title: "25 درجه قرار همدلی",
  subtitle: "مدیریت گزارش‌ها و محتوای اقدام",
  footer: "سامانه مدیریت گزارش زنده اقدام",
};

const MAX_FIELD_LENGTH = 120;

function sanitizeField(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return fallback;
  return trimmed.slice(0, MAX_FIELD_LENGTH);
}

export function normalizeLoginPageSettings(value: unknown): LoginPageSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_LOGIN_PAGE_SETTINGS };
  }

  const record = value as Partial<LoginPageSettings>;
  return {
    eyebrow: sanitizeField(record.eyebrow, DEFAULT_LOGIN_PAGE_SETTINGS.eyebrow),
    title: sanitizeField(record.title, DEFAULT_LOGIN_PAGE_SETTINGS.title),
    subtitle: sanitizeField(record.subtitle, DEFAULT_LOGIN_PAGE_SETTINGS.subtitle),
    footer: sanitizeField(record.footer, DEFAULT_LOGIN_PAGE_SETTINGS.footer),
  };
}
