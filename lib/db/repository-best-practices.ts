import { getSql } from "@/lib/db/client";
import type { BestPractice, BestPracticeStatus, ScoreableContentType } from "@/lib/types";
import { generateId } from "@/lib/utils";

const SCOREABLE: ScoreableContentType[] = [
  "billboard",
  "poster",
  "video",
  "file",
  "raw_media",
  "social_post",
  "site_publication",
  "activity",
  "broadcast",
  "meeting",
];

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asContentType(value: unknown): ScoreableContentType {
  return SCOREABLE.includes(value as ScoreableContentType)
    ? (value as ScoreableContentType)
    : "activity";
}

function asStatus(value: unknown): BestPracticeStatus {
  if (value === "approved" || value === "rejected" || value === "pending") return value;
  return "pending";
}

function mapBestPractice(row: Record<string, unknown>): BestPractice {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    contentType: asContentType(row.content_type),
    contentId: String(row.content_id),
    title: String(row.title ?? ""),
    suggestedScore:
      row.suggested_score != null && Number.isFinite(Number(row.suggested_score))
        ? Number(row.suggested_score)
        : null,
    status: asStatus(row.status),
    suggestedBy: row.suggested_by ? String(row.suggested_by) : null,
    suggestedByName: row.suggested_by_name ? String(row.suggested_by_name) : null,
    approvedBy: row.approved_by ? String(row.approved_by) : null,
    approvedByName: row.approved_by_name ? String(row.approved_by_name) : null,
    approvedAt: toIsoString(row.approved_at),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

export async function ensureBestPracticesSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS best_practices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
      content_type TEXT NOT NULL,
      content_id UUID NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      suggested_score DOUBLE PRECISION,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
      suggested_by UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (campaign_id, content_type, content_id)
    )
  `;
}

export async function pgListBestPractices(
  campaignId: string,
  status?: BestPracticeStatus | "all"
): Promise<BestPractice[]> {
  const sql = getSql();
  await ensureBestPracticesSchema();
  const statusFilter = status && status !== "all" ? status : null;
  const rows = await sql`
    SELECT
      bp.*,
      su.name AS suggested_by_name,
      au.name AS approved_by_name
    FROM best_practices bp
    LEFT JOIN users su ON su.id = bp.suggested_by
    LEFT JOIN users au ON au.id = bp.approved_by
    WHERE bp.campaign_id = ${campaignId}
      AND (${statusFilter}::text IS NULL OR bp.status = ${statusFilter})
    ORDER BY
      CASE bp.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
      bp.created_at DESC
  `;
  return rows.map((row) => mapBestPractice(row as Record<string, unknown>));
}

export async function pgSuggestBestPractice(input: {
  campaignId: string;
  contentType: ScoreableContentType;
  contentId: string;
  title: string;
  suggestedScore?: number | null;
  suggestedBy: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  await ensureBestPracticesSchema();
  const id = generateId();
  const title = input.title.trim() || "بدون عنوان";
  try {
    const existing = await sql`
      SELECT id, status FROM best_practices
      WHERE campaign_id = ${input.campaignId}
        AND content_type = ${input.contentType}
        AND content_id = ${input.contentId}
      LIMIT 1
    `;
    if (existing[0]) {
      const existingId = String(existing[0].id);
      if (String(existing[0].status) === "approved") {
        return { success: false, error: "این مورد قبلاً در کتابخانه تأیید شده است" };
      }
      await sql`
        UPDATE best_practices SET
          title = ${title},
          suggested_score = ${input.suggestedScore ?? null},
          status = 'pending',
          suggested_by = ${input.suggestedBy},
          approved_by = NULL,
          approved_at = NULL
        WHERE id = ${existingId}
      `;
      return { success: true, id: existingId };
    }
    await sql`
      INSERT INTO best_practices (
        id, campaign_id, content_type, content_id, title, suggested_score,
        status, suggested_by, created_at
      )
      VALUES (
        ${id}, ${input.campaignId}, ${input.contentType}, ${input.contentId},
        ${title}, ${input.suggestedScore ?? null}, 'pending', ${input.suggestedBy}, now()
      )
    `;
    return { success: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ثبت پیشنهاد ناموفق بود";
    return { success: false, error: message };
  }
}

export async function pgSetBestPracticeStatus(input: {
  id: string;
  status: "approved" | "rejected";
  approvedBy: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  await ensureBestPracticesSchema();
  const now = new Date().toISOString();
  const rows = await sql`
    UPDATE best_practices SET
      status = ${input.status},
      approved_by = ${input.approvedBy},
      approved_at = ${now}
    WHERE id = ${input.id}
    RETURNING id
  `;
  if (rows.length === 0) return { success: false, error: "مورد یافت نشد" };
  return { success: true };
}

export async function pgListHighScoreSuggestions(campaignId: string, minScore = 8) {
  const sql = getSql();
  await ensureBestPracticesSchema();

  const rows = await sql`
    WITH scored AS (
      SELECT 'billboard'::text AS content_type, id, title, score
      FROM billboards WHERE campaign_id = ${campaignId} AND score IS NOT NULL AND score >= ${minScore}
      UNION ALL
      SELECT 'poster', id, title, score
      FROM posters WHERE campaign_id = ${campaignId} AND score IS NOT NULL AND score >= ${minScore}
      UNION ALL
      SELECT 'video', id, title, score
      FROM videos WHERE campaign_id = ${campaignId} AND score IS NOT NULL AND score >= ${minScore}
      UNION ALL
      SELECT 'activity', id, title, score
      FROM campaign_activities WHERE campaign_id = ${campaignId} AND score IS NOT NULL AND score >= ${minScore}
      UNION ALL
      SELECT 'social_post', id, title, score
      FROM social_media_posts WHERE campaign_id = ${campaignId} AND score IS NOT NULL AND score >= ${minScore}
    )
    SELECT s.*
    FROM scored s
    LEFT JOIN best_practices bp
      ON bp.campaign_id = ${campaignId}
      AND bp.content_type = s.content_type
      AND bp.content_id = s.id
      AND bp.status IN ('pending', 'approved')
    WHERE bp.id IS NULL
    ORDER BY s.score DESC
    LIMIT 50
  `;

  return rows.map((row) => ({
    contentType: asContentType(row.content_type),
    contentId: String(row.id),
    title: String(row.title ?? ""),
    score: Number(row.score),
  }));
}
