"use client";

import { EventCard } from "@taghvim/components/timeline/EventCard";
import {
  TimelineNode,
  TIMELINE_RAIL_RIGHT,
} from "@taghvim/components/timeline/TimelineNode";
import { groupSimilarEnemyEventsForAdmin } from "@taghvim/lib/enemy-similarity";
import type { TimelineEvent } from "@taghvim/types/timeline";
import clsx from "clsx";
import { Users } from "lucide-react";

type TimelineEventGroupProps = {
  title: string;
  tone: "enemy" | "government";
  events: TimelineEvent[];
  searchQuery: string;
  selectedEventId?: string | null;
  /** When true, similar enemy actions collapse into one admin box */
  groupSimilarEnemy?: boolean;
  /** Highlight the timeline rail for the active day section */
  illuminateRail?: boolean;
  relatedLookup: (event: TimelineEvent) => {
    hasResponse: boolean;
    responseTimeMinutes?: number;
  };
  onOpen: (event: TimelineEvent) => void;
};

export function TimelineEventGroup({
  title,
  tone,
  events,
  searchQuery,
  selectedEventId,
  groupSimilarEnemy = false,
  illuminateRail = false,
  relatedLookup,
  onOpen,
}: TimelineEventGroupProps) {
  const isEnemy = tone === "enemy";
  const railPad = TIMELINE_RAIL_RIGHT * 2;
  const displayEvents =
    isEnemy && groupSimilarEnemy
      ? groupSimilarEnemyEventsForAdmin(events)
      : events;
  const hiddenDuplicates = Math.max(0, events.length - displayEvents.length);

  return (
    <section
      className={clsx(
        illuminateRail &&
          !isEnemy &&
          "rounded-2xl border border-[var(--government-border)]/35 bg-[var(--government-soft)]/20 px-2 py-2 md:px-3",
      )}
    >
      <div
        className="mb-2 flex flex-wrap items-center gap-2"
        style={{ direction: "rtl", paddingRight: railPad }}
      >
        <span
          className="inline-block rounded-full"
          style={{
            width: 7,
            height: 7,
            background: isEnemy ? "var(--enemy)" : "var(--government)",
          }}
        />
        <h4
          className="text-[15px] font-bold"
          style={{ color: isEnemy ? "var(--enemy)" : "var(--government)" }}
        >
          {title}
        </h4>
        <span className="rounded-md bg-[var(--hover)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
          {displayEvents.length.toLocaleString("fa-IR")}
          {hiddenDuplicates > 0
            ? ` نمایش · ${events.length.toLocaleString("fa-IR")} گزارش`
            : ""}
        </span>
        {isEnemy && groupSimilarEnemy && hiddenDuplicates > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700">
            <Users className="h-3 w-3" />
            گزارش‌های مشابه ادغام شدند
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {displayEvents.map((event) => {
          const related = relatedLookup(event);
          const size =
            event.severity === "critical" || event.severity === "high"
              ? "lg"
              : event.severity === "medium"
                ? "md"
                : "sm";
          const selected = selectedEventId === event.id;
          const reportCount = (event.duplicateReports?.length ?? 0) + 1;

          return (
            <div
              key={event.id}
              className="relative"
              style={{ paddingRight: railPad }}
            >
              <TimelineNode tone={tone} size={size} active={selected} />
              <div className="space-y-1.5">
                <EventCard
                  event={event}
                  searchQuery={searchQuery}
                  selected={selected}
                  hasResponse={related.hasResponse}
                  responseTimeMinutes={related.responseTimeMinutes}
                  onOpen={onOpen}
                />
                {reportCount > 1 ? (
                  <DuplicateReportsBox
                    event={event}
                    reportCount={reportCount}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
        {displayEvents.length === 0 ? (
          <p
            className="text-xs text-[var(--text-muted)]"
            style={{ paddingRight: railPad }}
          >
            موردی در این بخش نیست.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function DuplicateReportsBox({
  event,
  reportCount,
}: {
  event: TimelineEvent;
  reportCount: number;
}) {
  const reporters = [
    event.createdByName || "ثبت‌کننده اصلی",
    ...(event.duplicateReports ?? []).map(
      (r) => r.createdByName || "کاربر دیگر",
    ),
  ];
  const uniqueNames = Array.from(new Set(reporters));

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
      <p className="font-semibold text-amber-700 dark:text-amber-300">
        {reportCount.toLocaleString("fa-IR")} گزارش مشابه از کاربران مختلف
      </p>
      <p className="mt-1 leading-5">
        سیستم تشخیص داد این اقدام‌ها یکی هستند و فقط در نمای ادمین در یک باکس
        نشان داده می‌شوند. هر کاربر در «محتوای من» گزارش خودش را جدا می‌بیند.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {uniqueNames.map((name) => (
          <span
            key={name}
            className="rounded-md bg-[var(--panel)] px-2 py-0.5 text-[10px] text-[var(--text-primary)]"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
