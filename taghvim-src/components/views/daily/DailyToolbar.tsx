"use client";

import {
  getPersianYmd,
  monthLabel,
  shiftPersianMonth,
  emptyTimelineDay,
} from "@taghvim/lib/monthly";
import {
  WEEKDAY_LABELS,
  buildPersianCalendarCells,
  todayGregorianString,
} from "@taghvim/lib/persian-date";
import type { TimelineDay } from "@taghvim/types/timeline";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type DailyToolbarProps = {
  day: TimelineDay;
  onPrevDay: () => void;
  onNextDay: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  dayOptions?: TimelineDay[];
  onPickDay?: (date: string) => void;
  minDate?: string | null;
  maxDate?: string | null;
};

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftCalendarDay(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toDateString(d);
}

export function resolveDay(
  days: TimelineDay[],
  date: string | null | undefined,
): TimelineDay {
  const key = date ?? days[0]?.date ?? toDateString(new Date());
  return days.find((d) => d.date === key) ?? emptyTimelineDay(key);
}

export function DailyToolbar({
  day,
  onPrevDay,
  onNextDay,
  canGoPrev = true,
  canGoNext = true,
  dayOptions = [],
  onPickDay,
  minDate = null,
  maxDate = null,
}: DailyToolbarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const initial = getPersianYmd(day.date);
  const [cursorYear, setCursorYear] = useState(initial.year);
  const [cursorMonth, setCursorMonth] = useState(initial.month);

  useEffect(() => {
    const ymd = getPersianYmd(day.date);
    setCursorYear(ymd.year);
    setCursorMonth(ymd.month);
  }, [day.date]);

  useEffect(() => {
    if (!calendarOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [calendarOpen]);

  const cells = useMemo(
    () => buildPersianCalendarCells(cursorYear, cursorMonth),
    [cursorYear, cursorMonth],
  );

  const dataDates = useMemo(
    () => new Set(dayOptions.map((d) => d.date)),
    [dayOptions],
  );

  const chips = useMemo(() => {
    if (dayOptions.length === 0) return [];
    const idx = dayOptions.findIndex((d) => d.date === day.date);
    if (idx < 0) return dayOptions.slice(0, 7);
    const start = Math.max(0, idx - 3);
    return dayOptions.slice(start, start + 7);
  }, [day.date, dayOptions]);

  const today = todayGregorianString();

  const pickDate = (date: string) => {
    onPickDay?.(date);
    setCalendarOpen(false);
  };

  const isSelectable = (date: string) => {
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    if (dataDates.size > 0) return dataDates.has(date);
    return true;
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 sm:p-4">
      <div ref={rootRef} className="relative flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onNextDay}
          disabled={!canGoNext}
          className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="روز بعد"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setCalendarOpen((v) => !v)}
          aria-expanded={calendarOpen}
          aria-label="باز کردن تقویم انتخاب روز"
          className={clsx(
            "min-w-[220px] rounded-xl border px-3 py-2 text-center transition sm:min-w-[280px]",
            calendarOpen
              ? "border-[var(--primary)]/45 bg-[var(--primary)]/10"
              : "border-[var(--border)] bg-[var(--panel-2)] hover:bg-[var(--hover)]",
          )}
        >
          <p className="m-0 text-sm font-semibold text-[var(--text-primary)]">
            {day.weekday}
          </p>
          <p className="m-0 mt-0.5 text-xs text-[var(--text-secondary)]">
            {day.persianDate}
          </p>
        </button>

        <button
          type="button"
          onClick={onPrevDay}
          disabled={!canGoPrev}
          className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="روز قبل"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {calendarOpen ? (
          <div className="absolute top-[calc(100%+8px)] z-40 w-[300px] rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
                onClick={() => {
                  const next = shiftPersianMonth(cursorYear, cursorMonth, -1);
                  setCursorYear(next.year);
                  setCursorMonth(next.month);
                }}
                aria-label="ماه قبل"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {monthLabel(cursorYear, cursorMonth)}
              </p>
              <button
                type="button"
                className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
                onClick={() => {
                  const next = shiftPersianMonth(cursorYear, cursorMonth, 1);
                  setCursorYear(next.year);
                  setCursorMonth(next.month);
                }}
                aria-label="ماه بعد"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--text-muted)]">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                if (!cell.inMonth || !cell.date || cell.day == null) {
                  return <span key={cell.key} className="h-9" />;
                }

                const selected = day.date === cell.date;
                const enabled = isSelectable(cell.date);
                const isToday = cell.date === today;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!enabled}
                    onClick={() => pickDate(cell.date!)}
                    className={clsx(
                      "h-9 rounded-lg text-[12px] transition",
                      selected
                        ? "bg-blue-600 font-bold text-white"
                        : isToday
                          ? "border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--hover)]"
                          : enabled
                            ? "text-[var(--text-primary)] hover:bg-[var(--hover)]"
                            : "cursor-not-allowed text-[var(--text-muted)] opacity-40",
                    )}
                  >
                    {cell.day.toLocaleString("fa-IR")}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-[10px] leading-5 text-[var(--text-muted)]">
              روی هر روز کلیک کنید تا نمای روزانه همان تاریخ باز شود.
            </p>
          </div>
        ) : null}
      </div>

      {chips.length > 0 && onPickDay ? (
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1 scrollbar-thin">
          {chips.map((option) => {
            const selected = option.date === day.date;
            const label = option.persianDate.split(" ").slice(0, 2).join(" ");
            return (
              <button
                key={option.date}
                type="button"
                onClick={() => onPickDay(option.date)}
                className={
                  selected
                    ? "shrink-0 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-md shadow-blue-600/25"
                    : "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
