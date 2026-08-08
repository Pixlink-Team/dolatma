"use client";

import type { ActiveFilterChip } from "@taghvim/types/timeline";
import clsx from "clsx";
import { X } from "lucide-react";

type ActiveFilterChipsProps = {
  chips: ActiveFilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
};

export function ActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={clsx("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <button
          key={chip.key + chip.label}
          type="button"
          onClick={() => onRemove(chip.key)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2.5 py-1 text-xs text-[var(--primary)]"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        پاک کردن همه
      </button>
    </div>
  );
}
