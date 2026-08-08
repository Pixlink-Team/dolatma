"use client";

type WeeklyMiniBarChartProps = {
  values: number[];
  enemyHeavy?: boolean;
};

export function WeeklyMiniBarChart({
  values,
  enemyHeavy = false,
}: WeeklyMiniBarChartProps) {
  const max = Math.max(1, ...values);

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[var(--text-secondary)]">نمودار فعالیت روزانه</p>
      <div className="flex h-12 items-end gap-1 rounded-lg bg-[var(--panel-2)] px-2 py-1.5">
        {values.map((value, index) => {
          const height = Math.max(12, Math.round((value / max) * 100));
          const mix = index / Math.max(1, values.length - 1);
          const color = enemyHeavy
            ? `color-mix(in srgb, var(--enemy) ${Math.round(55 + mix * 35)}%, var(--government))`
            : `color-mix(in srgb, var(--government) ${Math.round(55 + mix * 35)}%, var(--enemy))`;

          return (
            <span
              key={`${index}-${value}`}
              className="flex-1 rounded-t-[3px]"
              style={{
                height: `${height}%`,
                background: color,
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
