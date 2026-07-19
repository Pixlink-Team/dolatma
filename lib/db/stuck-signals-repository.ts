import { getSql } from "@/lib/db/client";
import { isPostgresConfigured } from "@/lib/utils";
import type { RecentUserError, StuckBehaviorSignal } from "@/lib/audit/problem-types";

/** Labels related to creating/editing/closing content (Persian + common English). */
export const CONTENT_ACTION_LABEL_REGEX =
  "(ذخیره|افزودن|ویرایش|بستن|ثبت|حذف|آپلود|ساخت|ایجاد|به‌?روزرسانی|بروزرسانی|انتشار|تأیید|تایید|کپی|جدید|ارسال|Save|Add|Edit|Delete|Upload|Create|Update|Submit|Close)";

function resolveActorName(row: Record<string, unknown>): string {
  return (
    String(row.user_name ?? "").trim() ||
    String(row.event_name ?? "").trim() ||
    String(row.user_email ?? "").trim() ||
    String(row.event_email ?? "").trim() ||
    "ناشناس"
  );
}

function resolveActorEmail(row: Record<string, unknown>): string | null {
  return (
    String(row.user_email ?? "").trim() ||
    String(row.event_email ?? "").trim() ||
    null
  );
}

function resolveActorRole(row: Record<string, unknown>): string | null {
  return (
    String(row.user_role ?? "").trim() ||
    String(row.event_role ?? "").trim() ||
    null
  );
}

/**
 * Detect suspicious / stuck behavior focused on content workflows:
 * - repeated clicks on save/add/edit/close/register controls
 * - repeated UI errors (toast failures)
 * - content actions combined with errors (failed saves)
 * - bursts of failed logins
 */
export async function pgGetStuckBehaviorSignals(): Promise<StuckBehaviorSignal[]> {
  if (!isPostgresConfigured()) return [];

  const sql = getSql();
  const signals: StuckBehaviorSignal[] = [];
  const contentLabelPattern = CONTENT_ACTION_LABEL_REGEX;

  const contentClickRows = await sql`
    WITH click_groups AS (
      SELECT
        COALESCE(e.actor_user_id::text, NULLIF(e.actor_email, ''), NULLIF(e.actor_name, ''), 'unknown') AS actor_key,
        e.actor_user_id,
        NULLIF(MAX(e.actor_name), '') AS event_name,
        NULLIF(MAX(e.actor_email), '') AS event_email,
        NULLIF(MAX(e.actor_role), '') AS event_role,
        MAX(u.name) AS user_name,
        MAX(u.email) AS user_email,
        MAX(u.role) AS user_role,
        COALESCE(NULLIF(e.label, ''), '(بدون برچسب)') AS click_label,
        MAX(e.path) AS path,
        COUNT(*)::int AS click_count,
        MIN(e.created_at) AS first_seen_at,
        MAX(e.created_at) AS last_seen_at
      FROM user_audit_events e
      LEFT JOIN users u ON u.id = e.actor_user_id
      WHERE e.action = 'ui.click'
        AND e.created_at >= now() - interval '20 minutes'
        AND (
          (e.metadata->>'contentAction') = 'true'
          OR e.label ~* ${contentLabelPattern}
        )
      GROUP BY
        COALESCE(e.actor_user_id::text, NULLIF(e.actor_email, ''), NULLIF(e.actor_name, ''), 'unknown'),
        e.actor_user_id,
        COALESCE(NULLIF(e.label, ''), '(بدون برچسب)')
      HAVING COUNT(*) >= 4
    )
    SELECT * FROM click_groups
    ORDER BY click_count DESC
    LIMIT 25
  `;

  for (const row of contentClickRows) {
    const count = Number(row.click_count ?? 0);
    const severity = count >= 12 ? "high" : count >= 7 ? "medium" : "low";
    const label = String(row.click_label);
    signals.push({
      id: `content_click:${row.actor_key}:${label}`,
      kind: "repeated_content_action",
      severity,
      actorKey: String(row.actor_key),
      actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
      actorName: resolveActorName(row as Record<string, unknown>),
      actorEmail: resolveActorEmail(row as Record<string, unknown>),
      actorRole: resolveActorRole(row as Record<string, unknown>),
      title: "تکرار کلیک روی ذخیره / ثبت محتوا",
      detail: `در ۲۰ دقیقه اخیر ${count} بار روی «${label}» کلیک کرده است — احتمالاً ذخیره انجام نشده یا دکمه گیر کرده.`,
      path: row.path ? String(row.path) : null,
      label,
      count,
      windowMinutes: 20,
      firstSeenAt: new Date(String(row.first_seen_at)).toISOString(),
      lastSeenAt: new Date(String(row.last_seen_at)).toISOString(),
    });
  }

  const errorRows = await sql`
    WITH error_groups AS (
      SELECT
        COALESCE(e.actor_user_id::text, NULLIF(e.actor_email, ''), NULLIF(e.actor_name, ''), 'unknown') AS actor_key,
        e.actor_user_id,
        NULLIF(MAX(e.actor_name), '') AS event_name,
        NULLIF(MAX(e.actor_email), '') AS event_email,
        NULLIF(MAX(e.actor_role), '') AS event_role,
        MAX(u.name) AS user_name,
        MAX(u.email) AS user_email,
        MAX(u.role) AS user_role,
        COALESCE(NULLIF(e.label, ''), '(بدون پیام)') AS error_label,
        MAX(e.path) AS path,
        COUNT(*)::int AS error_count,
        MIN(e.created_at) AS first_seen_at,
        MAX(e.created_at) AS last_seen_at
      FROM user_audit_events e
      LEFT JOIN users u ON u.id = e.actor_user_id
      WHERE e.action = 'ui.error'
        AND e.created_at >= now() - interval '30 minutes'
      GROUP BY
        COALESCE(e.actor_user_id::text, NULLIF(e.actor_email, ''), NULLIF(e.actor_name, ''), 'unknown'),
        e.actor_user_id,
        COALESCE(NULLIF(e.label, ''), '(بدون پیام)')
      HAVING COUNT(*) >= 3
    )
    SELECT * FROM error_groups
    ORDER BY error_count DESC
    LIMIT 25
  `;

  for (const row of errorRows) {
    const count = Number(row.error_count ?? 0);
    const severity = count >= 8 ? "high" : count >= 5 ? "medium" : "low";
    const label = String(row.error_label);
    signals.push({
      id: `error:${row.actor_key}:${label}`,
      kind: "repeated_error",
      severity,
      actorKey: String(row.actor_key),
      actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
      actorName: resolveActorName(row as Record<string, unknown>),
      actorEmail: resolveActorEmail(row as Record<string, unknown>),
      actorRole: resolveActorRole(row as Record<string, unknown>),
      title: "خطای تکراری برای کاربر",
      detail: `در ۳۰ دقیقه اخیر ${count} بار پیام خطا «${label}» دیده است.`,
      path: row.path ? String(row.path) : null,
      label,
      count,
      windowMinutes: 30,
      firstSeenAt: new Date(String(row.first_seen_at)).toISOString(),
      lastSeenAt: new Date(String(row.last_seen_at)).toISOString(),
    });
  }

  const comboRows = await sql`
    WITH actors AS (
      SELECT
        COALESCE(e.actor_user_id::text, NULLIF(e.actor_email, ''), NULLIF(e.actor_name, ''), 'unknown') AS actor_key,
        e.actor_user_id,
        NULLIF(MAX(e.actor_name), '') AS event_name,
        NULLIF(MAX(e.actor_email), '') AS event_email,
        NULLIF(MAX(e.actor_role), '') AS event_role,
        MAX(u.name) AS user_name,
        MAX(u.email) AS user_email,
        MAX(u.role) AS user_role,
        COUNT(*) FILTER (
          WHERE e.action = 'ui.click'
            AND (
              (e.metadata->>'contentAction') = 'true'
              OR e.label ~* ${contentLabelPattern}
            )
        )::int AS content_clicks,
        COUNT(*) FILTER (WHERE e.action = 'ui.error')::int AS error_count,
        MAX(e.path) FILTER (WHERE e.action = 'ui.error') AS path,
        MAX(e.label) FILTER (WHERE e.action = 'ui.error') AS last_error,
        MIN(e.created_at) AS first_seen_at,
        MAX(e.created_at) AS last_seen_at
      FROM user_audit_events e
      LEFT JOIN users u ON u.id = e.actor_user_id
      WHERE e.created_at >= now() - interval '20 minutes'
        AND e.action IN ('ui.click', 'ui.error')
      GROUP BY
        COALESCE(e.actor_user_id::text, NULLIF(e.actor_email, ''), NULLIF(e.actor_name, ''), 'unknown'),
        e.actor_user_id
      HAVING
        COUNT(*) FILTER (
          WHERE e.action = 'ui.click'
            AND (
              (e.metadata->>'contentAction') = 'true'
              OR e.label ~* ${contentLabelPattern}
            )
        ) >= 3
        AND COUNT(*) FILTER (WHERE e.action = 'ui.error') >= 2
    )
    SELECT * FROM actors
    ORDER BY error_count DESC, content_clicks DESC
    LIMIT 20
  `;

  for (const row of comboRows) {
    const contentClicks = Number(row.content_clicks ?? 0);
    const errorCount = Number(row.error_count ?? 0);
    const severity =
      errorCount >= 5 || contentClicks >= 8 ? "high" : errorCount >= 3 ? "medium" : "low";
    const lastError = row.last_error ? String(row.last_error) : null;
    signals.push({
      id: `combo:${row.actor_key}`,
      kind: "content_action_with_errors",
      severity,
      actorKey: String(row.actor_key),
      actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
      actorName: resolveActorName(row as Record<string, unknown>),
      actorEmail: resolveActorEmail(row as Record<string, unknown>),
      actorRole: resolveActorRole(row as Record<string, unknown>),
      title: "ذخیره / ثبت ناموفق همراه با خطا",
      detail: `در ۲۰ دقیقه اخیر ${contentClicks} بار اقدام محتوایی و ${errorCount} خطا داشته است${
        lastError ? ` — آخرین خطا: «${lastError}»` : ""
      }.`,
      path: row.path ? String(row.path) : null,
      label: lastError,
      count: contentClicks + errorCount,
      windowMinutes: 20,
      firstSeenAt: new Date(String(row.first_seen_at)).toISOString(),
      lastSeenAt: new Date(String(row.last_seen_at)).toISOString(),
    });
  }

  const failedLoginRows = await sql`
    WITH fail_groups AS (
      SELECT
        COALESCE(NULLIF(e.actor_email, ''), NULLIF(e.actor_name, ''), 'unknown') AS actor_key,
        NULL AS actor_user_id,
        NULLIF(MAX(e.actor_name), '') AS event_name,
        NULLIF(MAX(e.actor_email), '') AS event_email,
        NULLIF(MAX(e.actor_role), '') AS event_role,
        NULL::text AS user_name,
        NULL::text AS user_email,
        NULL::text AS user_role,
        COUNT(*)::int AS fail_count,
        MIN(e.created_at) AS first_seen_at,
        MAX(e.created_at) AS last_seen_at
      FROM user_audit_events e
      WHERE e.action = 'auth.login_failed'
        AND e.created_at >= now() - interval '30 minutes'
      GROUP BY COALESCE(NULLIF(e.actor_email, ''), NULLIF(e.actor_name, ''), 'unknown')
      HAVING COUNT(*) >= 3
    )
    SELECT * FROM fail_groups
    ORDER BY fail_count DESC
    LIMIT 15
  `;

  for (const row of failedLoginRows) {
    const count = Number(row.fail_count ?? 0);
    const severity = count >= 8 ? "high" : count >= 5 ? "medium" : "low";
    const email = resolveActorEmail(row as Record<string, unknown>);
    signals.push({
      id: `login_fail:${row.actor_key}`,
      kind: "failed_login_burst",
      severity,
      actorKey: String(row.actor_key),
      actorUserId: null,
      actorName: email || resolveActorName(row as Record<string, unknown>),
      actorEmail: email,
      actorRole: null,
      title: "ورود ناموفق پیاپی",
      detail: `در ۳۰ دقیقه اخیر ${count} بار ورود ناموفق داشته است — ممکن است رمز را فراموش کرده یا حساب مشکل داشته باشد.`,
      path: "/admin/login",
      label: null,
      count,
      windowMinutes: 30,
      firstSeenAt: new Date(String(row.first_seen_at)).toISOString(),
      lastSeenAt: new Date(String(row.last_seen_at)).toISOString(),
    });
  }

  // Prefer combo signals over overlapping pure click/error rows for the same actor.
  const comboActorKeys = new Set(
    signals.filter((s) => s.kind === "content_action_with_errors").map((s) => s.actorKey)
  );
  const deduped = signals.filter((signal) => {
    if (
      comboActorKeys.has(signal.actorKey) &&
      (signal.kind === "repeated_content_action" || signal.kind === "repeated_error")
    ) {
      return false;
    }
    return true;
  });

  const severityRank = { high: 0, medium: 1, low: 2 } as const;
  return deduped.sort((a, b) => {
    const bySeverity = severityRank[a.severity] - severityRank[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
  });
}

export async function pgListRecentUserErrors(limit = 40): Promise<RecentUserError[]> {
  if (!isPostgresConfigured()) return [];

  const sql = getSql();
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const rows = await sql`
    SELECT
      e.id,
      COALESCE(e.actor_user_id::text, NULLIF(e.actor_email, ''), NULLIF(e.actor_name, ''), 'unknown') AS actor_key,
      e.actor_user_id,
      COALESCE(NULLIF(u.name, ''), NULLIF(e.actor_name, ''), NULLIF(u.email, ''), NULLIF(e.actor_email, ''), 'ناشناس') AS actor_name,
      COALESCE(NULLIF(u.email, ''), NULLIF(e.actor_email, '')) AS actor_email,
      COALESCE(NULLIF(u.role, ''), NULLIF(e.actor_role, '')) AS actor_role,
      COALESCE(NULLIF(e.label, ''), 'خطا') AS message,
      e.path,
      e.created_at
    FROM user_audit_events e
    LEFT JOIN users u ON u.id = e.actor_user_id
    WHERE e.action = 'ui.error'
      AND e.created_at >= now() - interval '24 hours'
    ORDER BY e.created_at DESC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    id: String(row.id),
    actorKey: String(row.actor_key),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    actorName: String(row.actor_name ?? "ناشناس"),
    actorEmail: row.actor_email ? String(row.actor_email) : null,
    actorRole: row.actor_role ? String(row.actor_role) : null,
    message: String(row.message ?? "خطا"),
    path: row.path ? String(row.path) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));
}
