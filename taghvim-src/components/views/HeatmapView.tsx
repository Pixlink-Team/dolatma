"use client";

import { intensityColor, intensityLabel } from "@taghvim/lib/timeline";
import type { TimelineDay } from "@taghvim/types/timeline";
import { useState } from "react";

type HeatmapViewProps = {
  days: TimelineDay[];
  onSelectDay: (date: string) => void;
};

export function HeatmapView({ days, onSelectDay }: HeatmapViewProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">نقشه حرارتی فعالیت</h3>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        هر خانه یک روز است — رنگ پررنگ‌تر یعنی شدت بالاتر
      </p>
      <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelectDay(day.date)}
            onMouseEnter={() => setHovered(day.date)}
            onMouseLeave={() => setHovered(null)}
            className="relative aspect-square rounded-lg transition hover:scale-105"
            style={{ backgroundColor: intensityColor(day.intensity) }}
            aria-label={day.persianDate}
          >
            {hovered === day.date ? (
              <div className="absolute bottom-[110%] left-1/2 z-10 w-40 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2 text-[11px] text-right shadow-xl">
                <p className="font-semibold text-[var(--text-primary)]">{day.persianDate}</p>
                <p>مجموع: {day.totalEvents.toLocaleString("fa-IR")}</p>
                <p className="text-red-300">
                  دشمن: {day.enemyActionsCount.toLocaleString("fa-IR")}
                </p>
                <p className="text-blue-300">
                  دولت: {day.governmentActionsCount.toLocaleString("fa-IR")}
                </p>
                <p>شدت: {intensityLabel(day.intensity)}</p>
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
