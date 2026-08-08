"use client";

import { EventCard } from "@taghvim/components/timeline/EventCard";
import { intensityColor, intensityLabel } from "@taghvim/lib/timeline";
import type { TimelineDay, TimelineEvent } from "@taghvim/types/timeline";
import clsx from "clsx";
import { Bug, Shield } from "lucide-react";

type DayFullViewProps = {
  day: TimelineDay;
  searchQuery?: string;
  selectedEventId?: string | null;
  showEnemy?: boolean;
  showGovernment?: boolean;
  relatedLookup: (event: TimelineEvent) => {
    hasResponse: boolean;
    responseTimeMinutes?: number;
  };
  onOpenEvent: (event: TimelineEvent) => void;
};

export function DayFullView({
  day,
  searchQuery = "",
  selectedEventId = null,
  showEnemy = true,
  showGovernment = true,
  relatedLookup,
  onOpenEvent,
}: DayFullViewProps) {
  const enemyEvents = day.events.filter((e) => e.eventType === "enemy");
  const govEvents = day.events.filter((e) => e.eventType === "government");
  const hasEvents = day.totalEvents > 0;
  const tone = intensityColor(day.intensity);

  return (
    <section className="space-y-4" style={{ direction: "rtl", textAlign: "right" }}>
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="m-0 text-lg font-bold text-[var(--text-primary)] sm:text-xl">
              {day.weekday}، {day.persianDate}
            </h2>
            <p className="m-0 text-xs text-[var(--text-secondary)]">
              رویدادهای این روز به‌صورت کارت — دشمن و دولت جدا
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
              {day.totalEvents.toLocaleString("fa-IR")} رویداد
            </span>
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-[var(--enemy)]">
              {day.enemyActionsCount.toLocaleString("fa-IR")} دشمن
            </span>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-[var(--government)]">
              {day.governmentActionsCount.toLocaleString("fa-IR")} دولت
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: tone }}
            >
              {intensityLabel(day.intensity)}
            </span>
          </div>
        </div>
      </header>

      {!hasEvents ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
          برای این روز رویدادی ثبت نشده است.
        </div>
      ) : (
        <div
          className={clsx(
            "grid gap-4",
            showEnemy && showGovernment ? "xl:grid-cols-2" : "grid-cols-1",
          )}
        >
          {showEnemy ? (
            <DaySectionCard
              title="اقدامات دشمن"
              tone="enemy"
              count={enemyEvents.length}
              icon={Bug}
              events={enemyEvents}
              searchQuery={searchQuery}
              selectedEventId={selectedEventId}
              relatedLookup={relatedLookup}
              onOpen={onOpenEvent}
            />
          ) : null}

          {showGovernment ? (
            <DaySectionCard
              title="اقدامات دولت"
              tone="government"
              count={govEvents.length}
              icon={Shield}
              events={govEvents}
              searchQuery={searchQuery}
              selectedEventId={selectedEventId}
              relatedLookup={relatedLookup}
              onOpen={onOpenEvent}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

function DaySectionCard({
  title,
  tone,
  count,
  icon: Icon,
  events,
  searchQuery,
  selectedEventId,
  relatedLookup,
  onOpen,
}: {
  title: string;
  tone: "enemy" | "government";
  count: number;
  icon: typeof Bug;
  events: TimelineEvent[];
  searchQuery: string;
  selectedEventId?: string | null;
  relatedLookup: (event: TimelineEvent) => {
    hasResponse: boolean;
    responseTimeMinutes?: number;
  };
  onOpen: (event: TimelineEvent) => void;
}) {
  const isEnemy = tone === "enemy";

  return (
    <section
      className={clsx(
        "rounded-2xl border p-3 sm:p-4",
        isEnemy
          ? "border-[var(--enemy-border)] bg-[var(--enemy-soft)]/40"
          : "border-[var(--government-border)] bg-[var(--government-soft)]/40",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "flex h-9 w-9 items-center justify-center rounded-xl border",
              isEnemy
                ? "border-[var(--enemy-border)] bg-[var(--panel)] text-[var(--enemy)]"
                : "border-[var(--government-border)] bg-[var(--panel)] text-[var(--government)]",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3
              className="m-0 text-[15px] font-bold"
              style={{ color: isEnemy ? "var(--enemy)" : "var(--government)" }}
            >
              {title}
            </h3>
            <p className="m-0 text-[11px] text-[var(--text-muted)]">
              {count.toLocaleString("fa-IR")} مورد
            </p>
          </div>
        </div>
      </header>

      {events.length === 0 ? (
        <p className="m-0 rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel)]/70 px-3 py-8 text-center text-xs text-[var(--text-muted)]">
          موردی در این بخش نیست.
        </p>
      ) : (
        <div className="grid gap-3">
          {events.map((event) => {
            const related = relatedLookup(event);
            return (
              <EventCard
                key={event.id}
                event={event}
                searchQuery={searchQuery}
                selected={selectedEventId === event.id}
                hasResponse={related.hasResponse}
                responseTimeMinutes={related.responseTimeMinutes}
                layout="stack"
                onOpen={onOpen}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
