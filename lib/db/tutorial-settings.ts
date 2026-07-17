import { getSql } from "@/lib/db/client";

const TUTORIALS_ENABLED_KEY = "section_tutorials_enabled";

/** When unset, tutorials stay enforced (existing production behavior). */
export async function pgAreSectionTutorialsEnabled(): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    SELECT value FROM system_settings WHERE key = ${TUTORIALS_ENABLED_KEY} LIMIT 1
  `;

  const value = rows[0]?.value;
  if (!value || typeof value !== "object") {
    return true;
  }

  const record = value as { enabled?: unknown };
  return record.enabled !== false;
}

export async function pgSetSectionTutorialsEnabled(
  enabled: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const now = new Date().toISOString();
  const payload = { enabled };

  await sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${TUTORIALS_ENABLED_KEY}, ${sql.json(payload)}, ${now})
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at
  `;

  return { success: true };
}
