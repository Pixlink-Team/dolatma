import type {
  ActiveFilterChip,
  Severity,
  TimelineDay,
  TimelineEvent,
  TimelineFiltersState,
  VerificationStatus,
} from "@taghvim/types/timeline";
import { formatPersianDateShort } from "@taghvim/lib/persian-date";
import { getAgencyById } from "@taghvim/lib/agency-store";

export function severityColor(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "#F87171";
    case "high":
      return "#EF4444";
    case "medium":
      return "#F97316";
    default:
      return "#3B82F6";
  }
}

export function severityLabel(severity: Severity | string): string {
  switch (severity) {
    case "critical":
      return "بحرانی";
    case "high":
      return "شدید";
    case "medium":
      return "متوسط";
    case "low":
      return "کم";
    default:
      return String(severity);
  }
}

export function intensityColor(intensity: number): string {
  if (intensity >= 85) return "#F87171";
  if (intensity >= 65) return "#EF4444";
  if (intensity >= 40) return "#F97316";
  if (intensity > 0) return "#3B82F6";
  return "#334155";
}

export function intensityLabel(intensity: number): string {
  if (intensity >= 85) return "بحرانی";
  if (intensity >= 65) return "زیاد";
  if (intensity >= 40) return "متوسط";
  if (intensity > 0) return "کم";
  return "بدون فعالیت";
}

export function verificationLabel(status: VerificationStatus | string): string {
  switch (status) {
    case "verified":
      return "تأییدشده";
    case "pending":
      return "در انتظار بررسی";
    case "rejected":
      return "ردشده";
    case "published":
      return "منتشرشده";
    default:
      return "پیش‌نویس";
  }
}

export function formatResponseTime(minutes?: number): string {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m.toLocaleString("fa-IR")} دقیقه`;
  if (m === 0) return `${h.toLocaleString("fa-IR")} ساعت`;
  return `${h.toLocaleString("fa-IR")} ساعت و ${m.toLocaleString("fa-IR")} دقیقه`;
}

export function dayMaxEvents(days: TimelineDay[]): number {
  return Math.max(1, ...days.map((d) => d.totalEvents));
}

export function filterTimelineDays(
  days: TimelineDay[],
  filters: TimelineFiltersState,
  searchQuery: string,
): TimelineDay[] {
  const q = searchQuery.trim().toLowerCase();

  return days
    .map((day) => {
      if (filters.dateFrom && day.date < filters.dateFrom) return null;
      if (filters.dateTo && day.date > filters.dateTo) return null;

      const events = day.events.filter((event) =>
        matchesEvent(event, filters, q, days),
      );

      if (events.length === 0) return null;

      const enemyActionsCount = events.filter((e) => e.eventType === "enemy").length;
      const governmentActionsCount = events.filter(
        (e) => e.eventType === "government",
      ).length;

      return {
        ...day,
        events,
        totalEvents: events.length,
        enemyActionsCount,
        governmentActionsCount,
      } satisfies TimelineDay;
    })
    .filter((day): day is TimelineDay => day !== null);
}

function matchesEvent(
  event: TimelineEvent,
  filters: TimelineFiltersState,
  q: string,
  days: TimelineDay[],
): boolean {
  if (filters.eventType !== "all" && event.eventType !== filters.eventType) {
    return false;
  }
  if (filters.severity !== "all" && event.severity !== filters.severity) {
    return false;
  }
  if (filters.category !== "all" && event.category !== filters.category) {
    return false;
  }
  if (
    filters.province !== "all" &&
    event.location?.province !== filters.province
  ) {
    return false;
  }
  if (filters.city !== "all" && event.location?.city !== filters.city) {
    return false;
  }
  if (
    filters.organization !== "all" &&
    event.organization !== filters.organization
  ) {
    return false;
  }
  if (filters.agencyId !== "all") {
    const agency = getAgencyById(filters.agencyId);
    const creatorAgencies = event.createdByAgencyIds ?? [];
    // Content stamped with this ministry, or created by a user assigned to it
    const matchesCreatorAgency = creatorAgencies.includes(filters.agencyId);
    const matchesEventAgency =
      event.agencyId === filters.agencyId ||
      event.organization === filters.agencyId ||
      event.agencyName === filters.agencyId ||
      (agency != null &&
        (event.agencyId === agency.id ||
          event.organization === agency.shortName ||
          event.organization === agency.name ||
          event.agencyName === agency.name ||
          event.agencyName === agency.shortName));
    if (!matchesCreatorAgency && !matchesEventAgency) return false;
  }
  if (
    filters.verificationStatus !== "all" &&
    event.verificationStatus !== filters.verificationStatus
  ) {
    return false;
  }
  if (filters.source !== "all" && event.source !== filters.source) {
    return false;
  }
  if (filters.hasImage && !event.imageUrl && !(event.media ?? []).some((m) => m.type === "image")) {
    return false;
  }
  if (filters.hasVideo && !(event.media ?? []).some((m) => m.type === "video")) {
    return false;
  }

  if (filters.hasResponse !== "all" && event.eventType === "enemy") {
    const hasResponse = (event.relatedEventIds ?? []).some((id) =>
      days.some((d) =>
        d.events.some((e) => e.id === id && e.eventType === "government"),
      ),
    );
    if (filters.hasResponse === "yes" && !hasResponse) return false;
    if (filters.hasResponse === "no" && hasResponse) return false;
  }

  if (!q) return true;

  const haystack = [
    event.title,
    event.summary,
    event.description,
    event.organization,
    event.agencyName,
    event.source,
    event.category,
    event.location?.city,
    event.location?.province,
    ...(event.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function buildFilterChips(
  filters: TimelineFiltersState,
  agencyLabelById?: Record<string, string>,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.eventType !== "all") {
    chips.push({
      key: "eventType",
      label:
        filters.eventType === "enemy" ? "اقدامات دشمن" : "اقدامات دولت",
    });
  }
  if (filters.severity !== "all") {
    chips.push({
      key: "severity",
      label: `شدت: ${severityLabel(filters.severity)}`,
    });
  }
  if (filters.category !== "all") {
    chips.push({ key: "category", label: filters.category });
  }
  if (filters.province !== "all") {
    chips.push({ key: "province", label: filters.province });
  }
  if (filters.city !== "all") {
    chips.push({ key: "city", label: filters.city });
  }
  if (filters.organization !== "all") {
    chips.push({ key: "organization", label: filters.organization });
  }
  if (filters.agencyId !== "all") {
    chips.push({
      key: "agencyId",
      label: `وزارتخانه: ${agencyLabelById?.[filters.agencyId] ?? filters.agencyId}`,
    });
  }
  if (filters.verificationStatus !== "all") {
    chips.push({
      key: "verificationStatus",
      label: verificationLabel(filters.verificationStatus),
    });
  }
  if (filters.hasResponse === "yes") {
    chips.push({ key: "hasResponse", label: "دارای پاسخ" });
  }
  if (filters.hasResponse === "no") {
    chips.push({ key: "hasResponse", label: "بدون پاسخ" });
  }
  if (filters.hasImage) chips.push({ key: "hasImage", label: "دارای تصویر" });
  if (filters.hasVideo) chips.push({ key: "hasVideo", label: "دارای ویدئو" });
  if (filters.source !== "all") {
    chips.push({ key: "source", label: `منبع: ${filters.source}` });
  }
  if (filters.dateFrom || filters.dateTo) {
    const fromLabel = filters.dateFrom
      ? formatPersianDateShort(filters.dateFrom)
      : "…";
    const toLabel = filters.dateTo
      ? formatPersianDateShort(filters.dateTo)
      : "…";
    chips.push({
      key: "dateRange",
      label: `بازه: ${fromLabel} تا ${toLabel}`,
    });
  }

  return chips;
}

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(${escaped})`, "gi"),
    '<mark class="rounded bg-violet-500/30 px-0.5 text-violet-100">$1</mark>',
  );
}

export {
  activityColor,
  activityLabel,
  formatFaDate,
  formatFaShortDate,
} from "@taghvim/lib/activity";
