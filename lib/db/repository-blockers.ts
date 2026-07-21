import { getSql } from "@/lib/db/client";
import type { DirectiveBlocker, DirectiveBlockerCategory } from "@/lib/types";
import { generateId } from "@/lib/utils";

function toIsoString(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asCategory(value: unknown): DirectiveBlockerCategory {
  const allowed: DirectiveBlockerCategory[] = [
    "budget",
    "approval_delay",
    "missing_file",
    "missing_capacity",
    "technical",
    "other",
  ];
  return allowed.includes(value as DirectiveBlockerCategory)
    ? (value as DirectiveBlockerCategory)
    : "other";
}

function mapBlocker(row: Record<string, unknown>): DirectiveBlocker {
  return {
    id: String(row.id),
    directiveId: String(row.directive_id),
    userId: String(row.user_id),
    userName: row.user_name ? String(row.user_name) : null,
    category: asCategory(row.category),
    note: String(row.note ?? ""),
    createdAt: toIsoString(row.created_at),
  };
}

export async function ensureDirectiveBlockerSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS directive_blockers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      directive_id UUID NOT NULL REFERENCES campaign_directives(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export async function pgListDirectiveBlockers(directiveId: string): Promise<DirectiveBlocker[]> {
  const sql = getSql();
  await ensureDirectiveBlockerSchema();
  const rows = await sql`
    SELECT b.*, u.name AS user_name
    FROM directive_blockers b
    LEFT JOIN users u ON u.id = b.user_id
    WHERE b.directive_id = ${directiveId}
    ORDER BY b.created_at DESC
  `;
  return rows.map((row) => mapBlocker(row as Record<string, unknown>));
}

export async function pgCreateDirectiveBlocker(input: {
  directiveId: string;
  userId: string;
  category: DirectiveBlockerCategory;
  note?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureDirectiveBlockerSchema();
  const id = generateId();
  const note = input.note?.trim() || "";
  try {
    await sql`
      INSERT INTO directive_blockers (id, directive_id, user_id, category, note, created_at)
      VALUES (${id}, ${input.directiveId}, ${input.userId}, ${input.category}, ${note}, now())
    `;
    return { success: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ثبت مانع ناموفق بود";
    return { success: false, error: message };
  }
}
