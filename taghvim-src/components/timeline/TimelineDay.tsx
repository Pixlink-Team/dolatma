"use client";

import { TimelineEventGroup } from "@taghvim/components/timeline/TimelineEventGroup";
import { TIMELINE_RAIL_RIGHT } from "@taghvim/components/timeline/TimelineNode";
import type { TimelineDay, TimelineEvent } from "@taghvim/types/timeline";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

type TimelineDaySectionProps = {
  day: TimelineDay;
  collapsed: boolean;
  isActive: boolean;
  searchQuery: string;
  selectedEventId?: string | null;
  showEnemy?: boolean;
  showGovernment?: boolean;
  relatedLookup: (event: TimelineEvent) => {
    hasResponse: boolean;
    responseTimeMinutes?: number;
  };
  onToggle: (date: string) => void;
  onOpenEvent: (event: TimelineEvent) => void;
};

export function TimelineDaySection({
  day,
  collapsed,
  isActive,
  searchQuery,
  selectedEventId,
  showEnemy = true,
  showGovernment = true,
  relatedLookup,
  onToggle,
  onOpenEvent,
}: TimelineDaySectionProps) {
  const enemyEvents = day.events.filter((e) => e.eventType === "enemy");
  const govEvents = day.events.filter((e) => e.eventType === "government");

  return (
    <section
      id={`day-${day.date}`}
      className={clsx(
        "border bg-[var(--panel)] transition md:rounded-2xl",
        "rounded-none border-x-0 border-t border-b first:border-t-0 md:border",
        isActive
          ? "border-[var(--primary)]/40 md:border-[var(--primary)]/40"
          : "border-[var(--border)]",
        day.isCritical && "ring-1 ring-red-500/20",
      )}
      style={{ scrollMarginTop: 0 }}
    >
      <button
        type="button"
        onClick={() => onToggle(day.date)}
        className="sticky top-0 z-20 flex min-h-12 w-full items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-3 text-right shadow-[0_1px_0_var(--border)] sm:gap-3 sm:px-3"
        aria-expanded={!collapsed}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <h3 className="m-0 truncate text-[15px] font-bold leading-[1.4] text-[var(--text-primary)] sm:text-[18px]">
            {day.weekday}، {day.persianDate}
          </h3>
          <span className="rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)] sm:px-2.5 sm:py-1 sm:text-[11px]">
            {day.totalEvents.toLocaleString("fa-IR")} رویداد
          </span>
          <span className="hidden rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-[var(--enemy)] sm:inline">
            {day.enemyActionsCount.toLocaleString("fa-IR")} دشمن
          </span>
          <span className="hidden rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-[var(--government)] sm:inline">
            {day.governmentActionsCount.toLocaleString("fa-IR")} دولت
          </span>
        </div>
        <ChevronDown
          className={clsx(
            "h-5 w-5 shrink-0 text-[var(--text-secondary)] transition",
            !collapsed && "rotate-180",
          )}
        />
      </button>

      {!collapsed ? (
        <div className="relative space-y-5 py-3 pl-3">
          <div
            className="pointer-events-none absolute bottom-6 top-6 z-[1] w-px transition-all duration-300"
            style={{
              right: TIMELINE_RAIL_RIGHT,
              transform: "translateX(50%)",
              background: isActive
                ? "linear-gradient(180deg, var(--enemy) 0%, var(--government) 52%, var(--primary) 100%)"
                : "var(--border)",
              boxShadow: isActive
                ? "0 0 14px rgba(59, 130, 246, 0.35), 0 0 8px rgba(239, 68, 68, 0.25)"
                : undefined,
            }}
          />

          {showEnemy ? (
            <TimelineEventGroup
              title="اقدامات دشمن"
              tone="enemy"
              events={enemyEvents}
              searchQuery={searchQuery}
              selectedEventId={selectedEventId}
              groupSimilarEnemy
              relatedLookup={relatedLookup}
              onOpen={onOpenEvent}
            />
          ) : null}
          {showGovernment ? (
            <TimelineEventGroup
              title="اقدامات دولت / پای کار مردم"
              tone="government"
              illuminateRail={isActive}
              events={govEvents}
              searchQuery={searchQuery}
              selectedEventId={selectedEventId}
              relatedLookup={relatedLookup}
              onOpen={onOpenEvent}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
