"use client";

import type { TimelineDay } from "@taghvim/types/timeline";

type MapViewProps = {
  days: TimelineDay[];
  onSelectProvince: (province: string) => void;
};

export function MapView({ days, onSelectProvince }: MapViewProps) {
  const byProvince = new Map<
    string,
    { enemy: number; government: number; lastTitle: string }
  >();

  days.forEach((day) => {
    day.events.forEach((event) => {
      const province = event.location?.province || "نامشخص";
      const current = byProvince.get(province) || {
        enemy: 0,
        government: 0,
        lastTitle: event.title,
      };
      if (event.eventType === "enemy") current.enemy += 1;
      else current.government += 1;
      current.lastTitle = event.title;
      byProvince.set(province, current);
    });
  });

  const rows = [...byProvince.entries()].sort(
    (a, b) => b[1].enemy + b[1].government - (a[1].enemy + a[1].government),
  );

  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">نقشه رویدادها (استانی)</h3>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        نسخه فعلی به‌صورت خلاصه استانی است؛ نقشه تعاملی در فاز بعد اضافه می‌شود.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([province, data]) => {
          const total = data.enemy + data.government;
          const size = Math.min(28, 10 + total);
          return (
            <button
              key={province}
              type="button"
              onClick={() => onSelectProvince(province)}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-3)] p-3 text-right hover:border-blue-400/30"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-[var(--text-primary)]">{province}</p>
                <span
                  className="rounded-full"
                  style={{
                    width: size,
                    height: size,
                    background:
                      data.enemy >= data.government
                        ? "radial-gradient(circle, #EF4444, transparent)"
                        : "radial-gradient(circle, #3B82F6, transparent)",
                  }}
                />
              </div>
              <div className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                <p>کل: {total.toLocaleString("fa-IR")}</p>
                <p className="text-red-300">
                  دشمن: {data.enemy.toLocaleString("fa-IR")}
                </p>
                <p className="text-blue-300">
                  دولت: {data.government.toLocaleString("fa-IR")}
                </p>
                <p className="line-clamp-1 text-[var(--text-secondary)]">آخرین: {data.lastTitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
