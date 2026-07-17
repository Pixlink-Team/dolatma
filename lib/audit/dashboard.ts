import {
  pgGetAuditDailySeries,
  pgGetAuditSummaryCounts,
  pgGetAuditTopActions,
  pgGetAuditTopActors,
  pgGetAuditTopClicks,
  pgGetAuditTopPaths,
  pgGetUserContentContributions,
  pgListAuditEvents,
} from "@/lib/db/audit-repository";
import type { AuditDashboardData } from "@/lib/audit/types";

export async function getAuditDashboardData(): Promise<AuditDashboardData> {
  const [
    summary,
    dailySeries,
    topActors,
    topActions,
    topPaths,
    topClicks,
    recentEvents,
    contentByUser,
    logins,
  ] = await Promise.all([
    pgGetAuditSummaryCounts(),
    pgGetAuditDailySeries(14),
    pgGetAuditTopActors(12),
    pgGetAuditTopActions(12),
    pgGetAuditTopPaths(12),
    pgGetAuditTopClicks(15),
    pgListAuditEvents({ limit: 150 }),
    pgGetUserContentContributions(),
    pgListAuditEvents({ action: "auth.login", limit: 50 }),
  ]);

  return {
    summary,
    dailySeries,
    topActors,
    topActions,
    topPaths,
    topClicks,
    recentEvents,
    contentByUser,
    logins,
  };
}
