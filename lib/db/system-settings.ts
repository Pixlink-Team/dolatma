import { getSql } from "@/lib/db/client";
import type { MapBilboardApiSettings, MapBilboardApiSettingsPublic } from "@/lib/types";

const MAP_BILBOARD_SETTINGS_KEY = "map_bilboard_api";
const DEFAULT_BASE_URL = "https://billboard.pixlink.ir";

function normalizeSettings(value: unknown): MapBilboardApiSettings {
  if (!value || typeof value !== "object") {
    return {};
  }

  const record = value as Partial<MapBilboardApiSettings>;
  return {
    baseUrl: record.baseUrl?.trim() || null,
    email: record.email?.trim() || null,
    password: record.password?.trim() || null,
    token: record.token?.trim() || null,
  };
}

export function isMapBilboardApiConfigured(settings: MapBilboardApiSettings): boolean {
  const token = settings.token?.trim();
  if (token && token !== "your-service-token") {
    return true;
  }

  return Boolean(settings.email?.trim() && settings.password?.trim());
}

export function toPublicMapBilboardSettings(
  settings: MapBilboardApiSettings
): MapBilboardApiSettingsPublic {
  const token = settings.token?.trim();
  const hasToken = Boolean(token && token !== "your-service-token");

  return {
    baseUrl: settings.baseUrl?.trim() || DEFAULT_BASE_URL,
    email: settings.email?.trim() ?? "",
    hasPassword: Boolean(settings.password?.trim()),
    hasToken,
    configured: isMapBilboardApiConfigured(settings),
  };
}

export async function pgGetMapBilboardApiSettings(): Promise<MapBilboardApiSettings> {
  const sql = getSql();
  const rows = await sql`
    SELECT value FROM system_settings WHERE key = ${MAP_BILBOARD_SETTINGS_KEY} LIMIT 1
  `;

  if (!rows[0]?.value) {
    return {};
  }

  return normalizeSettings(rows[0].value);
}

export async function pgSaveMapBilboardApiSettings(
  data: Partial<MapBilboardApiSettings>
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const existing = await pgGetMapBilboardApiSettings();
  const now = new Date().toISOString();

  const next: MapBilboardApiSettings = {
    baseUrl: data.baseUrl?.trim() || existing.baseUrl || null,
    email: data.email?.trim() || existing.email || null,
    password: data.password?.trim() ? data.password.trim() : existing.password || null,
    token: data.token?.trim() ? data.token.trim() : existing.token || null,
  };

  if (data.token === "") {
    next.token = null;
  }

  if (data.password === "") {
    next.password = null;
  }

  await sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${MAP_BILBOARD_SETTINGS_KEY}, ${sql.json(JSON.parse(JSON.stringify(next)))}, ${now})
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at
  `;

  return { success: true };
}
