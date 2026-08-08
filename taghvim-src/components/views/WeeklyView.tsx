"use client";

import { WeeklyDayCard } from "@taghvim/components/views/weekly/WeeklyDayCard";
import { WeeklyKpiCards } from "@taghvim/components/views/weekly/WeeklyKpiCards";
import { WeeklyLegend } from "@taghvim/components/views/weekly/WeeklyLegend";
import { WeeklyToolbar } from "@taghvim/components/views/weekly/WeeklyToolbar";
import {
  findWeekOption,
  formatWeekRangeLabel,
  getWeekModels,
  listWeekOptions,
  shiftWeek,
  startOfWeekSaturday,
  summarizeWeek,
  toWeeklyDateString,
} from "@taghvim/lib/weekly";
import type { TimelineDay } from "@taghvim/types/timeline";
import { useMemo, useState } from "react";

type WeeklyViewProps = {
  days: TimelineDay[];
  selectedDay?: string | null;
  onSelectDay: (date: string) => void;
};

export function WeeklyView({
  days,
  selectedDay = null,
  onSelectDay,
}: WeeklyViewProps) {
  const weeks = useMemo(() => listWeekOptions(days), [days]);

  const defaultAnchor =
    selectedDay ?? days[0]?.date ?? toWeeklyDateString(new Date());

  const [weekAnchor, setWeekAnchor] = useState(() =>
    toWeeklyDateString(startOfWeekSaturday(defaultAnchor)),
  );

  const activeWeek =
    findWeekOption(weeks, weekAnchor) ?? weeks[weeks.length - 1] ?? null;

  const resolvedAnchor = activeWeek?.startDate ?? weekAnchor;

  const models = useMemo(
    () => getWeekModels(days, resolvedAnchor),
    [days, resolvedAnchor],
  );

  const summary = useMemo(() => summarizeWeek(models), [models]);
  const rangeLabel = activeWeek
    ? `${activeWeek.label} · ${formatWeekRangeLabel(models) || activeWeek.shortRange}`
    : formatWeekRangeLabel(models);

  const activeDate =
    selectedDay && models.some((m) => m.day.date === selectedDay)
      ? selectedDay
      : models.reduce(
          (best, m) =>
            m.day.totalEvents > (best?.day.totalEvents ?? -1) ? m : best,
          models[0],
        )?.day.date ?? null;

  const selectWeek = (startDate: string) => {
    setWeekAnchor(startDate);
  };

  const goPrevWeek = () => {
    if (!activeWeek || weeks.length === 0) {
      setWeekAnchor((prev) => shiftWeek(prev, -1));
      return;
    }
    const idx = weeks.findIndex((w) => w.startDate === activeWeek.startDate);
    if (idx > 0) setWeekAnchor(weeks[idx - 1]!.startDate);
  };

  const goNextWeek = () => {
    if (!activeWeek || weeks.length === 0) {
      setWeekAnchor((prev) => shiftWeek(prev, 1));
      return;
    }
    const idx = weeks.findIndex((w) => w.startDate === activeWeek.startDate);
    if (idx >= 0 && idx < weeks.length - 1) {
      setWeekAnchor(weeks[idx + 1]!.startDate);
    }
  };

  return (
    <section className="space-y-2 md:space-y-3" style={{ direction: "rtl", textAlign: "right" }}>
      <WeeklyToolbar
        rangeLabel={rangeLabel || "بازه هفتگی"}
        weeks={weeks}
        activeWeekStart={resolvedAnchor}
        onSelectWeek={selectWeek}
        onPrevWeek={goPrevWeek}
        onNextWeek={goNextWeek}
        onRefresh={() => setWeekAnchor((prev) => prev)}
      />

      <WeeklyKpiCards
        className="hidden md:grid"
        totalEvents={summary.totalEvents}
        enemy={summary.enemy}
        government={summary.government}
        responseRatio={summary.responseRatio}
        avgResponseMinutes={summary.avgResponseMinutes}
      />

      {models.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--text-secondary)]">
          برای این هفته داده‌ای یافت نشد.
        </div>
      ) : (
        <>
          <div className="scrollbar-thin -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-7 md:gap-3.5 md:overflow-visible md:px-0 md:pb-0">
            {models.map((model) => (
              <WeeklyDayCard
                key={model.day.date}
                model={model}
                selected={activeDate === model.day.date}
                onSelect={onSelectDay}
                className="w-[40vw] min-w-[250px] max-w-[300px] shrink-0 snap-center md:w-auto md:min-w-0 md:max-w-none md:shrink"
              />
            ))}
          </div>

          <WeeklyLegend />
        </>
      )}
    </section>
  );
}
