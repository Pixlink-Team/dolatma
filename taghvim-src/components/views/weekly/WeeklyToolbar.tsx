"use client";

import { WeeklyCalendarPopover } from "@taghvim/components/views/weekly/WeeklyCalendarPopover";
import { WeeklyWeekSelector } from "@taghvim/components/views/weekly/WeeklyWeekSelector";
import type { WeekOption } from "@taghvim/lib/weekly";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type WeeklyToolbarProps = {
  rangeLabel: string;
  weeks: WeekOption[];
  activeWeekStart: string;
  onSelectWeek: (startDate: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onRefresh?: () => void;
};

export function WeeklyToolbar({
  rangeLabel,
  weeks,
  activeWeekStart,
  onSelectWeek,
  onPrevWeek,
  onNextWeek,
  onRefresh,
}: WeeklyToolbarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calendarOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) {
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

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-2.5 md:gap-3 md:p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
        <button
          type="button"
          onClick={onRefresh}
          className="hidden w-fit items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--hover)] md:inline-flex"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          تازه‌سازی
        </button>

        <div
          ref={pickerRef}
          className="relative flex items-center justify-center gap-2"
        >
          <button
            type="button"
            onClick={onNextWeek}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
            aria-label="هفته بعد"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setCalendarOpen((v) => !v)}
            aria-expanded={calendarOpen}
            aria-haspopup="dialog"
            aria-label="باز کردن تقویم انتخاب هفته"
            title="برای انتخاب هفته کلیک کنید"
            className={clsx(
              "min-w-0 flex-1 rounded-xl border px-2.5 py-2 text-center text-[11px] font-medium transition md:min-w-[280px] md:flex-none md:px-3 md:text-sm",
              calendarOpen
                ? "border-[var(--primary)]/50 bg-[var(--primary)]/10 text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-primary)] hover:border-[var(--primary)]/35 hover:bg-[var(--hover)]",
            )}
          >
            {rangeLabel}
          </button>

          <button
            type="button"
            onClick={onPrevWeek}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
            aria-label="هفته قبل"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {calendarOpen ? (
            <WeeklyCalendarPopover
              weeks={weeks}
              activeStartDate={activeWeekStart}
              onSelectWeek={onSelectWeek}
              onClose={() => setCalendarOpen(false)}
            />
          ) : null}
        </div>
      </div>

      <div className="hidden md:block">
        <WeeklyWeekSelector
          weeks={weeks}
          activeStartDate={activeWeekStart}
          onSelectWeek={onSelectWeek}
        />
      </div>
    </div>
  );
}
