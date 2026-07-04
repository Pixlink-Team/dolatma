import { pgGetMapBilboardApiSettings } from "@/lib/db/system-settings";
import { billboardApiRoutes } from "@/lib/routes/billboard-api";
import type { MapBilboardApiSettings } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000;
const SETTINGS_CACHE_TTL_MS = 30_000;

let cachedLoginToken: { value: string; fetchedAt: number } | null = null;
let cachedSettings: { value: MapBilboardApiSettings; fetchedAt: number } | null = null;

function isPlaceholderToken(token: string | null | undefined): boolean {
  if (!token) return true;
  const normalized = token.trim();
  return normalized === "" || normalized === "your-service-token";
}

async function loadMapBilboardApiSettings(): Promise<MapBilboardApiSettings> {
  if (
    cachedSettings &&
    Date.now() - cachedSettings.fetchedAt < SETTINGS_CACHE_TTL_MS
  ) {
    return cachedSettings.value;
  }

  let dbSettings: MapBilboardApiSettings = {};
  if (isPostgresConfigured()) {
    try {
      dbSettings = await pgGetMapBilboardApiSettings();
    } catch {
      dbSettings = {};
    }
  }

  const merged: MapBilboardApiSettings = {
    baseUrl: dbSettings.baseUrl || process.env.BILLBOARD_API_BASE_URL?.trim() || null,
    email: dbSettings.email || process.env.BILLBOARD_API_EMAIL?.trim() || null,
    password: dbSettings.password || process.env.BILLBOARD_API_PASSWORD?.trim() || null,
    token: dbSettings.token || process.env.BILLBOARD_API_TOKEN?.trim() || null,
  };

  cachedSettings = { value: merged, fetchedAt: Date.now() };
  return merged;
}

export function clearBillboardApiTokenCache(): void {
  cachedLoginToken = null;
  cachedSettings = null;
}

function getStaticBillboardApiToken(settings: MapBilboardApiSettings): string | null {
  const token = settings.token?.trim();
  if (isPlaceholderToken(token)) {
    return null;
  }
  return token ?? null;
}

function getBillboardApiCredentials(
  settings: MapBilboardApiSettings
): { email: string; password: string } | null {
  const email = settings.email?.trim();
  const password = settings.password?.trim();
  if (!email || !password) return null;
  return { email, password };
}

function extractLoginToken(body: unknown): string {
  if (!body || typeof body !== "object") {
    throw new Error("پاسخ ورود به Map-Bilboard نامعتبر است");
  }

  const record = body as Record<string, unknown>;
  const data = record.data;
  if (data && typeof data === "object") {
    const token = (data as Record<string, unknown>).token;
    if (typeof token === "string" && token.trim()) {
      return token.trim();
    }
  }

  throw new Error("توکن ورود از Map-Bilboard دریافت نشد");
}

async function loginForBillboardApiToken(
  email: string,
  password: string,
  baseUrl?: string | null
): Promise<string> {
  const loginUrl = baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/api/v1/auth/login`
    : billboardApiRoutes.authLogin();

  const response = await fetch(loginUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const raw = await response.text();
  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 422) {
      throw new Error(
        "ورود به Map-Bilboard ناموفق بود. نام کاربری و رمز ادمین billboard.pixlink.ir را در بخش «اتصال Map-Bilboard» بررسی کنید."
      );
    }

    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : raw.trim() || `خطای ${response.status} هنگام ورود به Map-Bilboard`;

    throw new Error(message);
  }

  return extractLoginToken(body);
}

export async function resolveBillboardApiToken(options?: {
  forceRefresh?: boolean;
}): Promise<string> {
  const settings = await loadMapBilboardApiSettings();
  const credentials = getBillboardApiCredentials(settings);

  if (options?.forceRefresh && credentials) {
    clearBillboardApiTokenCache();
    const token = await loginForBillboardApiToken(
      credentials.email,
      credentials.password,
      settings.baseUrl
    );
    cachedLoginToken = { value: token, fetchedAt: Date.now() };
    return token;
  }

  const staticToken = getStaticBillboardApiToken(settings);
  if (staticToken) {
    return staticToken;
  }

  if (!credentials) {
    throw new Error(
      "اتصال Map-Bilboard تنظیم نشده. از منوی «اتصال Map-Bilboard» نام کاربری و رمز ادمین را وارد کنید."
    );
  }

  if (
    cachedLoginToken &&
    Date.now() - cachedLoginToken.fetchedAt < TOKEN_CACHE_TTL_MS
  ) {
    return cachedLoginToken.value;
  }

  const token = await loginForBillboardApiToken(
    credentials.email,
    credentials.password,
    settings.baseUrl
  );
  cachedLoginToken = { value: token, fetchedAt: Date.now() };
  return token;
}

export async function formatBillboardApiError(response: Response, rawBody: string): Promise<string> {
  const settings = await loadMapBilboardApiSettings();
  let body: unknown = null;
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = null;
    }
  }

  if (response.status === 401) {
    const hasCredentials = Boolean(getBillboardApiCredentials(settings));
    const hasStaticToken = Boolean(getStaticBillboardApiToken(settings));

    if (hasStaticToken && !hasCredentials) {
      return "توکن Map-Bilboard نامعتبر است. در بخش «اتصال Map-Bilboard» توکن جدید وارد کنید.";
    }

    return "احراز هویت Map-Bilboard ناموفق بود. تنظیمات اتصال را در پنل ادمین بررسی کنید.";
  }

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }

    const errors = record.errors;
    if (errors && typeof errors === "object") {
      const first = Object.values(errors as Record<string, unknown>)[0];
      if (Array.isArray(first) && typeof first[0] === "string") {
        return first[0];
      }
    }
  }

  return rawBody.trim() || `خطای ${response.status} از سرویس Map-Bilboard`;
}

export async function isMapBilboardApiReady(): Promise<boolean> {
  try {
    const settings = await loadMapBilboardApiSettings();
    return Boolean(getStaticBillboardApiToken(settings) || getBillboardApiCredentials(settings));
  } catch {
    return false;
  }
}
