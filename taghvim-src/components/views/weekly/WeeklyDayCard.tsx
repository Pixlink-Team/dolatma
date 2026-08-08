"use client";

import { WeeklyDayDonut } from "@taghvim/components/views/weekly/WeeklyDayDonut";
import { WeeklyIntensityBadge } from "@taghvim/components/views/weekly/WeeklyIntensityBadge";
import { WeeklyMiniBarChart } from "@taghvim/components/views/weekly/WeeklyMiniBarChart";
import { WeeklyTopEvent } from "@taghvim/components/views/weekly/WeeklyTopEvent";
import type { WeeklyDayModel } from "@taghvim/lib/weekly";
import clsx from "clsx";

type WeeklyDayCardProps = {
  model: WeeklyDayModel;
  selected?: boolean;
  onSelect: (date: string) => void;
  className?: string;
};

export function WeeklyDayCard({
  model,
  selected = false,
  onSelect,
  className,
}: WeeklyDayCardProps) {
  const { day, topEvent, hourlyBars, intensityLevel } = model;
  const enemyHeavy = day.enemyActionsCount >= day.governmentActionsCount;

  return (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      className={clsx(
        "flex h-full min-h-[430px] flex-col gap-2.5 overflow-hidden rounded-2xl border p-3 text-right transition duration-200 md:min-h-[560px] md:gap-3 md:p-4",
        "hover:-translate-y-0.5 hover:border-[var(--primary)]/35",
        selected
          ? "border-[var(--primary)]/55 bg-[var(--surface-3)] shadow-[0_0_24px_rgba(99,102,241,0.18)]"
          : "border-[var(--border)] bg-[var(--panel)]",
        className,
      )}
      aria-pressed={selected}
    >
      <header>
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          {day.weekday}
        </h3>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
          {day.persianDate}
        </p>
      </header>

      <WeeklyDayDonut
        total={day.totalEvents}
        enemy={day.enemyActionsCount}
        government={day.governmentActionsCount}
        size={92}
      />

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
            <i className="h-2 w-2 rounded-full bg-[var(--enemy)]" />
            دشمن
          </span>
          <span className="font-semibold tabular-nums text-[var(--enemy)]">
            {day.enemyActionsCount.toLocaleString("fa-IR")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
            <i className="h-2 w-2 rounded-full bg-[var(--government)]" />
            دولت
          </span>
          <span className="font-semibold tabular-nums text-[var(--government)]">
            {day.governmentActionsCount.toLocaleString("fa-IR")}
          </span>
        </div>
      </div>

      <WeeklyIntensityBadge level={intensityLevel} />
      <WeeklyTopEvent event={topEvent} />
      <div className="mt-auto">
        <WeeklyMiniBarChart values={hourlyBars} enemyHeavy={enemyHeavy} />
      </div>
    </button>
  );
}
