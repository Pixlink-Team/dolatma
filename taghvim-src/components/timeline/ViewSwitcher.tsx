"use client";

import type { TimelineViewMode } from "@taghvim/types/timeline";
import clsx from "clsx";

const VIEWS: { id: TimelineViewMode; label: string; short: string }[] = [
  { id: "timeline", label: "خط زمانی", short: "خط زمانی" },
  { id: "day", label: "نمای روزانه", short: "روزانه" },
  { id: "week", label: "نمای هفتگی", short: "هفتگی" },
  { id: "month", label: "نمای ماهانه", short: "ماهانه" },
  { id: "map", label: "نقشه", short: "نقشه" },
  { id: "analytics", label: "تحلیل آماری", short: "آمار" },
];

type ViewSwitcherProps = {
  value: TimelineViewMode;
  onChange: (view: TimelineViewMode) => void;
  compact?: boolean;
};

export function ViewSwitcher({ value, onChange, compact }: ViewSwitcherProps) {
  const items = compact
    ? VIEWS.filter((v) => ["timeline", "week", "month"].includes(v.id))
    : VIEWS;

  return (
    <div
      className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1 scrollbar-thin"
      role="tablist"
      aria-label="تغییر نمای صفحه"
    >
      {items.map((view) => {
        const active = value === view.id;
        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(view.id)}
            className={clsx(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]",
            )}
          >
            {compact ? view.short : view.label}
          </button>
        );
      })}
    </div>
  );
}
