"use server";

import { canScoreContent } from "@/lib/auth/access";
import { getAuthSession } from "@/lib/auth/get-session";
import {
  buildPresenceSessions,
  extractPresenceTimestamps,
  sumSessionDurationSeconds,
  type PresenceSession,
} from "@/lib/audit/presence-sessions";
import type { AuditEvent } from "@/lib/audit/types";
import { pgListAuditEvents } from "@/lib/db/audit-repository";
import { getTehranDayBoundsIso } from "@/lib/safe-dates";
import { isPostgresConfigured } from "@/lib/utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CompanyDayActivityEvent = {
  id: string;
  action: string;
  label: string | null;
  path: string | null;
  entityType: string | null;
  createdAt: string;
};

export type CompanyDayActivityResult = {
  date: string;
  sessions: PresenceSession[];
  onlineSeconds: number;
  loginCount: number;
  errorCount: number;
  loginEvents: CompanyDayActivityEvent[];
  errorEvents: CompanyDayActivityEvent[];
};

function toCompanyDayEvent(event: AuditEvent): CompanyDayActivityEvent {
  return {
    id: event.id,
    action: event.action,
    label: event.label,
    path: event.path,
    entityType: event.entityType,
    createdAt: event.createdAt,
  };
}

/**
 * Presence, logins and user-facing errors for one company on a Tehran day.
 * Available to admin / کارفرما / رییس, or the same user viewing their own report.
 */
export async function getCompanySupervisionDayActivityAction(
  userId: string,
  dateIso: string
): Promise<{ ok: true; data: CompanyDayActivityResult } | { ok: false; error: string }> {
  const session = await getAuthSession();
  const trimmedUserId = userId?.trim() ?? "";
  const isSelf = Boolean(session?.userId && session.userId === trimmedUserId);
  if (!session || (!canScoreContent(session) && !isSelf)) {
    return { ok: false, error: "دسترسی مجاز نیست." };
  }

  if (!isPostgresConfigured()) {
    return { ok: false, error: "پایگاه‌داده پیکربندی نشده است." };
  }

  if (!UUID_RE.test(trimmedUserId)) {
    return { ok: false, error: "شناسه کاربر نامعتبر است." };
  }

  const bounds = getTehranDayBoundsIso(dateIso);
  if (!bounds) {
    return { ok: false, error: "تاریخ نامعتبر است." };
  }

  const rawDayEvents = await pgListAuditEvents({
    actorUserId: trimmedUserId,
    from: bounds.from,
    to: bounds.to,
    limit: 2000,
    excludeHeartbeat: false,
  });

  const events = rawDayEvents.filter((event) => event.action !== "presence.heartbeat");
  const sessions = buildPresenceSessions(extractPresenceTimestamps(rawDayEvents), {
    dayEndMs: new Date(bounds.to).getTime(),
  });

  const loginEvents = events
    .filter((event) => event.action === "auth.login")
    .map(toCompanyDayEvent);
  const errorEvents = events
    .filter((event) => event.action === "ui.error" || event.action === "auth.login_failed")
    .map(toCompanyDayEvent);

  return {
    ok: true,
    data: {
      date: dateIso.trim(),
      sessions,
      onlineSeconds: sumSessionDurationSeconds(sessions),
      loginCount: loginEvents.length,
      errorCount: errorEvents.length,
      loginEvents,
      errorEvents,
    },
  };
}
