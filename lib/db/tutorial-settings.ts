import { getSql } from "@/lib/db/client";
import {
  TUTORIAL_SECTION_KEYS,
  type TutorialSectionKey,
} from "@/lib/section-tutorials";

const TUTORIALS_ENABLED_KEY = "section_tutorials_enabled";

type TutorialEnabledSettings = {
  /** Legacy global flag. Kept for backwards compatibility with older saves. */
  enabled?: boolean;
  /** Per-section overrides. Missing keys fall back to the legacy global default. */
  sections?: Partial<Record<TutorialSectionKey, boolean>>;
};

function legacyGlobalDefault(value: TutorialEnabledSettings | null): boolean {
  if (!value) return true;
  return value.enabled !== false;
}

function parseSectionsMap(
  value: TutorialEnabledSettings | null
): Partial<Record<TutorialSectionKey, boolean>> {
  if (!value?.sections || typeof value.sections !== "object") {
    return {};
  }

  const record = value.sections as Record<string, unknown>;
  const result: Partial<Record<TutorialSectionKey, boolean>> = {};

  for (const key of TUTORIAL_SECTION_KEYS) {
    if (typeof record[key] === "boolean") {
      result[key] = record[key];
    }
  }

  return result;
}

async function readSettings(): Promise<TutorialEnabledSettings | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT value FROM system_settings WHERE key = ${TUTORIALS_ENABLED_KEY} LIMIT 1
  `;

  const value = rows[0]?.value;
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    enabled: typeof record.enabled === "boolean" ? record.enabled : undefined,
    sections: parseSectionsMap({
      sections:
        record.sections && typeof record.sections === "object"
          ? (record.sections as Partial<Record<TutorialSectionKey, boolean>>)
          : undefined,
    }),
  };
}

async function writeSettings(
  payload: {
    enabled: boolean;
    sections: Record<TutorialSectionKey, boolean>;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const now = new Date().toISOString();

  await sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${TUTORIALS_ENABLED_KEY}, ${sql.json(payload)}, ${now})
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at
  `;

  return { success: true };
}

/** When unset, tutorials stay enforced (existing production behavior). */
export async function pgIsSectionTutorialEnabled(
  sectionKey: TutorialSectionKey
): Promise<boolean> {
  const settings = await readSettings();
  const sections = parseSectionsMap(settings);

  if (typeof sections[sectionKey] === "boolean") {
    return sections[sectionKey];
  }

  return legacyGlobalDefault(settings);
}

export async function pgGetSectionTutorialsEnabledMap(): Promise<
  Record<TutorialSectionKey, boolean>
> {
  const settings = await readSettings();
  const sections = parseSectionsMap(settings);
  const fallback = legacyGlobalDefault(settings);
  const result = {} as Record<TutorialSectionKey, boolean>;

  for (const key of TUTORIAL_SECTION_KEYS) {
    result[key] = typeof sections[key] === "boolean" ? sections[key] : fallback;
  }

  return result;
}

export async function pgSetSectionTutorialEnabled(
  sectionKey: TutorialSectionKey,
  enabled: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const settings = await readSettings();
  const sections = parseSectionsMap(settings);
  const fallback = legacyGlobalDefault(settings);

  // Materialize every section so a legacy global `enabled: false` does not
  // keep newly toggled sections stuck behind the old default.
  const nextSections = {} as Record<TutorialSectionKey, boolean>;
  for (const key of TUTORIAL_SECTION_KEYS) {
    nextSections[key] =
      typeof sections[key] === "boolean" ? sections[key]! : fallback;
  }
  nextSections[sectionKey] = enabled;

  return writeSettings({
    enabled: Object.values(nextSections).some(Boolean),
    sections: nextSections,
  });
}

/** @deprecated Prefer pgIsSectionTutorialEnabled / pgGetSectionTutorialsEnabledMap */
export async function pgAreSectionTutorialsEnabled(): Promise<boolean> {
  const map = await pgGetSectionTutorialsEnabledMap();
  return Object.values(map).some(Boolean);
}

/** @deprecated Prefer pgSetSectionTutorialEnabled */
export async function pgSetSectionTutorialsEnabled(
  enabled: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const sections = {} as Record<TutorialSectionKey, boolean>;
  for (const key of TUTORIAL_SECTION_KEYS) {
    sections[key] = enabled;
  }

  return writeSettings({ enabled, sections });
}
