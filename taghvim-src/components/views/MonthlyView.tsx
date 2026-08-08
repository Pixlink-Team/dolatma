"use client";

import { MonthlyDayCellCard } from "@taghvim/components/views/monthly/MonthlyDayCell";
import { MonthlyToolbar } from "@taghvim/components/views/monthly/MonthlyToolbar";
import { WeeklyKpiCards } from "@taghvim/components/views/weekly/WeeklyKpiCards";
import {
  WEEKDAY_LABELS,
  buildMonthCells,
  findMonthOption,
  listMonthOptions,
  monthLabel,
  resolveMonthFromDate,
  shiftPersianMonth,
  summarizeMonth,
  toMonthlyDateString,
  getPersianYmd,
} from "@taghvim/lib/monthly";
import type { TimelineDay } from "@taghvim/types/timeline";
import { useMemo, useState } from "react";

type MonthlyViewProps = {
  days: TimelineDay[];
  selectedDay?: string | null;
  onSelectDay: (date: string) => void;
};

const MOBILE_CELL = 92;
const MOBILE_GRID_MIN_WIDTH = MOBILE_CELL * 7 + 6 * 8;

export function MonthlyView({
  days,
  selectedDay = null,
  onSelectDay,
}: MonthlyViewProps) {
  const months = useMemo(() => listMonthOptions(days), [days]);

  const defaultDate =
    selectedDay ?? days[0]?.date ?? toMonthlyDateString(new Date());

  const initial = resolveMonthFromDate(defaultDate, months);
  const fallback = getPersianYmd(defaultDate);

  const [cursor, setCursor] = useState(() => ({
    year: initial?.year ?? fallback.year,
    month: initial?.month ?? fallback.month,
  }));

  const activeMonth =
    findMonthOption(months, cursor.year, cursor.month) ??
    months[months.length - 1] ??
    null;

  const year = activeMonth?.year ?? cursor.year;
  const month = activeMonth?.month ?? cursor.month;
  const activeKey = `${year}-${String(month).padStart(2, "0")}`;

  const cells = useMemo(
    () => buildMonthCells(year, month, days),
    [year, month, days],
  );

  const summary = useMemo(() => summarizeMonth(cells), [cells]);
  const title = monthLabel(year, month);

  const activeIndex = months.findIndex((m) => m.key === activeKey);
  const canGoPrev = activeIndex > 0 || months.length === 0;
  const canGoNext =
    (activeIndex >= 0 && activeIndex < months.length - 1) || months.length === 0;

  const selectMonthKey = (key: string) => {
    const found = months.find((m) => m.key === key);
    if (!found) return;
    setCursor({ year: found.year, month: found.month });
  };

  const goPrev = () => {
    if (activeIndex > 0) {
      const prev = months[activeIndex - 1]!;
      setCursor({ year: prev.year, month: prev.month });
      return;
    }
    setCursor((c) => shiftPersianMonth(c.year, c.month, -1));
  };

  const goNext = () => {
    if (activeIndex >= 0 && activeIndex < months.length - 1) {
      const next = months[activeIndex + 1]!;
      setCursor({ year: next.year, month: next.month });
      return;
    }
    setCursor((c) => shiftPersianMonth(c.year, c.month, 1));
  };

  return (
    <section
      className="space-y-2 md:space-y-3"
      style={{ direction: "rtl", textAlign: "right" }}
    >
      <MonthlyToolbar
        months={months}
        activeKey={activeKey}
        title={title}
        onSelectMonth={selectMonthKey}
        onPrevMonth={goPrev}
        onNextMonth={goNext}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
      />

      <WeeklyKpiCards
        className="hidden md:grid"
        totalEvents={summary.totalEvents}
        enemy={summary.enemy}
        government={summary.government}
        responseRatio={summary.responseRatio}
        avgResponseMinutes={summary.avgResponseMinutes}
      />

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-2 md:p-3">
        <div
          className="scrollbar-thin max-h-[min(72dvh,640px)] overflow-auto overscroll-contain md:max-h-none md:overflow-visible"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div
            className="inline-block min-w-full align-top md:block"
            style={{ minWidth: `max(100%, ${MOBILE_GRID_MIN_WIDTH}px)` }}
          >
            <div className="sticky top-0 z-10 mb-2 grid grid-cols-7 gap-2 bg-[var(--panel)] text-center text-[11px] font-medium text-[var(--text-muted)] md:gap-1.5">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="py-1">
                  {label}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-1.5">
              {cells.map((cell) => (
                <MonthlyDayCellCard
                  key={cell.key}
                  cell={cell}
                  selected={!!cell.date && selectedDay === cell.date}
                  onSelect={onSelectDay}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
