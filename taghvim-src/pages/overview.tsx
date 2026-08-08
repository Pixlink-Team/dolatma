"use client";

import { AppShell } from "@taghvim/components/layout/AppShell";
import { AppSidebar, MobileMenuButton } from "@taghvim/components/layout/AppSidebar";
import { OverviewDashboard } from "@taghvim/components/overview/OverviewDashboard";
import { computeSummary } from "@taghvim/data/timeline.mock";
import { fetchTimeline } from "@taghvim/lib/api";
import { getCurrentUser } from "@taghvim/lib/auth";
import { mapTimelineResponseToDays } from "@taghvim/lib/map-calendar-to-timeline";
import { loadTimelineDays } from "@taghvim/lib/timeline-store";
import type { TimelineDay } from "@taghvim/types/timeline";
import { Suspense, useEffect, useMemo, useState } from "react";

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
        governmentActionsCount: events.filter(
          (e) => e.eventType === "government",
        ).length,
      };
    })
    .filter((day): day is TimelineDay => day != null);
}

function OverviewContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [days, setDays] = useState<TimelineDay[]>([]);
  const summary = useMemo(() => computeSummary(days), [days]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetchTimeline();
        if (cancelled) return;
        setDays(mapTimelineResponseToDays(response));
      } catch {
        if (cancelled) return;
        setDays(scopeDaysToCurrentUser(loadTimelineDays()));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell
      sidebar={
        <AppSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          onCloseMobile={() => setMobileOpen(false)}
          stats={{
            totalEvents: summary.totalEvents,
            enemy: summary.enemy,
            government: summary.government,
            activeUsers: summary.activeUsers,
          }}
        />
      }
      main={
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]">
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 lg:hidden">
            <MobileMenuButton onClick={() => setMobileOpen(true)} />
            <p className="m-0 text-sm font-semibold text-[var(--text-primary)]">
              نمای کلی
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin">
            {days.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--text-secondary)]">
                داده‌ای برای نمایش وجود ندارد. از پنل ادمین می‌توانید داده نمونه را
                بازیابی کنید یا رویداد واقعی ثبت کنید.
              </div>
            ) : (
              <OverviewDashboard days={days} />
            )}
          </div>
        </div>
      }
    />
  );
}

export default function OverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-[var(--text-secondary)]">در حال بارگذاری...</div>
      }
    >
      <OverviewContent />
    </Suspense>
  );
}
