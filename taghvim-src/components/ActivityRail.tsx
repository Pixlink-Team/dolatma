"use client";

import { activityColor } from "@taghvim/lib/activity";
import type { CalendarDay } from "@taghvim/types/calendar";
import clsx from "clsx";

type ActivityRailProps = {
  days: CalendarDay[];
  maxScore: number;
  activeDate?: string | null;
  onSelect: (date: string) => void;
};

export function ActivityRail({
  days,
  maxScore,
  activeDate,
  onSelect,
}: ActivityRailProps) {
  return (
    <aside className="sticky top-28 hidden h-[70vh] w-10 shrink-0 flex-col items-center lg:flex">
      <p className="mb-3 rotate-180 text-[10px] tracking-widest text-slate-400 [writing-mode:vertical-rl]">
        شدت فعالیت
      </p>
      <div className="flex h-full w-3 flex-col gap-1 overflow-hidden rounded-full bg-slate-800/80 p-0.5">
        {days.map((day) => {
          const color = activityColor(day.activity_score, maxScore);
          const isActive = activeDate === day.date;

          return (
            <button
              key={day.id}
              type="button"
              title={day.date}
              onClick={() => onSelect(day.date)}
              className={clsx(
                "w-full flex-1 rounded-full transition-all",
                isActive && "ring-2 ring-white/70 scale-x-125",
              )}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
    </aside>
  );
}
