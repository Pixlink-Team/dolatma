"use client";

import {
  getPersianYmd,
  monthLabel,
  shiftPersianMonth,
} from "@taghvim/lib/monthly";
import {
  WEEKDAY_LABELS,
  buildPersianCalendarCells,
  formatPersianDateLabel,
  formatPersianDateShort,
  todayGregorianString,
} from "@taghvim/lib/persian-date";
import clsx from "clsx";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type PersianDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  compact?: boolean;
  allowClear?: boolean;
  className?: string;
  /** Inclusive minimum selectable date (YYYY-MM-DD) */
  minDate?: string;
  /** Inclusive maximum selectable date (YYYY-MM-DD) */
  maxDate?: string;
};

function isDateAllowed(date: string, minDate?: string, maxDate?: string): boolean {
  if (minDate && date < minDate) return false;
  if (maxDate && date > maxDate) return false;
  return true;
}

export function PersianDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  ariaLabel = "انتخاب تاریخ شمسی",
  compact = false,
  allowClear = true,
  className,
  minDate,
  maxDate,
}: PersianDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const fallbackAnchor =
    value ||
    (minDate && maxDate && todayGregorianString() >= minDate && todayGregorianString() <= maxDate
      ? todayGregorianString()
      : minDate) ||
    todayGregorianString();

  const initial = getPersianYmd(fallbackAnchor);
  const [cursorYear, setCursorYear] = useState(initial.year);
  const [cursorMonth, setCursorMonth] = useState(initial.month);

  useEffect(() => {
    if (!value) return;
    const ymd = getPersianYmd(value);
    setCursorYear(ymd.year);
    setCursorMonth(ymd.month);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cells = useMemo(
    () => buildPersianCalendarCells(cursorYear, cursorMonth),
    [cursorYear, cursorMonth],
  );

  const display = value
    ? compact
      ? formatPersianDateShort(value)
      : formatPersianDateLabel(value)
    : placeholder;

  const today = todayGregorianString();
  const todayAllowed = isDateAllowed(today, minDate, maxDate);

  const rangeHint =
    minDate && maxDate
      ? `فقط بازه ${formatPersianDateShort(minDate)} تا ${formatPersianDateShort(maxDate)}`
      : minDate
        ? `از ${formatPersianDateShort(minDate)} به بعد`
        : maxDate
          ? `تا ${formatPersianDateShort(maxDate)}`
          : null;

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={clsx(
          "inline-flex w-full items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-primary)] transition hover:bg-[var(--hover)]",
          compact ? "px-2 py-1.5 text-[11px]" : "px-3 py-2.5 text-sm",
        )}
      >
        <CalendarDays
          className={clsx(
            "shrink-0 text-[var(--text-muted)]",
            compact ? "h-3.5 w-3.5" : "h-4 w-4",
          )}
        />
        <span
          className={clsx(
            "min-w-0 flex-1 truncate text-right",
            !value && "text-[var(--text-muted)]",
          )}
        >
          {display}
        </span>
        {allowClear && value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="پاک کردن تاریخ"
            className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }
            }}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-[280px] rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 shadow-2xl">
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

          {rangeHint ? (
            <p className="mb-2 text-center text-[10px] text-[var(--text-secondary)]">
              {rangeHint}
            </p>
          ) : null}

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

              const selected = value === cell.date;
              const isToday = cell.date === today;
              const allowed = isDateAllowed(cell.date, minDate, maxDate);

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={!allowed}
                  onClick={() => {
                    if (!allowed) return;
                    onChange(cell.date!);
                    setOpen(false);
                  }}
                  className={clsx(
                    "h-9 rounded-lg text-[12px] transition",
                    !allowed &&
                      "cursor-not-allowed text-[var(--text-muted)] opacity-35",
                    allowed &&
                      selected &&
                      "bg-blue-600 font-bold text-white",
                    allowed &&
                      !selected &&
                      isToday &&
                      "border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--hover)]",
                    allowed &&
                      !selected &&
                      !isToday &&
                      "text-[var(--text-primary)] hover:bg-[var(--hover)]",
                  )}
                >
                  {cell.day.toLocaleString("fa-IR")}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!todayAllowed}
              className="rounded-lg px-2 py-1 text-[11px] text-[var(--primary)] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                if (!todayAllowed) return;
                onChange(today);
                const ymd = getPersianYmd(today);
                setCursorYear(ymd.year);
                setCursorMonth(ymd.month);
                setOpen(false);
              }}
            >
              امروز
            </button>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--hover)]"
              onClick={() => setOpen(false)}
            >
              بستن
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
