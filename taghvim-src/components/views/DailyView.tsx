"use client";

import {
  DailyToolbar,
  resolveDay,
  shiftCalendarDay,
} from "@taghvim/components/views/daily/DailyToolbar";
import { DayFullView } from "@taghvim/components/views/daily/DayFullView";
import type { TimelineDay, TimelineEvent } from "@taghvim/types/timeline";
import { useMemo } from "react";

type DailyViewProps = {
  days: TimelineDay[];
  selectedDay?: string | null;
  selectedEventId?: string | null;
  searchQuery?: string;
  showEnemy?: boolean;
  showGovernment?: boolean;
  relatedLookup: (event: TimelineEvent) => {
    hasResponse: boolean;
    responseTimeMinutes?: number;
  };
  onSelectDay: (date: string) => void;
  onOpenEvent: (event: TimelineEvent) => void;
};

export function DailyView({
  days,
  selectedDay = null,
  selectedEventId = null,
  searchQuery = "",
  showEnemy = true,
  showGovernment = true,
  relatedLookup,
  onSelectDay,
  onOpenEvent,
}: DailyViewProps) {
  const sortedDays = useMemo(
    () => [...days].sort((a, b) => a.date.localeCompare(b.date)),
    [days],
  );

  const minDate = sortedDays[0]?.date ?? null;
  const maxDate = sortedDays[sortedDays.length - 1]?.date ?? null;

  const activeDate =
    selectedDay &&
    (!minDate || !maxDate || (selectedDay >= minDate && selectedDay <= maxDate))
      ? selectedDay
      : maxDate ?? selectedDay;

  const day = resolveDay(sortedDays, activeDate);

  const canGoPrev = !!minDate && day.date > minDate;
  const canGoNext = !!maxDate && day.date < maxDate;

  return (
    <section className="space-y-3" style={{ direction: "rtl" }}>
      <DailyToolbar
        day={day}
        dayOptions={sortedDays}
        onPickDay={onSelectDay}
        minDate={minDate}
        maxDate={maxDate}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrevDay={() => {
          const next = shiftCalendarDay(day.date, -1);
          if (!minDate || next >= minDate) onSelectDay(next);
        }}
        onNextDay={() => {
          const next = shiftCalendarDay(day.date, 1);
          if (!maxDate || next <= maxDate) onSelectDay(next);
        }}
      />

      <DayFullView
        day={day}
        searchQuery={searchQuery}
        selectedEventId={selectedEventId}
        showEnemy={showEnemy}
        showGovernment={showGovernment}
        relatedLookup={relatedLookup}
        onOpenEvent={onOpenEvent}
      />
    </section>
  );
}
