"use client";

import { TimelineDot } from "@taghvim/components/event-day/TimelineDot";
import type { EventItem } from "@taghvim/types/event-day";

type TimelineRailProps = {
  enemyEvents: EventItem[];
  governmentEvents: EventItem[];
  selectedEventId?: string | null;
};

export function TimelineRail({
  enemyEvents,
  governmentEvents,
  selectedEventId,
}: TimelineRailProps) {
  return (
    <div className="relative h-full w-[34px] shrink-0">
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: 46,
          bottom: 28,
          width: 1,
          background:
            "linear-gradient(180deg, rgba(56, 74, 105, 0.45), rgba(83, 105, 140, 0.7), rgba(56, 74, 105, 0.45))",
        }}
      />

      <TimelineDot tone="enemy" size="sm" />

      {/* Mirror events column vertical rhythm for pixel alignment */}
      <div className="flex h-full flex-col">
        <div className="h-[38px] shrink-0" />
        <div className="h-2 shrink-0" />
        <div className="mb-2 h-[23px] shrink-0" />
        {enemyEvents.map((event, index) => (
          <div
            key={event.id}
            className="flex h-[113px] shrink-0 items-center justify-center"
            style={{
              marginBottom: index < enemyEvents.length - 1 ? 8 : 0,
            }}
          >
            <TimelineDot
              tone="enemy"
              active={selectedEventId === event.id}
            />
          </div>
        ))}
        <div className="h-5 shrink-0" />
        <div className="mb-2 h-[23px] shrink-0" />
        {governmentEvents.map((event, index) => (
          <div
            key={event.id}
            className="flex h-[113px] shrink-0 items-center justify-center"
            style={{
              marginBottom: index < governmentEvents.length - 1 ? 8 : 0,
            }}
          >
            <TimelineDot
              tone="government"
              active={selectedEventId === event.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
