import { getSql } from "@/lib/db/client";
import { isPostgresConfigured } from "@/lib/utils";
import type {
  CreateProblemReportInput,
  ProblemReport,
  ProblemReportStats,
  ProblemReportStatus,
} from "@/lib/audit/problem-types";

function mapReportRow(row: Record<string, unknown>): ProblemReport {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id: String(row.id),
    reporterUserId: row.reporter_user_id ? String(row.reporter_user_id) : null,
    reporterType: (row.reporter_type as ProblemReport["reporterType"]) ?? "db_user",
    reporterEmail: row.reporter_email ? String(row.reporter_email) : null,
    reporterName: row.reporter_name ? String(row.reporter_name) : null,
    reporterRole: row.reporter_role ? String(row.reporter_role) : null,
    category: row.category as ProblemReport["category"],
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    path: row.path ? String(row.path) : null,
    campaignId: row.campaign_id ? String(row.campaign_id) : null,
    status: row.status as ProblemReportStatus,
    adminNote: row.admin_note ? String(row.admin_note) : null,
    repliedAt: row.replied_at ? new Date(String(row.replied_at)).toISOString() : null,
    resolvedByUserId: row.resolved_by_user_id ? String(row.resolved_by_user_id) : null,
    resolvedAt: row.resolved_at ? new Date(String(row.resolved_at)).toISOString() : null,
    metadata,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function pgInsertProblemReport(input: {
  reporterUserId?: string | null;
  reporterType: ProblemReport["reporterType"];
  reporterEmail?: string | null;
  reporterName?: string | null;
  reporterRole?: string | null;
  category: CreateProblemReportInput["category"];
  title: string;
  description: string;
  path?: string | null;
  campaignId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ProblemReport | null> {
  if (!isPostgresConfigured()) return null;

  const sql = getSql();
  const rows = await sql`
    INSERT INTO user_problem_reports (
      reporter_user_id,
      reporter_type,
      reporter_email,
      reporter_name,
      reporter_role,
      category,
      title,
      description,
      path,
      campaign_id,
      metadata
    ) VALUES (
      ${input.reporterUserId ?? null},
      ${input.reporterType},
      ${input.reporterEmail ?? null},
      ${input.reporterName ?? null},
      ${input.reporterRole ?? null},
      ${input.category},
      ${input.title},
      ${input.description},
      ${input.path ?? null},
      ${input.campaignId ?? null},
      ${sql.json(JSON.parse(JSON.stringify(input.metadata ?? {})))}
    )
    RETURNING *
  `;

  return rows[0] ? mapReportRow(rows[0] as Record<string, unknown>) : null;
}

export async function pgListProblemReports(options?: {
  status?: ProblemReportStatus;
  limit?: number;
}): Promise<ProblemReport[]> {
  if (!isPostgresConfigured()) return [];

  const sql = getSql();
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 300);
  const status = options?.status ?? null;

  const rows = await sql`
    SELECT *
    FROM user_problem_reports
    WHERE (${status}::text IS NULL OR status = ${status})
    ORDER BY
      CASE status
        WHEN 'pending' THEN 0
        WHEN 'in_progress' THEN 1
        WHEN 'resolved' THEN 2
        ELSE 3
      END,
      created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => mapReportRow(row as Record<string, unknown>));
}

export async function pgCountOpenProblemReports(): Promise<number> {
  if (!isPostgresConfigured()) return 0;

  const sql = getSql();
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM user_problem_reports
    WHERE status IN ('pending', 'in_progress')
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function pgGetProblemReportStats(): Promise<ProblemReportStats> {
  if (!isPostgresConfigured()) {
    return {
      total: 0,
      open: 0,
      pending: 0,
      inProgress: 0,
      answered: 0,
      resolved: 0,
      dismissed: 0,
      avgReplyMinutes: null,
    };
  }

  const sql = getSql();
  const rows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress'))::int AS open,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE admin_note IS NOT NULL AND btrim(admin_note) <> '')::int AS answered,
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
      COUNT(*) FILTER (WHERE status = 'dismissed')::int AS dismissed,
      AVG(
        EXTRACT(EPOCH FROM (replied_at - created_at)) / 60.0
      ) FILTER (WHERE replied_at IS NOT NULL) AS avg_reply_minutes
    FROM user_problem_reports
  `;

  const row = rows[0] as Record<string, unknown> | undefined;
  const avgRaw = row?.avg_reply_minutes;
  const avgReplyMinutes =
    avgRaw == null || avgRaw === ""
      ? null
      : Math.max(0, Math.round(Number(avgRaw)));

  return {
    total: Number(row?.total ?? 0),
    open: Number(row?.open ?? 0),
    pending: Number(row?.pending ?? 0),
    inProgress: Number(row?.in_progress ?? 0),
    answered: Number(row?.answered ?? 0),
    resolved: Number(row?.resolved ?? 0),
    dismissed: Number(row?.dismissed ?? 0),
    avgReplyMinutes: Number.isFinite(avgReplyMinutes) ? avgReplyMinutes : null,
  };
}

export async function pgListProblemReportsByReporter(options: {
  reporterUserId?: string | null;
  reporterType?: ProblemReport["reporterType"] | null;
  limit?: number;
}): Promise<ProblemReport[]> {
  if (!isPostgresConfigured()) return [];

  const reporterUserId = options.reporterUserId?.trim() || null;
  const reporterType = options.reporterType ?? null;
  if (!reporterUserId && !reporterType) return [];

  const sql = getSql();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);

  const rows = await sql`
    SELECT *
    FROM user_problem_reports
    WHERE
      (
        ${reporterUserId}::uuid IS NOT NULL
        AND reporter_user_id = ${reporterUserId}::uuid
      )
      OR (
        ${reporterUserId}::uuid IS NULL
        AND ${reporterType}::text IS NOT NULL
        AND reporter_type = ${reporterType}
        AND reporter_user_id IS NULL
      )
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => mapReportRow(row as Record<string, unknown>));
}

export async function pgUpdateProblemReportStatus(input: {
  id: string;
  status: ProblemReportStatus;
  adminNote?: string | null;
  resolvedByUserId?: string | null;
}): Promise<ProblemReport | null> {
  if (!isPostgresConfigured()) return null;

  const sql = getSql();
  const isClosed = input.status === "resolved" || input.status === "dismissed";
  // Env admin has no users-row id; only persist FK when we have a real user UUID.
  const resolvedByUserId = isClosed && input.resolvedByUserId ? input.resolvedByUserId : null;
  const resolvedAt = isClosed ? new Date().toISOString() : null;

  try {
    if (input.adminNote !== undefined) {
      const adminNote = input.adminNote?.trim() || null;
      const rows = await sql`
        UPDATE user_problem_reports
        SET
          status = ${input.status},
          admin_note = ${adminNote},
          replied_at = CASE
            WHEN ${adminNote}::text IS NOT NULL
              AND (replied_at IS NULL)
            THEN now()
            ELSE replied_at
          END,
          resolved_by_user_id = ${resolvedByUserId},
          resolved_at = ${resolvedAt},
          updated_at = now()
        WHERE id = ${input.id}::uuid
        RETURNING *
      `;
      return rows[0] ? mapReportRow(rows[0] as Record<string, unknown>) : null;
    }

    const rows = await sql`
      UPDATE user_problem_reports
      SET
        status = ${input.status},
        resolved_by_user_id = ${resolvedByUserId},
        resolved_at = ${resolvedAt},
        updated_at = now()
      WHERE id = ${input.id}::uuid
      RETURNING *
    `;
    return rows[0] ? mapReportRow(rows[0] as Record<string, unknown>) : null;
  } catch (error) {
    console.error("pgUpdateProblemReportStatus failed:", error);
    throw error;
  }
}

export async function pgUpdateProblemReportAdminNote(input: {
  id: string;
  adminNote: string;
  /** When true, pending reports move to in_progress. */
  markInProgressIfPending?: boolean;
}): Promise<ProblemReport | null> {
  if (!isPostgresConfigured()) return null;

  const sql = getSql();
  const adminNote = input.adminNote.trim();
  if (!adminNote) return null;

  try {
    const rows = await sql`
      UPDATE user_problem_reports
      SET
        admin_note = ${adminNote},
        replied_at = CASE
          WHEN replied_at IS NULL THEN now()
          ELSE replied_at
        END,
        status = CASE
          WHEN ${input.markInProgressIfPending ?? true}
            AND status = 'pending'
          THEN 'in_progress'
          ELSE status
        END,
        updated_at = now()
      WHERE id = ${input.id}::uuid
      RETURNING *
    `;
    return rows[0] ? mapReportRow(rows[0] as Record<string, unknown>) : null;
  } catch (error) {
    console.error("pgUpdateProblemReportAdminNote failed:", error);
    throw error;
  }
}

