"use client";

import type { WeekOption } from "@taghvim/lib/weekly";
import {
  startOfWeekSaturday,
  toWeeklyDateString,
} from "@taghvim/lib/weekly";
import {
  getPersianYmd,
  monthLabel,
  shiftPersianMonth,
} from "@taghvim/lib/monthly";
import {
  WEEKDAY_LABELS,
  buildPersianCalendarCells,
} from "@taghvim/lib/persian-date";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type WeeklyCalendarPopoverProps = {
  weeks: WeekOption[];
  activeStartDate: string;
  onSelectWeek: (startDate: string) => void;
  onClose: () => void;
  className?: string;
};

export function WeeklyCalendarPopover({
  weeks,
  activeStartDate,
  onSelectWeek,
  onClose,
  className,
}: WeeklyCalendarPopoverProps) {
  const active = useMemo(() => {
    const key = toWeeklyDateString(startOfWeekSaturday(activeStartDate));
    return weeks.find((w) => w.startDate === key) ?? weeks[weeks.length - 1] ?? null;
  }, [weeks, activeStartDate]);

  const initial = active
    ? getPersianYmd(active.startDate)
    : getPersianYmd(new Date());

  const [cursorYear, setCursorYear] = useState(initial.year);
  const [cursorMonth, setCursorMonth] = useState(initial.month);

  useEffect(() => {
    if (!active) return;
    const ymd = getPersianYmd(active.startDate);
    setCursorYear(ymd.year);
    setCursorMonth(ymd.month);
  }, [active?.startDate]);

  const cells = useMemo(
    () => buildPersianCalendarCells(cursorYear, cursorMonth),
    [cursorYear, cursorMonth],
  );

  const weekStartSet = useMemo(
    () => new Set(weeks.map((w) => w.startDate)),
    [weeks],
  );

  const activeWeekStart = active?.startDate ?? "";
  const activeWeekEnd = active?.endDate ?? "";

  return (
    <div
      className={clsx(
        "absolute top-[calc(100%+8px)] left-1/2 z-40 w-[300px] -translate-x-1/2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 shadow-2xl",
        className,
      )}
    >
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
        <div className="flex items-center gap-1">
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
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
            onClick={onClose}
            aria-label="بستن تقویم"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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

          const key = cell.date;
          const weekStart = toWeeklyDateString(startOfWeekSaturday(key));
          const inData = weekStartSet.has(weekStart);
          const inActiveWeek =
            activeWeekStart &&
            key >= activeWeekStart &&
            key <= activeWeekEnd;
          const isWeekStart = key === weekStart;

          return (
            <button
              key={key}
              type="button"
              disabled={!inData}
              onClick={() => {
                onSelectWeek(weekStart);
                onClose();
              }}
              className={clsx(
                "h-9 rounded-lg text-[11px] transition",
                inActiveWeek &&
                  "bg-[var(--primary)]/15 text-[var(--primary)]",
                isWeekStart &&
                  inActiveWeek &&
                  "bg-blue-600 font-bold text-white",
                inData &&
                  !inActiveWeek &&
                  "text-[var(--text-primary)] hover:bg-[var(--hover)]",
                !inData && "cursor-not-allowed text-[var(--text-muted)]",
              )}
              title={
                inData
                  ? `انتخاب هفته ${weeks.find((w) => w.startDate === weekStart)?.label ?? ""}`
                  : "خارج از بازه داده"
              }
            >
              {cell.day.toLocaleString("fa-IR")}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] leading-5 text-[var(--text-muted)]">
        با کلیک روی هر روز، همان هفته انتخاب می‌شود.
        {active ? (
          <>
            <br />
            انتخاب فعلی: {active.label} ({active.shortRange})
          </>
        ) : null}
      </p>
    </div>
  );
}
