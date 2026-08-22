import type { LoginBackgroundMode, LoginPageSettings } from "@/lib/types";

export const DEFAULT_LOGIN_CUSTOM_BACKGROUND = "/images/login/custom.webp";

export const DEFAULT_LOGIN_PAGE_SETTINGS: LoginPageSettings = {
  eyebrow: "ورود به سامانه",
  title: "25 درجه قرار همدلی",
  subtitle: "مدیریت گزارش‌ها و محتوای راستا",
  footer: "سامانه مدیریت گزارش زنده راستا",
  backgroundMode: "custom",
  customBackgroundUrl: DEFAULT_LOGIN_CUSTOM_BACKGROUND,
};

const MAX_FIELD_LENGTH = 120;

function sanitizeField(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return fallback;
  return trimmed.slice(0, MAX_FIELD_LENGTH);
}

function sanitizeBackgroundMode(value: unknown): LoginBackgroundMode {
  return value === "time_of_day" ? "time_of_day" : "custom";
}

function sanitizeBackgroundUrl(value: unknown): string | null {
  if (typeof value !== "string") return DEFAULT_LOGIN_CUSTOM_BACKGROUND;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_LOGIN_CUSTOM_BACKGROUND;
  if (!trimmed.startsWith("/") && !trimmed.startsWith("http")) {
    return DEFAULT_LOGIN_CUSTOM_BACKGROUND;
  }
  return trimmed.slice(0, 512);
}

export function normalizeLoginPageSettings(value: unknown): LoginPageSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_LOGIN_PAGE_SETTINGS };
  }

  const record = value as Partial<LoginPageSettings>;
  const backgroundMode = sanitizeBackgroundMode(record.backgroundMode);
  return {
    eyebrow: sanitizeField(record.eyebrow, DEFAULT_LOGIN_PAGE_SETTINGS.eyebrow),
    title: sanitizeField(record.title, DEFAULT_LOGIN_PAGE_SETTINGS.title),
    subtitle: sanitizeField(record.subtitle, DEFAULT_LOGIN_PAGE_SETTINGS.subtitle),
    footer: sanitizeField(record.footer, DEFAULT_LOGIN_PAGE_SETTINGS.footer),
    backgroundMode,
    customBackgroundUrl: sanitizeBackgroundUrl(record.customBackgroundUrl),
  };
}
