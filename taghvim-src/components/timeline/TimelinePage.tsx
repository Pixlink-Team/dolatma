"use client";

import { AppShell } from "@taghvim/components/layout/AppShell";
import { AppSidebar } from "@taghvim/components/layout/AppSidebar";
import { MobileNavigation } from "@taghvim/components/layout/MobileNavigation";
import { ActiveFilterChips } from "@taghvim/components/timeline/ActiveFilterChips";
import { AgencyFilterBar } from "@taghvim/components/timeline/AgencyFilterBar";
import { EventIntensityPanel } from "@taghvim/components/timeline/EventIntensityPanel";
import { EventDetailPanel } from "@taghvim/components/timeline/EventDetailPanel";
import { EventDetailModal } from "@taghvim/components/timeline/EventDetailModal";
import { TimelineDaySection } from "@taghvim/components/timeline/TimelineDay";
import { TimelineFilters } from "@taghvim/components/timeline/TimelineFilters";
import { TimelineHeader } from "@taghvim/components/timeline/TimelineHeader";
import {
  EmptyTimelineState,
  TimelineSkeleton,
} from "@taghvim/components/timeline/TimelineSkeleton";
import { AnalyticsView } from "@taghvim/components/views/AnalyticsView";
import { DailyView } from "@taghvim/components/views/DailyView";
import { DayDetailModal } from "@taghvim/components/views/daily/DayDetailModal";
import { MapView } from "@taghvim/components/views/MapView";
import { MonthlyView } from "@taghvim/components/views/MonthlyView";
import { WeeklyView } from "@taghvim/components/views/WeeklyView";
import {
  computeSummary,
  findEventById,
} from "@taghvim/data/timeline.mock";
import { listAgencies } from "@taghvim/lib/agency-store";
import { getDashboardSettings } from "@taghvim/lib/admin-store";
import { fetchTimeline } from "@taghvim/lib/api";
import { getCurrentUser } from "@taghvim/lib/auth";
import {
  mapTimelineResponseToDays,
} from "@taghvim/lib/map-calendar-to-timeline";
import { loadTimelineDays } from "@taghvim/lib/timeline-store";
import { buildFilterChips, filterTimelineDays } from "@taghvim/lib/timeline";
import { defaultDashboardSettings } from "@taghvim/types/settings";
import {
  defaultFilters,
  type TimelineDay,
  type TimelineEvent,
  type TimelineFiltersState,
  type TimelineViewMode,
} from "@taghvim/types/timeline";
import { ArrowUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

type TimelinePageProps = {
  initialDays?: TimelineDay[];
  loading?: boolean;
  error?: string | null;
};

const VALID_VIEWS: TimelineViewMode[] = [
  "timeline",
  "day",
  "week",
  "month",
  "map",
  "analytics",
];

function parseViewParam(value: string | null): TimelineViewMode {
  if (value === "heatmap") return "timeline";
  if (value && VALID_VIEWS.includes(value as TimelineViewMode)) {
    return value as TimelineViewMode;
  }
  return "timeline";
}

/** Offline/local fallback: non-admins only keep events they created. */
function scopeDaysToCurrentUser(days: TimelineDay[]): TimelineDay[] {
  const user = getCurrentUser();
  if (!user || user.role === "super_admin") return days;

  return days
    .map((day) => {
      const events = day.events.filter(
        (event) => event.createdByUserId === user.id,
      );
      if (events.length === 0) return null;
      return {
        ...day,
        events,
        totalEvents: events.length,
        enemyActionsCount: events.filter((e) => e.eventType === "enemy").length,
        governmentActionsCount: events.filter((e) => e.eventType === "government")
          .length,
      };
    })
    .filter((day): day is TimelineDay => day != null);
}

export function TimelinePage({
  initialDays,
  loading = false,
  error = null,
}: TimelinePageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [filters, setFilters] = useState<TimelineFiltersState>(() => ({
    ...defaultFilters,
    eventType:
      (searchParams.get("type") as TimelineFiltersState["eventType"]) || "all",
    severity:
      (searchParams.get("severity") as TimelineFiltersState["severity"]) || "all",
    province: searchParams.get("province") || "all",
    agencyId: searchParams.get("agency") || "all",
    dateFrom: searchParams.get("from") ?? "",
    dateTo: searchParams.get("to") ?? "",
  }));
  const [selectedView, setSelectedView] = useState<TimelineViewMode>(
    parseViewParam(searchParams.get("view")),
  );
  const [days, setDays] = useState<TimelineDay[]>(() => initialDays ?? []);
  const [selectedDay, setSelectedDay] = useState<string | null>(
    searchParams.get("date") ?? null,
  );
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(
    () => {
      const id = searchParams.get("event");
      if (id && initialDays) return findEventById(id, initialDays) || null;
      return null;
    },
  );
  const [detailOpen, setDetailOpen] = useState(true);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dashboardSettings, setDashboardSettings] = useState(() =>
    typeof window !== "undefined"
      ? getDashboardSettings()
      : defaultDashboardSettings,
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetchTimeline();
        if (cancelled) return;
        const apiDays = mapTimelineResponseToDays(response);
        // API is the source of truth and already scoped per user on the backend
        setDays(apiDays);
        setSelectedDay(
          (prev) =>
            prev ?? searchParams.get("date") ?? apiDays[0]?.date ?? null,
        );
        setSelectedEvent((prev) => {
          if (prev) return prev;
          const id = searchParams.get("event");
          if (id) return findEventById(id, apiDays) || null;
          const firstDay = apiDays[0];
          if (!firstDay || firstDay.events.length === 0) return null;
          return firstDay.events[0] ?? null;
        });
      } catch {
        if (cancelled) return;
        // Offline fallback: local store, still scoped to current user
        const loaded = scopeDaysToCurrentUser(initialDays ?? loadTimelineDays());
        setDays(loaded);
        setSelectedDay(
          (prev) => prev ?? searchParams.get("date") ?? loaded[0]?.date ?? null,
        );
        setSelectedEvent((prev) => {
          if (prev) return prev;
          const id = searchParams.get("event");
          if (id) return findEventById(id, loaded) || null;
          const firstDay = loaded[0];
          if (!firstDay || firstDay.events.length === 0) return null;
          return firstDay.events[0] ?? null;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally run on mount / when server-provided days change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDays]);
  const appliedDefaultView = useRef(false);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDashboardSettings(getDashboardSettings());
  }, []);

  // Keep local view state in sync with URL (sidebar Link changes query without remount)
  useEffect(() => {
    const viewFromUrl = searchParams.get("view");

    if (
      !viewFromUrl &&
      !appliedDefaultView.current &&
      dashboardSettings.defaultView !== "timeline"
    ) {
      appliedDefaultView.current = true;
      setSelectedView(dashboardSettings.defaultView);
      return;
    }

    appliedDefaultView.current = true;
    setSelectedView(parseViewParam(viewFromUrl));

    const date = searchParams.get("date");
    if (date) setSelectedDay(date);

    const agency = searchParams.get("agency");
    setFilters((prev) => {
      const nextAgency = agency || "all";
      if (prev.agencyId === nextAgency) return prev;
      return { ...prev, agencyId: nextAgency };
    });

    const eventId = searchParams.get("event");
    if (eventId) {
      const found = findEventById(eventId, days);
      if (found) setSelectedEvent(found);
    }
  }, [searchParams, days, dashboardSettings.defaultView]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!dashboardSettings.liveEnabled) return;
    const liveTimer = setTimeout(() => {
      setToast("۳ رخداد جدید ثبت شد");
    }, 16000);
    return () => clearTimeout(liveTimer);
  }, [dashboardSettings.liveEnabled]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const syncUrl = useCallback(
    (next: {
      view?: TimelineViewMode;
      date?: string | null;
      event?: string | null;
      q?: string;
      filters?: TimelineFiltersState;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const view = next.view ?? selectedView;
      const date = next.date === undefined ? selectedDay : next.date;
      const eventId =
        next.event === undefined ? selectedEvent?.id ?? null : next.event;
      const q = next.q === undefined ? searchQuery : next.q;
      const f = next.filters ?? filters;

      if (view) params.set("view", view);
      else params.delete("view");
      if (date) params.set("date", date);
      else params.delete("date");
      if (eventId) params.set("event", eventId);
      else params.delete("event");
      if (q) params.set("q", q);
      else params.delete("q");
      if (f.eventType !== "all") params.set("type", f.eventType);
      else params.delete("type");
      if (f.severity !== "all") params.set("severity", f.severity);
      else params.delete("severity");
      if (f.province !== "all") params.set("province", f.province);
      else params.delete("province");
      if (f.agencyId !== "all") params.set("agency", f.agencyId);
      else params.delete("agency");
      if (f.dateFrom) params.set("from", f.dateFrom);
      else params.delete("from");
      if (f.dateTo) params.set("to", f.dateTo);
      else params.delete("to");

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [
      filters,
      pathname,
      router,
      searchParams,
      searchQuery,
      selectedDay,
      selectedEvent?.id,
      selectedView,
    ],
  );

  useEffect(() => {
    syncUrl({ q: searchQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const rangedDays = useMemo(() => {
    return days.filter((day) => {
      if (dashboardSettings.rangeStart && day.date < dashboardSettings.rangeStart) {
        return false;
      }
      if (dashboardSettings.rangeEnd && day.date > dashboardSettings.rangeEnd) {
        return false;
      }
      return true;
    });
  }, [days, dashboardSettings.rangeStart, dashboardSettings.rangeEnd]);

  const agencyLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const agency of listAgencies({ activeOnly: false })) {
      map[agency.id] = agency.shortName;
    }
    return map;
  }, []);

  const filteredDays = useMemo(
    () => filterTimelineDays(rangedDays, filters, searchQuery),
    [rangedDays, filters, searchQuery],
  );

  const summary = useMemo(() => computeSummary(rangedDays), [rangedDays]);
  const chips = useMemo(
    () => buildFilterChips(filters, agencyLabelById),
    [filters, agencyLabelById],
  );
  const activeFilterCount = chips.length;

  useEffect(() => {
    if (selectedView !== "timeline") return;
    const root = timelineScrollRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id.startsWith("day-")) {
          setSelectedDay(visible.target.id.replace("day-", ""));
        }
      },
      {
        root: root ?? null,
        rootMargin: "-10% 0px -55% 0px",
        threshold: [0.15, 0.4, 0.7],
      },
    );

    filteredDays.forEach((day) => {
      const el = document.getElementById(`day-${day.date}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [filteredDays, selectedView]);

  const scrollDayIntoView = useCallback((date: string) => {
    const container = timelineScrollRef.current;
    const el = document.getElementById(`day-${date}`);
    if (!container || !el) return false;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const nextTop =
      container.scrollTop + (elRect.top - containerRect.top) - 8;
    container.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
    return true;
  }, []);

  const scrollToDay = useCallback(
    (rawDate: string, switchToTimeline = true) => {
      if (!rawDate) return;

      // Prefer the clicked day; if empty, jump to nearest day that has events.
      const sourceDays = rangedDays.length ? rangedDays : days;
      const resolveDate = (): string => {
        if (sourceDays.some((d) => d.date === rawDate && d.events.length > 0)) {
          return rawDate;
        }
        const withEvents = sourceDays.filter((d) => d.events.length > 0);
        if (withEvents.length === 0) return rawDate;
        const nearest = withEvents.reduce((best, day) => {
          const bestDist = Math.abs(
            Date.parse(`${best.date}T12:00:00`) -
              Date.parse(`${rawDate}T12:00:00`),
          );
          const dist = Math.abs(
            Date.parse(`${day.date}T12:00:00`) -
              Date.parse(`${rawDate}T12:00:00`),
          );
          return dist < bestDist ? day : best;
        });
        return nearest.date;
      };

      const date = resolveDate();
      if (switchToTimeline) setSelectedView("timeline");
      setSelectedDay(date);
      setCollapsedDays((prev) => ({ ...prev, [date]: false }));

      const day =
        sourceDays.find((d) => d.date === date) ??
        days.find((d) => d.date === date) ??
        null;
      const top = day?.events[0] ?? null;
      if (top) setSelectedEvent(top);

      const dayVisible = filterTimelineDays(
        sourceDays,
        filters,
        searchQuery,
      ).some((d) => d.date === date);

      // Clear filters that hide the target day so the section exists in the DOM.
      const nextFilters = dayVisible ? filters : defaultFilters;
      if (!dayVisible) {
        setFilters(nextFilters);
        setSearchInput("");
        setSearchQuery("");
      }

      syncUrl({
        date,
        view: switchToTimeline ? "timeline" : selectedView,
        event: top?.id ?? null,
        filters: nextFilters,
        q: dayVisible ? undefined : "",
      });

      const tryScroll = (attempt = 0) => {
        if (scrollDayIntoView(date)) {
          window.setTimeout(() => scrollDayIntoView(date), 160);
          return;
        }
        if (attempt < 25) {
          window.setTimeout(() => tryScroll(attempt + 1), 40);
        }
      };

      window.setTimeout(() => tryScroll(), 60);
    },
    [
      days,
      filters,
      rangedDays,
      scrollDayIntoView,
      searchQuery,
      selectedView,
      syncUrl,
    ],
  );

  const relatedLookup = useCallback(
    (event: TimelineEvent) => {
      if (event.eventType !== "enemy") return { hasResponse: false };
      const hasResponse = (
        event.relatedResponseIds ??
        event.relatedEventIds ??
        []
      ).some((id) => findEventById(id, days)?.eventType === "government");
      return { hasResponse, responseTimeMinutes: event.responseTimeMinutes };
    },
    [days],
  );

  const relatedResponses = useMemo(() => {
    if (!selectedEvent) return [];
    return (selectedEvent.relatedResponseIds ?? selectedEvent.relatedEventIds ?? [])
      .map((id) => findEventById(id, days))
      .filter((e): e is TimelineEvent => !!e && e.eventType === "government");
  }, [selectedEvent, days]);

  const openEvent = (event: TimelineEvent) => {
    setSelectedEvent(event);
    setDetailOpen(true);
    setMobileDetailOpen(true);
    setSelectedDay(event.date);
    syncUrl({ event: event.id, date: event.date });
  };

  const closeDetail = () => {
    // Desktop side panel stays available; mobile drawer can close.
    setMobileDetailOpen(false);
  };

  const removeChip = (key: string) => {
    const next = { ...filters };
    if (key === "eventType") next.eventType = "all";
    if (key === "severity") next.severity = "all";
    if (key === "category") next.category = "all";
    if (key === "province") next.province = "all";
    if (key === "city") next.city = "all";
    if (key === "organization") next.organization = "all";
    if (key === "agencyId") next.agencyId = "all";
    if (key === "verificationStatus") next.verificationStatus = "all";
    if (key === "hasResponse") next.hasResponse = "all";
    if (key === "hasImage") next.hasImage = false;
    if (key === "hasVideo") next.hasVideo = false;
    if (key === "source") next.source = "all";
    if (key === "dateRange") {
      next.dateFrom = "";
      next.dateTo = "";
    }
    setFilters(next);
    syncUrl({ filters: next });
  };

  const openDayModal = useCallback(
    (date: string) => {
      setSelectedDay(date);
      const day = rangedDays.find((d) => d.date === date);
      const top = day?.events[0] ?? null;
      if (top) setSelectedEvent(top);
      setDayModalOpen(true);
      syncUrl({
        date,
        event: top?.id ?? null,
      });
    },
    [rangedDays, syncUrl],
  );

  const changeView = (view: TimelineViewMode) => {
    setDayModalOpen(false);
    setSelectedView(view);
    timelineScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    syncUrl({ view });
  };

  useEffect(() => {
    timelineScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [selectedView]);

  const main = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 md:gap-3 md:pb-2">
      <div className="shrink-0 space-y-0 border-b border-[var(--border)] bg-[var(--background)] md:space-y-3 md:border-b-0">
        <TimelineHeader
          showViewSwitcher={
            selectedView !== "timeline" &&
            selectedView !== "day" &&
            selectedView !== "week" &&
            selectedView !== "month"
          }
          showDateFilters={
            selectedView !== "day" &&
            selectedView !== "week" &&
            selectedView !== "month"
          }
          searchQuery={searchInput}
          onSearchChange={setSearchInput}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateFromChange={(value) => {
            const next = { ...filters, dateFrom: value };
            setFilters(next);
            syncUrl({ filters: next });
          }}
          onDateToChange={(value) => {
            const next = { ...filters, dateTo: value };
            setFilters(next);
            syncUrl({ filters: next });
          }}
          onOpenFilters={() => setFiltersOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          activeFilterCount={activeFilterCount}
          selectedView={selectedView}
          onViewChange={changeView}
        />

        <AgencyFilterBar
          className="hidden md:block"
          value={filters.agencyId}
          onChange={(agencyId) => {
            const next = { ...filters, agencyId };
            setFilters(next);
            syncUrl({ filters: next });
          }}
        />

        {selectedView === "timeline" ? (
          <ActiveFilterChips
            className="hidden md:flex"
            chips={chips}
            onRemove={removeChip}
            onClearAll={() => {
              setFilters(defaultFilters);
              syncUrl({ filters: defaultFilters });
            }}
          />
        ) : null}

        {!loading && !error && selectedView === "timeline" && filteredDays.length > 0 ? (
          <div className="hidden md:block">
            <EventIntensityPanel
              days={rangedDays}
              activeDate={selectedDay}
              onSelectDay={(date) => scrollToDay(date, true)}
            />
          </div>
        ) : null}
      </div>

      <div
        ref={timelineScrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin pb-[var(--app-content-pad-bottom)] md:pb-0"
      >
        {loading ? <TimelineSkeleton /> : null}
        {error ? (
          <EmptyTimelineState
            title="دریافت اطلاعات با خطا مواجه شد."
            description={error}
            onRetry={() => window.location.reload()}
          />
        ) : null}

        {!loading && !error && selectedView === "timeline" ? (
          filteredDays.length === 0 ? (
            <EmptyTimelineState
              title={
                searchQuery
                  ? "نتیجه‌ای برای جست‌وجوی شما پیدا نشد."
                  : "در این بازه رویدادی ثبت نشده است."
              }
              onRetry={() => {
                setFilters(defaultFilters);
                setSearchInput("");
                setSearchQuery("");
              }}
            />
          ) : (
            <div className="space-y-0 md:space-y-4 md:pb-4">
              {filteredDays.map((day) => (
                <TimelineDaySection
                  key={day.date}
                  day={day}
                  collapsed={!!collapsedDays[day.date]}
                  isActive={selectedDay === day.date}
                  searchQuery={searchQuery}
                  selectedEventId={selectedEvent?.id}
                  showEnemy={dashboardSettings.showEnemySection}
                  showGovernment={dashboardSettings.showGovernmentSection}
                  relatedLookup={relatedLookup}
                  onToggle={(date) =>
                    setCollapsedDays((prev) => ({
                      ...prev,
                      [date]: !prev[date],
                    }))
                  }
                  onOpenEvent={openEvent}
                />
              ))}
            </div>
          )
        ) : null}

        {!loading && !error && selectedView === "day" ? (
          <DailyView
            days={rangedDays}
            selectedDay={selectedDay}
            selectedEventId={selectedEvent?.id ?? null}
            searchQuery={searchQuery}
            showEnemy={dashboardSettings.showEnemySection}
            showGovernment={dashboardSettings.showGovernmentSection}
            relatedLookup={relatedLookup}
            onSelectDay={(date) => {
              setSelectedDay(date);
              const day = rangedDays.find((d) => d.date === date);
              const top = day?.events[0] ?? null;
              if (top) setSelectedEvent(top);
              else setSelectedEvent(null);
              syncUrl({ date, view: "day", event: top?.id ?? null });
            }}
            onOpenEvent={openEvent}
          />
        ) : null}

        {!loading && !error && selectedView === "week" ? (
          <WeeklyView
            days={rangedDays}
            selectedDay={selectedDay}
            onSelectDay={openDayModal}
          />
        ) : null}
        {!loading && !error && selectedView === "month" ? (
          <MonthlyView
            days={rangedDays}
            selectedDay={selectedDay}
            onSelectDay={openDayModal}
          />
        ) : null}
        {!loading && !error && selectedView === "map" ? (
          <MapView
            days={filteredDays}
            onSelectProvince={(province) => {
              const next = { ...filters, province };
              setFilters(next);
              setSelectedView("timeline");
              syncUrl({ filters: next, view: "timeline" });
            }}
          />
        ) : null}
        {!loading && !error && selectedView === "analytics" ? (
          <AnalyticsView days={filteredDays} />
        ) : null}
      </div>

      {selectedView === "timeline" ? (
        <button
          type="button"
          onClick={() => scrollToDay(days[0]?.date ?? "")}
          className="app-floating-bottom fixed left-4 z-30 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/95 px-3 py-2 text-xs text-[var(--text-primary)] shadow-lg backdrop-blur-md"
          aria-label="بازگشت به امروز"
        >
          <ArrowUp className="h-3.5 w-3.5" />
          بازگشت به امروز
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <AppShell
        sidebar={
          <AppSidebar
            collapsed={sidebarCollapsed}
            mobileOpen={mobileMenuOpen}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            onCloseMobile={() => setMobileMenuOpen(false)}
            stats={{
              totalEvents: summary.totalEvents,
              enemy: summary.enemy,
              government: summary.government,
              activeUsers: summary.activeUsers,
            }}
          />
        }
        main={main}
        detail={
          <EventDetailPanel
            open
            event={selectedEvent}
            relatedResponses={relatedResponses}
            onClose={closeDetail}
            onOpenRelated={openEvent}
          />
        }
        detailOpen={
          (selectedView === "timeline" || selectedView === "day") && detailOpen
        }
        mobileNav={
          <MobileNavigation value={selectedView} onChange={changeView} />
        }
      />

      <DayDetailModal
        open={dayModalOpen}
        date={selectedDay}
        days={rangedDays}
        selectedEvent={selectedEvent}
        relatedResponses={relatedResponses}
        searchQuery={searchQuery}
        showEnemy={dashboardSettings.showEnemySection}
        showGovernment={dashboardSettings.showGovernmentSection}
        relatedLookup={relatedLookup}
        onClose={() => setDayModalOpen(false)}
        onOpenEvent={openEvent}
        onOpenRelated={openEvent}
      />

      <EventDetailModal
        open={mobileDetailOpen && !!selectedEvent}
        event={selectedEvent}
        relatedResponses={relatedResponses}
        onClose={closeDetail}
        onOpenRelated={openEvent}
      />

      <TimelineFilters
        open={filtersOpen}
        days={days}
        value={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setFilters(next);
          syncUrl({ filters: next });
        }}
      />

      {toast ? (
        <div className="app-floating-bottom fixed left-4 z-[70] max-w-[calc(100vw-2rem)] rounded-xl border border-amber-400/30 bg-[var(--surface-3)]/95 px-4 py-3 text-sm text-amber-100 shadow-xl backdrop-blur-md">
          {toast}
        </div>
      ) : null}
    </>
  );
}
