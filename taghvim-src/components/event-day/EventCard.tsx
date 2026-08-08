"use client";

import type { EventItem, EventStatusColor } from "@taghvim/types/event-day";
import clsx from "clsx";

type EventCardProps = {
  event: EventItem;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

const STATUS_STYLES: Record<EventStatusColor, string> = {
  red: "linear-gradient(180deg, #D93643, #B91E30)",
  orange: "linear-gradient(180deg, #F47742, #D04C2D)",
  green: "linear-gradient(180deg, #32B894, #16836E)",
  blue: "linear-gradient(180deg, #408CE9, #2266C3)",
};

export function EventCard({ event, selected = false, onSelect }: EventCardProps) {
  const isEnemy = event.type === "enemy";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(event.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect?.(event.id);
      }}
      className={clsx(
        "relative min-h-[113px] overflow-hidden rounded-[11px] p-2 outline-none",
        selected && isEnemy && "event-card-selected",
      )}
      style={{
        direction: "ltr",
        background: isEnemy
          ? "linear-gradient(90deg, rgba(46, 16, 27, 0.92) 0%, rgba(37, 15, 28, 0.92) 55%, rgba(28, 17, 29, 0.92) 100%)"
          : "linear-gradient(90deg, rgba(13, 36, 67, 0.95) 0%, rgba(12, 31, 58, 0.95) 55%, rgba(10, 25, 47, 0.95) 100%)",
        border: selected
          ? isEnemy
            ? "1px solid rgba(255, 90, 98, 0.85)"
            : "1px solid rgba(85, 161, 255, 0.85)"
          : isEnemy
            ? "1px solid rgba(210, 48, 59, 0.58)"
            : "1px solid rgba(46, 116, 210, 0.62)",
        boxShadow: selected
          ? isEnemy
            ? "0 0 18px rgba(239, 68, 68, 0.22), inset 0 0 24px rgba(185, 28, 47, 0.05)"
            : "0 0 18px rgba(59, 130, 246, 0.22)"
          : isEnemy
            ? "inset 0 0 24px rgba(185, 28, 47, 0.05)"
            : "none",
      }}
    >
      <div className="grid h-full grid-cols-1 items-stretch gap-2 sm:grid-cols-[minmax(100px,190px)_minmax(0,1fr)_minmax(0,130px)]">
        <div className="relative h-[140px] w-full shrink-0 self-center overflow-hidden rounded-[9px] sm:h-[96px] sm:w-[190px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/35" />
          <span
            className="absolute top-1.5 left-1.5 rounded-lg px-2.5 py-1 text-[10px] font-medium text-white"
            style={{
              background: STATUS_STYLES[event.statusColor],
              boxShadow:
                event.statusColor === "red"
                  ? "0 2px 10px rgba(215, 40, 56, 0.32)"
                  : "none",
            }}
          >
            {event.status}
          </span>
          <div
            className="pointer-events-none absolute inset-0 rounded-[9px]"
            style={{
              border: isEnemy
                ? "1px solid rgba(239, 68, 68, 0.58)"
                : "1px solid rgba(59, 130, 246, 0.45)",
            }}
          />
        </div>

        <div
          className="min-w-0 self-center py-0.5"
          style={{ direction: "rtl", textAlign: "right" }}
        >
          <h3
            className="mb-[7px] text-[15px] font-bold leading-snug"
            style={{ color: "#F5F2F4" }}
          >
            {event.title}
          </h3>
          <p
            className="line-clamp-3 text-[11px] leading-[1.85]"
            style={{ color: "#BEB4BA" }}
          >
            {event.description}
          </p>
        </div>

        <div
          className="hidden h-full flex-col items-end justify-between py-1 sm:flex"
          style={{ direction: "ltr" }}
        >
          <span
            className="text-[12px]"
            style={{
              color: isEnemy ? "#FF6166" : "#55A1FF",
              textAlign: "left",
            }}
          >
            {event.time}
          </span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-[10px]"
                style={{
                  background: "transparent",
                  border: isEnemy
                    ? "1px solid rgba(229, 53, 65, 0.55)"
                    : "1px solid rgba(47, 124, 228, 0.65)",
                  color: isEnemy ? "#FF5961" : "#55A1FF",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
