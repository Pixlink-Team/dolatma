"use client";

import type { TimelineEvent } from "@taghvim/types/timeline";
import { FileImage } from "lucide-react";

type WeeklyTopEventProps = {
  event: TimelineEvent | null;
};

export function WeeklyTopEvent({ event }: WeeklyTopEventProps) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[var(--text-secondary)]">مهم‌ترین رویداد</p>
      {event ? (
        <>
          <div className="relative h-[92px] overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)]">
            {event.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
                <FileImage className="h-5 w-5" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          </div>
          <p className="line-clamp-2 text-[12px] font-medium leading-5 text-[var(--text-primary)]">
            {event.title}
          </p>
          <p
            className="text-[11px] tabular-nums"
            style={{
              color:
                event.eventType === "enemy"
                  ? "var(--enemy)"
                  : "var(--government)",
            }}
          >
            {event.time}
          </p>
        </>
      ) : (
        <p className="rounded-[10px] border border-dashed border-[var(--border)] px-2 py-6 text-center text-[11px] text-[var(--text-muted)]">
          رویدادی ثبت نشده است
        </p>
      )}
    </div>
  );
}
