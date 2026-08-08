"use client";

import type { WeekOption } from "@taghvim/lib/weekly";
import {
  startOfWeekSaturday,
  toWeeklyDateString,
} from "@taghvim/lib/weekly";
import clsx from "clsx";
import { useMemo } from "react";

type WeeklyWeekSelectorProps = {
  weeks: WeekOption[];
  activeStartDate: string;
  onSelectWeek: (startDate: string) => void;
};

/** Horizontal week chips only — calendar opens from the week range label. */
export function WeeklyWeekSelector({
  weeks,
  activeStartDate,
  onSelectWeek,
}: WeeklyWeekSelectorProps) {
  const activeWeekStart = useMemo(() => {
    return toWeeklyDateString(startOfWeekSaturday(activeStartDate));
  }, [activeStartDate]);

  return (
    <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1 scrollbar-thin">
      {weeks.map((week) => {
        const selected = week.startDate === activeWeekStart;
        return (
          <button
            key={week.startDate}
            type="button"
            onClick={() => onSelectWeek(week.startDate)}
            title={week.shortRange}
            className={clsx(
              "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
              selected
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]",
            )}
          >
            {week.label}
          </button>
        );
      })}
    </div>
  );
}
