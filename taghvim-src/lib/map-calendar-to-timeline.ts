import { mediaKindFromMime } from "@taghvim/lib/media";
import { formatPersianDateLabel } from "@taghvim/lib/persian-date";
import type {
  CalendarDay,
  EnemyAction,
  GovernmentAction,
  MediaItem,
  TimelineResponse,
} from "@taghvim/types/calendar";
import type {
  Severity,
  TimelineDay,
  TimelineEvent,
  TimelineMedia,
  VerificationStatus,
} from "@taghvim/types/timeline";

function weekdayLabel(dateStr: string): string {
  return new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(
    new Date(`${dateStr}T12:00:00`),
  );
}

function mapMedia(items?: MediaItem[]): TimelineMedia[] {
  return (items ?? []).map((item) => ({
    id: String(item.id),
    type: mediaKindFromMime(item.mime_type),
    url: item.url,
    alt: item.alt ?? undefined,
  }));
}

function timeFromIso(iso: string | null | undefined, fallback = "12:00"): string {
  if (!iso) return fallback;
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? fallback;
}

function dateFromAction(
  primary: string | null | undefined,
  dayDate: string,
): string {
  if (primary && primary.length >= 10) return primary.slice(0, 10);
  return dayDate;
}

function mapLocation(
  location?: string | null,
  lat?: number | string | null,
  lng?: number | string | null,
): TimelineEvent["location"] | undefined {
  const latitude =
    lat != null && String(lat).trim() !== "" ? Number(lat) : undefined;
  const longitude =
    lng != null && String(lng).trim() !== "" ? Number(lng) : undefined;
  const hasCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  if (!location && !hasCoords) return undefined;

  return {
    province: location || undefined,
    lat: hasCoords ? latitude : undefined,
    lng: hasCoords ? longitude : undefined,
  };
}

function mapEnemy(
  action: EnemyAction & {
    creator?: { id?: number; name?: string } | null;
    date?: string | null;
  },
  dayDate: string,
): TimelineEvent {
  const date = dateFromAction(action.date ?? action.occurred_at, dayDate);
  const media = mapMedia(action.media);
  const now = new Date().toISOString();

  return {
    id: `enemy-${action.id}`,
    eventType: "enemy",
    title: action.title,
    summary: action.description || action.title,
    description: action.description ?? undefined,
    date,
    time: timeFromIso(action.occurred_at),
    severity: (action.severity as Severity) || "medium",
    verificationStatus: (action.status as VerificationStatus) || "published",
    category: action.category?.name || "عمومی",
    location: mapLocation(action.location, action.latitude, action.longitude),
    agencyId: undefined,
    agencyName: undefined,
    createdByUserId:
      action.created_by != null ? String(action.created_by) : undefined,
    createdByName: action.creator?.name,
    source: action.source ?? undefined,
    imageUrl: media.find((m) => m.type === "image")?.url,
    media,
    relatedEventIds: [],
    relatedResponseIds: [],
    commentsCount: 0,
    createdAt: action.occurred_at || now,
    updatedAt: now,
  };
}

function mapGovernment(
  action: GovernmentAction & {
    creator?: { id?: number; name?: string } | null;
    date?: string | null;
  },
  dayDate: string,
): TimelineEvent {
  const date = dateFromAction(action.date ?? action.completed_at, dayDate);
  const media = mapMedia(action.media);
  const now = new Date().toISOString();

  return {
    id: `gov-${action.id}`,
    eventType: "government",
    title: action.title,
    summary: action.description || action.title,
    description: action.description ?? undefined,
    date,
    time: timeFromIso(action.completed_at),
    severity: "medium",
    verificationStatus: (action.status as VerificationStatus) || "published",
    actionStatus: "in_progress",
    category: action.category?.name || action.agency || "عمومی",
    location: mapLocation(action.location, action.latitude, action.longitude),
    organization: action.agency ?? undefined,
    agencyId: action.agency_id ?? undefined,
    agencyName: action.agency ?? undefined,
    createdByUserId:
      action.created_by != null ? String(action.created_by) : undefined,
    createdByName: action.creator?.name,
    imageUrl: media.find((m) => m.type === "image")?.url,
    media,
    tags: action.tags ?? [],
    relatedEventIds:
      action.response_to_id != null
        ? [`enemy-${action.response_to_id}`]
        : [],
    relatedResponseIds: [],
    commentsCount: 0,
    createdAt: action.completed_at || now,
    updatedAt: now,
  };
}

export function mapCalendarDayToTimelineDay(day: CalendarDay): TimelineDay {
  const date = String(day.date).slice(0, 10);
  const events: TimelineEvent[] = [
    ...(day.enemy_actions ?? []).map((a) => mapEnemy(a, date)),
    ...(day.government_actions ?? []).map((a) => mapGovernment(a, date)),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return {
    date,
    persianDate: formatPersianDateLabel(date),
    weekday: weekdayLabel(date),
    totalEvents: events.length,
    enemyActionsCount: events.filter((e) => e.eventType === "enemy").length,
    governmentActionsCount: events.filter((e) => e.eventType === "government")
      .length,
    intensity: Math.min(100, events.length * 12),
    events,
    isCritical: events.some(
      (e) => e.eventType === "enemy" && (e.severity === "critical" || e.severity === "high"),
    ),
  };
}

export function mapTimelineResponseToDays(
  response: TimelineResponse,
): TimelineDay[] {
  return (response.data ?? [])
    .map(mapCalendarDayToTimelineDay)
    .filter((d) => d.events.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Merge API days over local days by date (API wins for overlapping dates).
 * Keeps local-only dates so seed/demo data remains when API is empty for that day.
 */
export function mergeTimelineDays(
  localDays: TimelineDay[],
  apiDays: TimelineDay[],
): TimelineDay[] {
  if (apiDays.length === 0) return localDays;
  const map = new Map<string, TimelineDay>();
  for (const day of localDays) map.set(day.date, day);
  for (const day of apiDays) map.set(day.date, day);
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}
