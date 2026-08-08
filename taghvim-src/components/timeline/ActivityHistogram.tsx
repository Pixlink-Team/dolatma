"use client";

import {
  dayMaxEvents,
  intensityColor,
  intensityLabel,
} from "@taghvim/lib/timeline";
import type { TimelineDay } from "@taghvim/types/timeline";
import clsx from "clsx";
import { useState } from "react";

type ActivityHistogramProps = {
  days: TimelineDay[];
  activeDate: string | null;
  onSelectDay: (date: string) => void;
};

export function ActivityHistogram({
  days,
  activeDate,
  onSelectDay,
}: ActivityHistogramProps) {
  const max = dayMaxEvents(days);
  const [hovered, setHovered] = useState<string | null>(null);
  const visible = days.slice(0, 18);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">شدت رویدادها</h3>
        <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-sm bg-blue-500" /> کم
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-sm bg-orange-500" /> متوسط
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-sm bg-red-500" /> زیاد
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Vertical intensity legend (RTL: appears on the right of chart) */}
        <div className="hidden w-4 flex-col justify-between py-1 sm:flex">
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                "linear-gradient(to bottom, #F87171, #EF4444, #F97316, #3B82F6)",
            }}
            title="شدت"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex h-32 items-end gap-1.5 overflow-x-auto pb-1 scrollbar-thin sm:gap-2">
            {visible.map((day) => {
              const height = Math.max(14, Math.round((day.totalEvents / max) * 100));
              const color = intensityColor(day.intensity);
              const isActive = activeDate === day.date;
              const isHovered = hovered === day.date;
              const shortDate = day.persianDate.split(" ").slice(0, 2).join(" ");

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => onSelectDay(day.date)}
                  onMouseEnter={() => setHovered(day.date)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(day.date)}
                  onBlur={() => setHovered(null)}
                  className="group relative flex min-w-[36px] flex-1 flex-col items-center justify-end"
                  aria-label={`روز ${day.persianDate}`}
                >
                  {(isHovered || isActive) && (
                    <div className="absolute bottom-[calc(100%+10px)] z-10 w-40 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2 text-right text-[11px] shadow-xl">
                      <p className="font-semibold text-[var(--text-primary)]">{day.persianDate}</p>
                      <p className="mt-1 text-[var(--text-secondary)]">
                        {day.totalEvents.toLocaleString("fa-IR")} رویداد
                      </p>
                      <p className="text-[var(--enemy)]">
                        {day.enemyActionsCount.toLocaleString("fa-IR")} اقدام دشمن
                      </p>
                      <p className="text-[var(--government)]">
                        {day.governmentActionsCount.toLocaleString("fa-IR")} اقدام دولت
                      </p>
                      <p className="text-[var(--text-muted)]">
                        شدت: {intensityLabel(day.intensity)}
                      </p>
                    </div>
                  )}

                  <div
                    className={clsx(
                      "w-full max-w-[28px] rounded-t-md transition-all duration-200",
                      isActive && "ring-2 ring-blue-400/80",
                    )}
                    style={{
                      height: `${height}%`,
                      backgroundColor: color,
                      boxShadow: isActive ? `0 0 14px ${color}55` : undefined,
                    }}
                  />

                  <span
                    className={clsx(
                      "mt-2 max-w-[52px] truncate rounded-full px-1.5 py-0.5 text-[9px]",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-[var(--text-muted)]",
                    )}
                  >
                    {shortDate}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
