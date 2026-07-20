import { getSql } from "@/lib/db/client";
import {
  DEFAULT_LOGIN_PAGE_SETTINGS,
  normalizeLoginPageSettings,
} from "@/lib/login-page-defaults";
import type { LoginPageSettings } from "@/lib/types";

export { DEFAULT_LOGIN_PAGE_SETTINGS, normalizeLoginPageSettings } from "@/lib/login-page-defaults";

const LOGIN_PAGE_SETTINGS_KEY = "login_page";

export async function pgGetLoginPageSettings(): Promise<LoginPageSettings> {
  const sql = getSql();
  const rows = await sql`
    SELECT value FROM system_settings WHERE key = ${LOGIN_PAGE_SETTINGS_KEY} LIMIT 1
  `;

  if (!rows[0]?.value) {
    return { ...DEFAULT_LOGIN_PAGE_SETTINGS };
  }

  return normalizeLoginPageSettings(rows[0].value);
}

export async function pgSaveLoginPageSettings(
  data: Partial<LoginPageSettings>
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const existing = await pgGetLoginPageSettings();
  const now = new Date().toISOString();

  const next = normalizeLoginPageSettings({
    eyebrow: data.eyebrow ?? existing.eyebrow,
    title: data.title ?? existing.title,
    subtitle: data.subtitle ?? existing.subtitle,
    footer: data.footer ?? existing.footer,
  });

  await sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${LOGIN_PAGE_SETTINGS_KEY}, ${sql.json(JSON.parse(JSON.stringify(next)))}, ${now})
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at
  `;

  return { success: true };
}
