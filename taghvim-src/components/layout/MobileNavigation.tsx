"use client";

import type { TimelineViewMode } from "@taghvim/types/timeline";
import clsx from "clsx";
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  Map,
  MoreHorizontal,
  Sun,
} from "lucide-react";
import { useMemo, useState } from "react";

const PRIMARY_ITEMS: { id: TimelineViewMode; label: string; icon: typeof Map }[] = [
  { id: "timeline", label: "زمانی", icon: CalendarRange },
  { id: "day", label: "روز", icon: Sun },
  { id: "week", label: "هفته", icon: CalendarDays },
  { id: "month", label: "ماه", icon: CalendarDays },
];

const MORE_ITEMS: { id: TimelineViewMode; label: string; icon: typeof Map }[] = [
  { id: "analytics", label: "آمار", icon: BarChart3 },
  { id: "map", label: "نقشه", icon: Map },
];

type MobileNavigationProps = {
  value: TimelineViewMode;
  onChange: (view: TimelineViewMode) => void;
};

export function MobileNavigation({ value, onChange }: MobileNavigationProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = useMemo(
    () => MORE_ITEMS.some((item) => item.id === value),
    [value],
  );

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          aria-label="بستن منوی نماها"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      {moreOpen ? (
        <div className="fixed inset-x-3 bottom-[calc(var(--app-content-pad-bottom)+0.25rem)] z-50 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/95 p-2 shadow-2xl backdrop-blur-xl md:hidden">
          <div className="grid grid-cols-2 gap-2">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = value === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id);
                    setMoreOpen(false);
                  }}
                  className={clsx(
                    "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium",
                    active
                      ? "bg-blue-500/15 text-[var(--primary)]"
                      : "text-[var(--text-secondary)]",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface-1)] md:hidden safe-bottom">
        <div className="mx-auto flex h-[3.75rem] max-w-lg items-stretch gap-0.5 px-1.5">
          {PRIMARY_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = value === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={clsx(
                  "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium",
                  active
                    ? "bg-blue-500/15 text-[var(--primary)]"
                    : "text-[var(--text-secondary)]",
                )}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={clsx(
              "flex min-h-11 min-w-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium",
              moreActive || moreOpen
                ? "bg-blue-500/15 text-[var(--primary)]"
                : "text-[var(--text-secondary)]",
            )}
            aria-label="نماهای بیشتر"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal className="h-5 w-5 shrink-0" />
            <span>بیشتر</span>
          </button>
        </div>
      </nav>
    </>
  );
}
