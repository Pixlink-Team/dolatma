"use client";

import { EventCard } from "@taghvim/components/event-day/EventCard";
import type { EventItem } from "@taghvim/types/event-day";

type EventSectionProps = {
  title: string;
  tone: "enemy" | "government";
  events: EventItem[];
  selectedEventId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
};

export function EventSection({
  title,
  tone,
  events,
  selectedEventId,
  onSelect,
  className,
}: EventSectionProps) {
  const isEnemy = tone === "enemy";

  return (
    <section
      className={className}
      style={{ direction: "rtl", textAlign: "right" }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-block rounded-full"
          style={{
            width: 7,
            height: 7,
            background: isEnemy ? "#EF3945" : "#4196FF",
          }}
        />
        <h3
          className="text-[15px] font-bold"
          style={{ color: isEnemy ? "#FF474D" : "#4196FF" }}
        >
          {title}
        </h3>
      </div>

      <div className="flex flex-col gap-2">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            selected={selectedEventId === event.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
