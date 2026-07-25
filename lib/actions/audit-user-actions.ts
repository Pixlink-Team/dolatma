"use server";

import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  buildPresenceSessions,
  sumSessionDurationSeconds,
  type PresenceSession,
} from "@/lib/audit/presence-sessions";
import type {
  AuditCategory,
  AuditDailyPoint,
  AuditEvent,
  AuditUserDetail,
} from "@/lib/audit/types";
import {
  pgGetAuditUserDetail,
  pgGetUserAuditDailySeries,
  pgListAuditEvents,
} from "@/lib/db/audit-repository";
import { getTehranDayBoundsIso } from "@/lib/safe-dates";
import { isPostgresConfigured } from "@/lib/utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unauthorized(): { success: false; error: string } {
  return { success: false, error: "دسترسی مجاز نیست" };
}

export async function getAuditUserDetailAction(input: {
  actorKey?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
}): Promise<{ success: boolean; error?: string; data?: AuditUserDetail }> {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) return unauthorized();
  if (!isPostgresConfigured()) {
    return { success: false, error: "دیتابیس پیکربندی نشده است" };
  }

  const actorKey = input.actorKey?.trim() || null;
  const actorUserId = input.actorUserId?.trim() || null;
  const actorEmail = input.actorEmail?.trim() || null;

  if (!actorKey && !actorUserId && !actorEmail) {
    return { success: false, error: "شناسه کاربر نامعتبر است" };
  }

  try {
    const data = await pgGetAuditUserDetail({ actorKey, actorUserId, actorEmail });
    if (!data) {
      return { success: false, error: "فعالیتی برای این کاربر یافت نشد" };
    }
    return { success: true, data };
  } catch (error) {
    console.error("getAuditUserDetailAction failed:", error);
    return { success: false, error: "بارگذاری جزئیات کاربر ناموفق بود" };
  }
}

export type UserAuditDaySummary = {
  totalEvents: number;
  logins: number;
  pageViews: number;
  clicks: number;
  contentCreates: number;
  contentUpdates: number;
  contentDeletes: number;
  contentChanges: number;
  errors: number;
  uniquePaths: number;
  onlineSeconds: number;
  sessionCount: number;
};

export type UserAuditProfileResult = {
  date: string;
  events: AuditEvent[];
  sessions: PresenceSession[];
  summary: UserAuditDaySummary;
  dailySeries: AuditDailyPoint[];
  topPaths: Array<{ path: string; count: number }>;
  topActions: Array<{ action: string; category: AuditCategory; count: number }>;
  hourlyActivity: Array<{
    hour: number;
    total: number;
    content: number;
    navigation: number;
    clicks: number;
  }>;
};

/**
 * Full Rasad profile for one user on one Tehran calendar day:
 * activity events, online sessions (from heartbeats), charts series.
 */
export async function getUserAuditProfileAction(
  input: { userId?: string | null; email?: string | null; dateIso: string } | string,
  dateIsoArg?: string
): Promise<{ ok: true; data: UserAuditProfileResult } | { ok: false; error: string }> {
  // Backward-compatible: getUserAuditProfileAction(userId, dateIso)
  const userId =
    typeof input === "string" ? input : (input.userId?.trim() || null);
  const email =
    typeof input === "string" ? null : (input.email?.trim().toLowerCase() || null);
  const dateIso = typeof input === "string" ? (dateIsoArg ?? "") : input.dateIso;

  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { ok: false, error: "دسترسی مجاز نیست." };
  }

  if (!isPostgresConfigured()) {
    return { ok: false, error: "پایگاه‌داده پیکربندی نشده است." };
  }

  const trimmedUserId = userId?.trim() || "";
  const hasUuid = Boolean(trimmedUserId && UUID_RE.test(trimmedUserId));
  if (!hasUuid && !email) {
    return { ok: false, error: "شناسه کاربر نامعتبر است." };
  }

  const bounds = getTehranDayBoundsIso(dateIso);
  if (!bounds) {
    return { ok: false, error: "تاریخ نامعتبر است." };
  }

  try {
    const [rawDayEvents, dailySeries] = await Promise.all([
      pgListAuditEvents({
        actorUserId: hasUuid ? trimmedUserId : undefined,
        actorEmail: hasUuid ? undefined : email ?? undefined,
        from: bounds.from,
        to: bounds.to,
        limit: 2000,
        excludeHeartbeat: false,
      }),
      hasUuid ? pgGetUserAuditDailySeries(trimmedUserId, 14) : Promise.resolve([]),
    ]);

    const events = rawDayEvents.filter((event) => event.action !== "presence.heartbeat");
    const presenceTimestamps = rawDayEvents.map((event) => event.createdAt);
    const sessions = buildPresenceSessions(presenceTimestamps, {
      dayEndMs: new Date(bounds.to).getTime(),
    });
    const onlineSeconds = sumSessionDurationSeconds(sessions);

    const pathCounts = new Map<string, number>();
    const actionCounts = new Map<
      string,
      { action: string; category: AuditCategory; count: number }
    >();
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      total: 0,
      content: 0,
      navigation: 0,
      clicks: 0,
    }));

    let logins = 0;
    let pageViews = 0;
    let clicks = 0;
    let contentCreates = 0;
    let contentUpdates = 0;
    let contentDeletes = 0;
    let errors = 0;

    for (const event of events) {
      if (event.action === "auth.login") logins += 1;
      if (event.action === "navigation.page_view") pageViews += 1;
      if (event.action === "ui.click") clicks += 1;
      if (event.action === "content.create") contentCreates += 1;
      if (event.action === "content.update") contentUpdates += 1;
      if (event.action === "content.delete") contentDeletes += 1;
      if (event.action === "ui.error") errors += 1;

      if (event.path?.trim()) {
        const path = event.path.trim();
        pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
      }

      const actionEntry = actionCounts.get(event.action);
      if (actionEntry) {
        actionEntry.count += 1;
      } else {
        actionCounts.set(event.action, {
          action: event.action,
          category: event.category,
          count: 1,
        });
      }

      const hour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Tehran",
          hour: "numeric",
          hour12: false,
        }).format(new Date(event.createdAt))
      );
      const bucket = hourly[Number.isFinite(hour) ? hour % 24 : 0];
      if (bucket) {
        bucket.total += 1;
        if (event.category === "content") bucket.content += 1;
        if (event.action === "navigation.page_view") bucket.navigation += 1;
        if (event.action === "ui.click") bucket.clicks += 1;
      }
    }

    const topPaths = Array.from(pathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topActions = Array.from(actionCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      ok: true,
      data: {
        date: dateIso.trim(),
        events,
        sessions,
        summary: {
          totalEvents: events.length,
          logins,
          pageViews,
          clicks,
          contentCreates,
          contentUpdates,
          contentDeletes,
          contentChanges: contentCreates + contentUpdates + contentDeletes,
          errors,
          uniquePaths: pathCounts.size,
          onlineSeconds,
          sessionCount: sessions.length,
        },
        dailySeries,
        topPaths,
        topActions,
        hourlyActivity: hourly,
      },
    };
  } catch (error) {
    console.error("getUserAuditProfileAction failed:", error);
    return { ok: false, error: "بارگذاری گزارش کاربر ناموفق بود." };
  }
}
