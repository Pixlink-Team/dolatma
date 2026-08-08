import type { TimelineDay, TimelineEvent } from "@taghvim/types/timeline";
import {
  buildDaysFromEvents,
  SEED_RANGE_END,
  SEED_RANGE_START,
  TIMELINE_SEED_VERSION,
  conflictSeedDays,
} from "@taghvim/data/timeline.mock";
import {
  defaultDashboardSettings,
  type DashboardSettings,
} from "@taghvim/types/settings";

const TIMELINE_KEY = "taghvim_timeline_days";
const TIMELINE_CLEARED_KEY = "taghvim_timeline_cleared";
const TIMELINE_VERSION_KEY = "taghvim_timeline_seed_version";
const SETTINGS_KEY = "taghvim_dashboard_settings";

const DEMO_STORAGE_KEYS = [
  TIMELINE_KEY,
  TIMELINE_CLEARED_KEY,
  TIMELINE_VERSION_KEY,
  "taghvim_event_draft",
  "taghvim_saved_filters",
] as const;

function canUseStorage() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function applySeedRangeToSettings() {
  const settings = readJson<Partial<DashboardSettings>>(SETTINGS_KEY, {});
  writeJson(SETTINGS_KEY, {
    ...defaultDashboardSettings,
    ...settings,
    rangeStart: SEED_RANGE_START,
    rangeEnd: SEED_RANGE_END,
  } satisfies DashboardSettings);
}

function writeSeed() {
  writeJson(TIMELINE_KEY, conflictSeedDays);
  if (canUseStorage()) {
    localStorage.setItem(TIMELINE_VERSION_KEY, TIMELINE_SEED_VERSION);
    localStorage.removeItem(TIMELINE_CLEARED_KEY);
  }
  applySeedRangeToSettings();
  return conflictSeedDays;
}

export function isTimelineCleared(): boolean {
  if (!canUseStorage()) return false;
  return localStorage.getItem(TIMELINE_CLEARED_KEY) === "1";
}

/** Load timeline days: empty after clear, otherwise seed conflict data. */
export function loadTimelineDays(): TimelineDay[] {
  if (!canUseStorage()) return conflictSeedDays;

  if (isTimelineCleared()) {
    return readJson<TimelineDay[]>(TIMELINE_KEY, []);
  }

  const version = localStorage.getItem(TIMELINE_VERSION_KEY);
  if (version !== TIMELINE_SEED_VERSION) {
    return writeSeed();
  }

  const existing = readJson<TimelineDay[] | null>(TIMELINE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  return writeSeed();
}

export function saveTimelineDays(days: TimelineDay[]) {
  writeJson(TIMELINE_KEY, days);
  if (canUseStorage() && days.length > 0) {
    localStorage.removeItem(TIMELINE_CLEARED_KEY);
  }
}

/** Insert or replace a single event and rebuild day aggregates. */
export function upsertTimelineEvent(event: TimelineEvent): TimelineDay[] {
  const days = loadTimelineDays();
  const allEvents = days
    .flatMap((d) => d.events)
    .filter((e) => e.id !== event.id);
  allEvents.push(event);
  const next = buildDaysFromEvents(allEvents);
  saveTimelineDays(next);
  return next;
}

export function resetLocalTimelineCache(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(TIMELINE_KEY);
  localStorage.removeItem(TIMELINE_CLEARED_KEY);
  localStorage.removeItem(TIMELINE_VERSION_KEY);
}

export function restoreConflictDemoData(): TimelineDay[] {
  resetLocalTimelineCache();
  return conflictSeedDays;
}

/**
 * Wipe demo/content data so the product is empty and ready for real use.
 * Keeps admin users and auth session.
 */
export function clearAllDemoData(): {
  removedKeys: string[];
  timelineCount: number;
} {
  const before = loadTimelineDays().length;
  const removedKeys: string[] = [];

  if (canUseStorage()) {
    for (const key of DEMO_STORAGE_KEYS) {
      if (localStorage.getItem(key) != null) {
        localStorage.removeItem(key);
        removedKeys.push(key);
      }
    }

    localStorage.setItem(TIMELINE_CLEARED_KEY, "1");
    writeJson(TIMELINE_KEY, []);

    const settings = readJson<Partial<DashboardSettings>>(SETTINGS_KEY, {});
    writeJson(SETTINGS_KEY, {
      ...defaultDashboardSettings,
      ...settings,
      rangeStart: "",
      rangeEnd: "",
      siteTitle: defaultDashboardSettings.siteTitle,
    } satisfies DashboardSettings);
  }

  return { removedKeys, timelineCount: before };
}

export function getDemoDataStats() {
  const days = loadTimelineDays();
  const events = days.reduce((n, d) => n + d.totalEvents, 0);
  return {
    days: days.length,
    events,
    cleared: isTimelineCleared(),
  };
}
