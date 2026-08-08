"use client";

import {
  weeklyIntensityLabel,
  weeklyIntensityTone,
  type WeeklyIntensityLevel,
} from "@taghvim/lib/weekly";

const LEVELS: WeeklyIntensityLevel[] = [
  "low",
  "medium",
  "high",
  "very_high",
];

export function WeeklyLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-[11px] text-[var(--text-secondary)]">
      <span className="font-medium text-[var(--text-primary)]">راهنما:</span>
      {LEVELS.map((level) => {
        const tone = weeklyIntensityTone(level);
        return (
          <span key={level} className="inline-flex items-center gap-1.5">
            <i
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: tone.dot }}
            />
            {weeklyIntensityLabel(level)}
          </span>
        );
      })}
    </div>
  );
}
