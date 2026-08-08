import { intensityLabel } from "@taghvim/lib/timeline";
import type { TimelineDay, TimelineEvent } from "@taghvim/types/timeline";

export type PersianYmd = {
  year: number;
  month: number;
  day: number;
};

export type MonthOption = {
  key: string;
  year: number;
  month: number;
  label: string;
  startDate: string;
  endDate: string;
};

export type MonthlyDayCell = {
  key: string;
  date: string | null;
  inMonth: boolean;
  dayNumber: number | null;
  day: TimelineDay | null;
  topEvent: TimelineEvent | null;
  thumbs: string[];
  summary: string | null;
};

const WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

const PERSIAN_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export { WEEKDAY_LABELS, PERSIAN_MONTH_NAMES };

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export { toDateString as toMonthlyDateString };

const persianPartsFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export function getPersianYmd(date: Date | string): PersianYmd {
  const value =
    typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  const parts = persianPartsFormatter.formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
  };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthLabel(year: number, month: number): string {
  const name = PERSIAN_MONTH_NAMES[month - 1] ?? `ماه ${month}`;
  return `${name} ${year.toLocaleString("fa-IR")}`;
}

export function emptyTimelineDay(dateStr: string): TimelineDay {
  const date = new Date(`${dateStr}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(
    date,
  );
  const persianDate = new Intl.DateTimeFormat("fa-IR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return {
    date: dateStr,
    persianDate,
    weekday,
    totalEvents: 0,
    enemyActionsCount: 0,
    governmentActionsCount: 0,
    intensity: 0,
    events: [],
  };
}

/** Find the Gregorian date for Persian year/month/day via short scan. */
export function gregorianFromPersian(
  year: number,
  month: number,
  day: number,
): Date {
  // Approximate: Persian new year ~ Mar 21 of (year + 621)
  const approx = new Date(Date.UTC(year + 621, 2, 21 + (month - 1) * 30 + day));
  const local = new Date(
    approx.getUTCFullYear(),
    approx.getUTCMonth(),
    approx.getUTCDate(),
    12,
  );

  for (let i = 0; i < 400; i++) {
    const ymd = getPersianYmd(local);
    if (ymd.year === year && ymd.month === month && ymd.day === day) {
      return local;
    }
    const delta =
      (year - ymd.year) * 365 + (month - ymd.month) * 30 + (day - ymd.day);
    if (delta === 0) break;
    local.setDate(local.getDate() + Math.max(-40, Math.min(40, delta)));
  }

  // Fallback linear search around estimate
  for (let offset = -60; offset <= 60; offset++) {
    const candidate = new Date(local);
    candidate.setDate(local.getDate() + offset);
    const ymd = getPersianYmd(candidate);
    if (ymd.year === year && ymd.month === month && ymd.day === day) {
      return candidate;
    }
  }

  return local;
}

export function daysInPersianMonth(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  // Esfand: probe day 30
  const probe = gregorianFromPersian(year, 12, 30);
  const ymd = getPersianYmd(probe);
  return ymd.year === year && ymd.month === 12 && ymd.day === 30 ? 30 : 29;
}

export function shiftPersianMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const absolute = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(absolute / 12),
    month: (absolute % 12) + 1,
  };
}

function eventThumbs(day: TimelineDay): string[] {
  const urls: string[] = [];
  for (const event of day.events) {
    if (event.imageUrl) urls.push(event.imageUrl);
    for (const media of event.media ?? []) {
      if (media.type === "image") {
        urls.push(media.thumbnailUrl ?? media.url);
      }
    }
  }
  return [...new Set(urls)].slice(0, 3);
}

function topEvent(day: TimelineDay): TimelineEvent | null {
  if (day.events.length === 0) return null;
  const severityRank: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return [...day.events].sort((a, b) => {
    const sev =
      (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0);
    if (sev !== 0) return sev;
    return b.time.localeCompare(a.time);
  })[0]!;
}

function daySummary(day: TimelineDay): string | null {
  const top = topEvent(day);
  if (top?.summary) return top.summary;
  if (top?.title) return top.title;
  if (day.totalEvents === 0) return null;
  return `${day.totalEvents.toLocaleString("fa-IR")} رویداد · شدت ${intensityLabel(day.intensity)}`;
}

export function listMonthOptions(days: TimelineDay[]): MonthOption[] {
  const map = new Map<string, MonthOption>();

  for (const day of days) {
    const { year, month } = getPersianYmd(day.date);
    const key = monthKey(year, month);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        year,
        month,
        label: monthLabel(year, month),
        startDate: day.date,
        endDate: day.date,
      });
    } else {
      if (day.date < existing.startDate) existing.startDate = day.date;
      if (day.date > existing.endDate) existing.endDate = day.date;
    }
  }

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function findMonthOption(
  months: MonthOption[],
  year: number,
  month: number,
): MonthOption | null {
  return months.find((m) => m.year === year && m.month === month) ?? null;
}

export function resolveMonthFromDate(
  dateStr: string,
  months: MonthOption[],
): MonthOption | null {
  const { year, month } = getPersianYmd(dateStr);
  return (
    findMonthOption(months, year, month) ??
    months[months.length - 1] ??
    null
  );
}

export function buildMonthCells(
  year: number,
  month: number,
  days: TimelineDay[],
): MonthlyDayCell[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const length = daysInPersianMonth(year, month);
  const first = gregorianFromPersian(year, month, 1);
  const jsDay = first.getDay(); // 0 Sun .. 6 Sat
  const offset = (jsDay + 1) % 7; // Saturday-start grid

  const cells: MonthlyDayCell[] = [];

  for (let i = 0; i < offset; i++) {
    cells.push({
      key: `pad-start-${i}`,
      date: null,
      inMonth: false,
      dayNumber: null,
      day: null,
      topEvent: null,
      thumbs: [],
      summary: null,
    });
  }

  for (let dayNum = 1; dayNum <= length; dayNum++) {
    const greg = gregorianFromPersian(year, month, dayNum);
    const dateStr = toDateString(greg);
    const day = byDate.get(dateStr) ?? emptyTimelineDay(dateStr);
    cells.push({
      key: dateStr,
      date: dateStr,
      inMonth: true,
      dayNumber: dayNum,
      day,
      topEvent: topEvent(day),
      thumbs: eventThumbs(day),
      summary: daySummary(day),
    });
  }

  while (cells.length % 7 !== 0) {
    const i = cells.length;
    cells.push({
      key: `pad-end-${i}`,
      date: null,
      inMonth: false,
      dayNumber: null,
      day: null,
      topEvent: null,
      thumbs: [],
      summary: null,
    });
  }

  return cells;
}

export function summarizeMonth(cells: MonthlyDayCell[]) {
  const inMonth = cells.filter((c) => c.inMonth && c.day);
  let totalEvents = 0;
  let enemy = 0;
  let government = 0;
  let activeDays = 0;
  const responseMinutes: number[] = [];

  for (const cell of inMonth) {
    const day = cell.day!;
    totalEvents += day.totalEvents;
    enemy += day.enemyActionsCount;
    government += day.governmentActionsCount;
    if (day.totalEvents > 0) activeDays += 1;
    for (const event of day.events) {
      if (typeof event.responseTimeMinutes === "number") {
        responseMinutes.push(event.responseTimeMinutes);
      }
    }
  }

  const avgResponseMinutes =
    responseMinutes.length === 0
      ? 0
      : Math.round(
          responseMinutes.reduce((sum, n) => sum + n, 0) / responseMinutes.length,
        );

  const responseRatio =
    enemy === 0
      ? government > 0
        ? 100
        : 0
      : Math.min(100, Math.round((government / enemy) * 100));

  return {
    totalEvents,
    enemy,
    government,
    activeDays,
    dayCount: inMonth.length,
    responseRatio,
    avgResponseMinutes,
  };
}
