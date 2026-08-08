"use client";

import {
  weeklyIntensityLabel,
  weeklyIntensityTone,
  type WeeklyIntensityLevel,
} from "@taghvim/lib/weekly";

type WeeklyIntensityBadgeProps = {
  level: WeeklyIntensityLevel;
};

export function WeeklyIntensityBadge({ level }: WeeklyIntensityBadgeProps) {
  const tone = weeklyIntensityTone(level);

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-[var(--text-secondary)]">شدت روز</p>
      <span
        className="inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold"
        style={{
          background: tone.bg,
          color: tone.text,
          border: `1px solid ${tone.border}`,
        }}
      >
        {weeklyIntensityLabel(level)}
      </span>
    </div>
  );
}
