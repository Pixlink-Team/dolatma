"use client";

import { DayHeader } from "@taghvim/components/event-day/DayHeader";
import { EventSection } from "@taghvim/components/event-day/EventSection";
import { TimelineRail } from "@taghvim/components/event-day/TimelineRail";
import { eventDayMock } from "@taghvim/data/event-day.mock";
import type { EventDayMock } from "@taghvim/types/event-day";
import { useMemo, useState } from "react";

type EventDayViewProps = {
  data?: EventDayMock;
  selectedEventId?: string | null;
  onSelectEvent?: (id: string) => void;
};

export function EventDayView({
  data = eventDayMock,
  selectedEventId: controlledSelectedId,
  onSelectEvent,
}: EventDayViewProps) {
  const [internalSelectedId, setInternalSelectedId] = useState(
    controlledSelectedId ?? data.events[0]?.id ?? "",
  );

  const selectedEventId = controlledSelectedId ?? internalSelectedId;

  const enemyEvents = useMemo(
    () => data.events.filter((e) => e.type === "enemy"),
    [data.events],
  );
  const governmentEvents = useMemo(
    () => data.events.filter((e) => e.type === "government"),
    [data.events],
  );

  function handleSelect(id: string) {
    if (controlledSelectedId == null) setInternalSelectedId(id);
    onSelectEvent?.(id);
  }

  return (
    <div
      className="event-day-view w-full max-w-full overflow-hidden rounded-xl"
      style={{
        direction: "ltr",
        background: "#07101F",
        padding: 9,
        minHeight: 620,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 34px",
        gap: 16,
      }}
    >
      <div className="events-column min-w-0">
        <DayHeader
          title={data.dayTitle}
          eventCountLabel={data.eventCountLabel}
        />
        <EventSection
          className="mt-2"
          title="اقدامات دشمن"
          tone="enemy"
          events={enemyEvents}
          selectedEventId={selectedEventId}
          onSelect={handleSelect}
        />
        <EventSection
          className="mt-5"
          title="اقدامات دولت"
          tone="government"
          events={governmentEvents}
          selectedEventId={selectedEventId}
          onSelect={handleSelect}
        />
      </div>

      <div className="timeline-column">
        <TimelineRail
          enemyEvents={enemyEvents}
          governmentEvents={governmentEvents}
          selectedEventId={selectedEventId}
        />
      </div>
    </div>
  );
}
