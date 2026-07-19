import {
  pgGetAuditDailySeries,
  pgGetAuditSummaryCounts,
  pgGetAuditTopActions,
  pgGetAuditTopActors,
  pgGetAuditTopClicks,
  pgGetAuditTopPaths,
  pgGetFailedLoginsToday,
  pgGetLoginsToday,
  pgGetOnlineUsers,
  pgGetUserContentContributions,
  pgListAuditEvents,
} from "@/lib/db/audit-repository";
import {
  pgCountOpenProblemReports,
  pgGetProblemReportStats,
  pgListProblemReports,
} from "@/lib/db/problem-reports-repository";
import {
  pgGetStuckBehaviorSignals,
  pgListRecentUserErrors,
} from "@/lib/db/stuck-signals-repository";
import type { AuditDashboardData } from "@/lib/audit/types";
import type {
  ProblemReport,
  ProblemReportStats,
  RecentUserError,
  StuckBehaviorSignal,
} from "@/lib/audit/problem-types";

const EMPTY_PROBLEM_STATS: ProblemReportStats = {
  total: 0,
  open: 0,
  pending: 0,
  inProgress: 0,
  answered: 0,
  resolved: 0,
  dismissed: 0,
  avgReplyMinutes: null,
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("Audit dashboard partial load failed:", error);
    return fallback;
  }
}

export async function getAuditDashboardData(): Promise<AuditDashboardData> {
  const [
    summary,
    dailySeries,
    topActors,
    loginsTodayList,
    failedLoginsTodayList,
    onlineUsers,
    topActions,
    topPaths,
    topClicks,
    recentEvents,
    contentByUser,
    logins,
    problemReports,
    openProblemReports,
    problemStats,
    stuckSignals,
    recentUserErrors,
  ] = await Promise.all([
    pgGetAuditSummaryCounts(),
    pgGetAuditDailySeries(14),
    pgGetAuditTopActors(12),
    safe(() => pgGetLoginsToday(50), []),
    safe(() => pgGetFailedLoginsToday(50), []),
    pgGetOnlineUsers(5),
    pgGetAuditTopActions(12),
    pgGetAuditTopPaths(12),
    pgGetAuditTopClicks(15),
    pgListAuditEvents({ limit: 200 }),
    pgGetUserContentContributions(),
    pgListAuditEvents({ action: "auth.login", limit: 50 }),
    safe<ProblemReport[]>(() => pgListProblemReports({ limit: 100 }), []),
    safe(() => pgCountOpenProblemReports(), 0),
    safe(() => pgGetProblemReportStats(), EMPTY_PROBLEM_STATS),
    safe<StuckBehaviorSignal[]>(() => pgGetStuckBehaviorSignals(), []),
    safe<RecentUserError[]>(() => pgListRecentUserErrors(40), []),
  ]);

  return {
    summary: {
      ...summary,
      onlineUsers: onlineUsers.length,
      openProblemReports,
      stuckSignals: stuckSignals.length,
    },
    dailySeries,
    topActors,
    loginsTodayList,
    failedLoginsTodayList,
    onlineUsers,
    topActions,
    topPaths,
    topClicks,
    // Heartbeats are presence-only noise for the event log.
    recentEvents: recentEvents.filter((event) => event.action !== "presence.heartbeat"),
    contentByUser,
    logins,
    problemReports,
    problemStats,
    stuckSignals,
    recentUserErrors,
  };
}
