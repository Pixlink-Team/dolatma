import { intensityLabel } from "@taghvim/lib/timeline";
import type { TimelineDay, TimelineEvent } from "@taghvim/types/timeline";

export type WeeklyIntensityLevel = "low" | "medium" | "high" | "very_high";

export type WeeklyDayModel = {
  day: TimelineDay;
  topEvent: TimelineEvent | null;
  hourlyBars: number[];
  intensityLevel: WeeklyIntensityLevel;
};

export function weeklyIntensityLevel(intensity: number): WeeklyIntensityLevel {
  if (intensity >= 85) return "very_high";
  if (intensity >= 65) return "high";
  if (intensity >= 40) return "medium";
  return "low";
}

export function weeklyIntensityLabel(level: WeeklyIntensityLevel): string {
  switch (level) {
    case "very_high":
      return "بسیار زیاد";
    case "high":
      return "زیاد";
    case "medium":
      return "متوسط";
    default:
      return "کم";
  }
}

export function weeklyIntensityTone(level: WeeklyIntensityLevel): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (level) {
    case "very_high":
      return {
        bg: "rgba(255, 48, 64, 0.18)",
        text: "#FF6B7A",
        border: "rgba(255, 48, 64, 0.45)",
        dot: "#FF3040",
      };
    case "high":
      return {
        bg: "rgba(239, 68, 68, 0.16)",
        text: "#F87171",
        border: "rgba(239, 68, 68, 0.4)",
        dot: "#EF4444",
      };
    case "medium":
      return {
        bg: "rgba(245, 158, 11, 0.14)",
        text: "#FBBF24",
        border: "rgba(245, 158, 11, 0.4)",
        dot: "#F59E0B",
      };
    default:
      return {
        bg: "rgba(59, 130, 246, 0.14)",
        text: "#93C5FD",
        border: "rgba(59, 130, 246, 0.35)",
        dot: "#3B82F6",
      };
  }
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export { toDateString as toWeeklyDateString };

/** Saturday-start week containing the anchor date */
export function startOfWeekSaturday(dateStr: string): Date {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const daysSinceSat = (day + 1) % 7;
  d.setDate(d.getDate() - daysSinceSat);
  return d;
}

export function shiftWeek(dateStr: string, weekDelta: number): string {
  const start = startOfWeekSaturday(dateStr);
  start.setDate(start.getDate() + weekDelta * 7);
  return toDateString(start);
}

export function buildHourlyBars(day: TimelineDay): number[] {
  const buckets = Array.from({ length: 10 }, () => 0);
  for (const event of day.events) {
    const hour = Number.parseInt(event.time.slice(0, 2), 10);
    if (Number.isNaN(hour)) continue;
    const idx = Math.min(9, Math.max(0, Math.floor(hour / 2.4)));
    buckets[idx] = (buckets[idx] ?? 0) + 1;
  }
  // Keep a readable sparkline even for sparse days
  if (buckets.every((v) => v === 0)) {
    const seed = day.date.split("-").reduce((s, p) => s + Number(p), 0);
    return Array.from({ length: 10 }, (_, i) => 1 + ((seed + i * 3) % 5));
  }
  return buckets;
}

export function pickTopEvent(day: TimelineDay): TimelineEvent | null {
  if (day.events.length === 0) return null;
  const ranked = [...day.events].sort((a, b) => {
    const score = (e: TimelineEvent) => {
      const sev =
        e.severity === "critical"
          ? 4
          : e.severity === "high"
            ? 3
            : e.severity === "medium"
              ? 2
              : 1;
      return sev * 10 + (e.imageUrl ? 2 : 0);
    };
    return score(b) - score(a) || b.time.localeCompare(a.time);
  });
  return ranked[0] ?? null;
}

export function getWeekModels(
  days: TimelineDay[],
  weekStartDate: string,
): WeeklyDayModel[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const start = startOfWeekSaturday(weekStartDate);
  const models: WeeklyDayModel[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toDateString(d);
    const day = byDate.get(key);
    if (!day) continue;
    models.push({
      day,
      topEvent: pickTopEvent(day),
      hourlyBars: buildHourlyBars(day),
      intensityLevel: weeklyIntensityLevel(day.intensity),
    });
  }

  // Fallback: if week not fully in dataset, use nearest 7 chronological days
  if (models.length < 7) {
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    const slice = sorted.slice(Math.max(0, sorted.length - 7));
    return slice.map((day) => ({
      day,
      topEvent: pickTopEvent(day),
      hourlyBars: buildHourlyBars(day),
      intensityLevel: weeklyIntensityLevel(day.intensity),
    }));
  }

  return models;
}

export function formatWeekRangeLabel(models: WeeklyDayModel[]): string {
  if (models.length === 0) return "";
  const first = models[0]!.day.persianDate;
  const last = models[models.length - 1]!.day.persianDate;
  return `${first} - ${last}`;
}

export type WeekOption = {
  index: number;
  startDate: string;
  endDate: string;
  label: string;
  shortRange: string;
};

function persianShortDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("fa-IR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

/** Build هفته ۱..N from available timeline days (oldest week = 1) */
export function listWeekOptions(days: TimelineDay[]): WeekOption[] {
  if (days.length === 0) return [];

  const starts = new Set<string>();
  for (const day of days) {
    starts.add(toDateString(startOfWeekSaturday(day.date)));
  }

  const sortedStarts = [...starts].sort((a, b) => a.localeCompare(b));

  return sortedStarts.map((startDate, i) => {
    const end = new Date(`${startDate}T12:00:00`);
    end.setDate(end.getDate() + 6);
    const endDate = toDateString(end);
    const index = i + 1;
    return {
      index,
      startDate,
      endDate,
      label: `هفته ${index.toLocaleString("fa-IR")}`,
      shortRange: `${persianShortDate(startDate)} تا ${persianShortDate(endDate)}`,
    };
  });
}

export function findWeekOption(
  options: WeekOption[],
  weekStartDate: string,
): WeekOption | null {
  const key = toDateString(startOfWeekSaturday(weekStartDate));
  return options.find((o) => o.startDate === key) ?? null;
}

export function summarizeWeek(models: WeeklyDayModel[]) {
  const totalEvents = models.reduce((s, m) => s + m.day.totalEvents, 0);
  const enemy = models.reduce((s, m) => s + m.day.enemyActionsCount, 0);
  const government = models.reduce(
    (s, m) => s + m.day.governmentActionsCount,
    0,
  );
  const responseMinutes = models
    .flatMap((m) => m.day.events)
    .map((e) => e.responseTimeMinutes)
    .filter((n): n is number => typeof n === "number");
  const avgResponseMinutes =
    responseMinutes.length === 0
      ? 0
      : Math.round(
          responseMinutes.reduce((s, n) => s + n, 0) / responseMinutes.length,
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
    responseRatio,
    avgResponseMinutes,
    intensityHint: intensityLabel(
      models.reduce((s, m) => s + m.day.intensity, 0) /
        Math.max(1, models.length),
    ),
  };
}
