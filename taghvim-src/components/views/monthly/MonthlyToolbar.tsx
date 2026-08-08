"use client";

import type { MonthOption } from "@taghvim/lib/monthly";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

type MonthlyToolbarProps = {
  months: MonthOption[];
  activeKey: string;
  title: string;
  onSelectMonth: (key: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
};

export function MonthlyToolbar({
  months,
  activeKey,
  title,
  onSelectMonth,
  onPrevMonth,
  onNextMonth,
  canGoPrev = true,
  canGoNext = true,
}: MonthlyToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 sm:p-4">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onNextMonth}
          disabled={!canGoNext}
          className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="ماه بعد"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-center text-sm font-semibold text-[var(--text-primary)] sm:min-w-[240px]">
          {title}
        </div>
        <button
          type="button"
          onClick={onPrevMonth}
          disabled={!canGoPrev}
          className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="ماه قبل"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {months.length > 0 ? (
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1 scrollbar-thin">
          {months.map((month) => {
            const selected = month.key === activeKey;
            return (
              <button
                key={month.key}
                type="button"
                onClick={() => onSelectMonth(month.key)}
                className={clsx(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                  selected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]",
                )}
              >
                {month.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
