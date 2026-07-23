import { getSql } from "@/lib/db/client";
import {
  contentFormSectionLabels,
  defaultContentFormFields,
  isContentFormSectionKey,
  normalizeContentFormFields,
} from "@/lib/section-content-forms";
import type {
  ContentFormField,
  ContentFormSectionKey,
  SectionContentForm,
} from "@/lib/types";

let schemaReady: Promise<void> | null = null;

export async function ensureSectionContentFormsSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS section_content_forms (
          section_key TEXT PRIMARY KEY,
          title TEXT NOT NULL DEFAULT '',
          fields JSONB NOT NULL DEFAULT '[]'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        ALTER TABLE posters
          ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      `;
      await sql`
        ALTER TABLE billboards
          ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function mapFormFromDb(row: Record<string, unknown>): SectionContentForm | null {
  const sectionKey = row.section_key;
  if (!isContentFormSectionKey(sectionKey)) return null;

  return {
    sectionKey,
    title: String(row.title ?? contentFormSectionLabels[sectionKey]),
    fields: normalizeContentFormFields(row.fields, sectionKey),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function pgListSectionContentForms(): Promise<SectionContentForm[]> {
  await ensureSectionContentFormsSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT section_key, title, fields, updated_at
    FROM section_content_forms
    ORDER BY section_key
  `;

  const byKey = new Map<ContentFormSectionKey, SectionContentForm>();
  for (const row of rows) {
    const mapped = mapFormFromDb(row as Record<string, unknown>);
    if (mapped) byKey.set(mapped.sectionKey, mapped);
  }

  return (["posters", "billboards"] as const).map(
    (sectionKey) =>
      byKey.get(sectionKey) ?? {
        sectionKey,
        title: contentFormSectionLabels[sectionKey],
        fields: defaultContentFormFields(sectionKey),
        updatedAt: new Date().toISOString(),
      }
  );
}

export async function pgGetSectionContentForm(
  sectionKey: ContentFormSectionKey
): Promise<SectionContentForm> {
  await ensureSectionContentFormsSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT section_key, title, fields, updated_at
    FROM section_content_forms
    WHERE section_key = ${sectionKey}
    LIMIT 1
  `;

  if (!rows[0]) {
    return {
      sectionKey,
      title: contentFormSectionLabels[sectionKey],
      fields: defaultContentFormFields(sectionKey),
      updatedAt: new Date().toISOString(),
    };
  }

  return (
    mapFormFromDb(rows[0] as Record<string, unknown>) ?? {
      sectionKey,
      title: contentFormSectionLabels[sectionKey],
      fields: defaultContentFormFields(sectionKey),
      updatedAt: new Date().toISOString(),
    }
  );
}

export async function pgSaveSectionContentForm(input: {
  sectionKey: ContentFormSectionKey;
  title: string;
  fields: ContentFormField[];
}): Promise<{ success: true; form: SectionContentForm } | { success: false; error: string }> {
  await ensureSectionContentFormsSchema();
  const sql = getSql();
  const now = new Date().toISOString();
  const fields = normalizeContentFormFields(input.fields, input.sectionKey);
  const title = input.title.trim() || contentFormSectionLabels[input.sectionKey];

  await sql`
    INSERT INTO section_content_forms (section_key, title, fields, updated_at)
    VALUES (
      ${input.sectionKey},
      ${title},
      ${sql.json(JSON.parse(JSON.stringify(fields)))},
      ${now}
    )
    ON CONFLICT (section_key) DO UPDATE SET
      title = EXCLUDED.title,
      fields = EXCLUDED.fields,
      updated_at = EXCLUDED.updated_at
  `;

  return {
    success: true,
    form: {
      sectionKey: input.sectionKey,
      title,
      fields,
      updatedAt: now,
    },
  };
}
