import { getAllEvents } from "@taghvim/data/timeline.mock";
import { formatPersianDateShort } from "@taghvim/lib/persian-date";
import { formatResponseTime, intensityLabel, severityLabel } from "@taghvim/lib/timeline";
import type { Severity, TimelineDay, TimelineEvent } from "@taghvim/types/timeline";

export type RankRow = {
  label: string;
  value: number;
  share: number;
};

export type TrendPoint = {
  date: string;
  label: string;
  shortLabel: string;
  enemy: number;
  government: number;
  total: number;
  intensity: number;
};

export type AnalyticsModel = {
  totalEvents: number;
  enemy: number;
  government: number;
  responseRatio: number;
  avgResponseMinutes: number;
  unanswered: number;
  criticalDays: number;
  activeDays: number;
  dayCount: number;
  verifiedShare: number;
  withMediaShare: number;
  trend: TrendPoint[];
  severityRows: RankRow[];
  categoryRows: RankRow[];
  provinceRows: RankRow[];
  orgRows: RankRow[];
  typeShare: { enemy: number; government: number };
  topCriticalDays: {
    date: string;
    persianDate: string;
    intensity: number;
    totalEvents: number;
  }[];
  avgResponseLabel: string;
  rangeLabel: string;
};

function toRank(map: Map<string, number>, limit = 6): RankRow[] {
  const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({
      label,
      value,
      share: Math.round((value / total) * 100),
    }));
}

function shortDayLabel(dateStr: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateStr}T12:00:00`));
}

export function buildAnalyticsModel(days: TimelineDay[]): AnalyticsModel {
  const chronological = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const events = getAllEvents(days);

  const categories = new Map<string, number>();
  const provinces = new Map<string, number>();
  const orgs = new Map<string, number>();
  const severities = new Map<string, number>();

  let verified = 0;
  let withMedia = 0;

  for (const event of events) {
    categories.set(event.category, (categories.get(event.category) || 0) + 1);
    severities.set(event.severity, (severities.get(event.severity) || 0) + 1);
    if (event.location?.province) {
      provinces.set(
        event.location.province,
        (provinces.get(event.location.province) || 0) + 1,
      );
    }
    if (event.organization) {
      orgs.set(event.organization, (orgs.get(event.organization) || 0) + 1);
    }
    if (
      event.verificationStatus === "verified" ||
      event.verificationStatus === "published"
    ) {
      verified += 1;
    }
    if (event.imageUrl || (event.media && event.media.length > 0)) {
      withMedia += 1;
    }
  }

  const enemy = chronological.reduce((s, d) => s + d.enemyActionsCount, 0);
  const government = chronological.reduce(
    (s, d) => s + d.governmentActionsCount,
    0,
  );
  const totalEvents = enemy + government;
  const unanswered = events.filter(
    (e) =>
      e.eventType === "enemy" &&
      (!e.relatedResponseIds || e.relatedResponseIds.length === 0),
  ).length;

  const responseTimes = events
    .map((e) => e.responseTimeMinutes)
    .filter((m): m is number => typeof m === "number" && m > 0);
  const avgResponseMinutes =
    responseTimes.length === 0
      ? 0
      : Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        );

  const trend: TrendPoint[] = chronological.map((day) => ({
    date: day.date,
    label: day.persianDate,
    shortLabel: shortDayLabel(day.date),
    enemy: day.enemyActionsCount,
    government: day.governmentActionsCount,
    total: day.totalEvents,
    intensity: day.intensity,
  }));

  const severityOrder: Severity[] = ["critical", "high", "medium", "low"];
  const severityRows: RankRow[] = severityOrder
    .filter((s) => (severities.get(s) || 0) > 0)
    .map((s) => {
      const value = severities.get(s) || 0;
      return {
        label: severityLabel(s),
        value,
        share: totalEvents ? Math.round((value / totalEvents) * 100) : 0,
      };
    });

  const first = chronological[0];
  const last = chronological[chronological.length - 1];
  const rangeLabel =
    first && last
      ? `${formatPersianDateShort(first.date)} — ${formatPersianDateShort(last.date)}`
      : "بدون بازه";

  return {
    totalEvents,
    enemy,
    government,
    responseRatio:
      enemy === 0
        ? government > 0
          ? 100
          : 0
        : Math.round((government / enemy) * 100),
    avgResponseMinutes,
    unanswered,
    criticalDays: days.filter((d) => d.isCritical || d.intensity >= 85).length,
    activeDays: days.filter((d) => d.totalEvents > 0).length,
    dayCount: days.length,
    verifiedShare: totalEvents
      ? Math.round((verified / totalEvents) * 100)
      : 0,
    withMediaShare: totalEvents
      ? Math.round((withMedia / totalEvents) * 100)
      : 0,
    trend,
    severityRows,
    categoryRows: toRank(categories),
    provinceRows: toRank(provinces),
    orgRows: toRank(orgs),
    typeShare: {
      enemy: totalEvents ? Math.round((enemy / totalEvents) * 100) : 0,
      government: totalEvents
        ? Math.round((government / totalEvents) * 100)
        : 0,
    },
    topCriticalDays: [...days]
      .sort((a, b) => b.intensity - a.intensity || b.totalEvents - a.totalEvents)
      .slice(0, 6)
      .map((d) => ({
        date: d.date,
        persianDate: d.persianDate,
        intensity: d.intensity,
        totalEvents: d.totalEvents,
      })),
    avgResponseLabel: formatResponseTime(avgResponseMinutes) || "—",
    rangeLabel,
  };
}

export function sparkValues(points: TrendPoint[], key: keyof TrendPoint): number[] {
  return points.map((p) => Number(p[key]) || 0);
}

export type { TimelineEvent };
