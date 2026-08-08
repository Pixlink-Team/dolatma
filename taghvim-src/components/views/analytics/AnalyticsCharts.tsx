"use client";

import clsx from "clsx";
import { useId, useMemo, useState } from "react";

type SparklineProps = {
  values: number[];
  color?: string;
  className?: string;
};

export function Sparkline({
  values,
  color = "var(--primary)",
  className,
}: SparklineProps) {
  const path = useMemo(() => {
    if (values.length === 0) return "";
    const max = Math.max(...values, 1);
    const w = 72;
    const h = 28;
    return values
      .map((v, i) => {
        const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
        const y = h - (v / max) * (h - 4) - 2;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [values]);

  return (
    <svg
      viewBox="0 0 72 28"
      className={clsx("h-7 w-[72px]", className)}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type AreaTrendChartProps = {
  labels: string[];
  series: {
    id: string;
    label: string;
    color: string;
    values: number[];
  }[];
  height?: number;
};

export function AreaTrendChart({
  labels,
  series,
  height = 220,
}: AreaTrendChartProps) {
  const gradId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const w = 640;
  const h = height;
  const padX = 12;
  const padY = 16;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;
  const n = Math.max(labels.length, 1);

  const toX = (i: number) =>
    padX + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const toY = (v: number) => padY + chartH - (v / max) * chartH;

  const buildArea = (values: number[]) => {
    if (values.length === 0) return "";
    const line = values
      .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`)
      .join(" ");
    const lastX = toX(values.length - 1);
    const firstX = toX(0);
    return `${line} L${lastX},${padY + chartH} L${firstX},${padY + chartH} Z`;
  };

  const buildLine = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`)
      .join(" ");

  const active = hover ?? labels.length - 1;

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {series.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]"
          >
            <i
              className="h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div className="relative w-full overflow-hidden rounded-xl bg-[var(--panel-2)]/35 p-2 sm:p-3">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-auto w-full"
          style={{ minHeight: Math.max(200, Math.round(height * 0.9)) }}
          role="img"
          aria-label="نمودار روند"
          onMouseLeave={() => setHover(null)}
        >
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={padX}
              x2={w - padX}
              y1={padY + chartH * (1 - t)}
              y2={padY + chartH * (1 - t)}
              stroke="var(--border)"
              strokeWidth="1"
            />
          ))}

          {series.map((s, idx) => (
            <g key={s.id}>
              <defs>
                <linearGradient
                  id={`${gradId}-${idx}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path
                d={buildArea(s.values)}
                fill={`url(#${gradId}-${idx})`}
              />
              <path
                d={buildLine(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ))}

          {labels.map((_, i) => (
            <rect
              key={i}
              x={toX(i) - chartW / n / 2}
              y={padY}
              width={Math.max(8, chartW / n)}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}

          {active >= 0 && labels[active] ? (
            <line
              x1={toX(active)}
              x2={toX(active)}
              y1={padY}
              y2={padY + chartH}
              stroke="var(--text-muted)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          ) : null}
        </svg>

        {active >= 0 && labels[active] ? (
          <div className="pointer-events-none absolute top-2 left-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1.5 text-[11px] shadow-lg">
            <p className="m-0 font-medium text-[var(--text-primary)]">
              {labels[active]}
            </p>
            {series.map((s) => (
              <p
                key={s.id}
                className="m-0 mt-0.5 tabular-nums"
                style={{ color: s.color }}
              >
                {s.label}: {(s.values[active] ?? 0).toLocaleString("fa-IR")}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-1 flex justify-between gap-2 text-[10px] text-[var(--text-muted)]">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

type DonutChartProps = {
  segments: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
};

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative h-[148px] w-[148px] shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="16"
          />
          {segments.map((seg) => {
            const len = (seg.value / total) * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle
                key={seg.label}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="m-0 text-[10px] text-[var(--text-muted)]">{centerLabel}</p>
          <p className="m-0 text-lg font-bold tabular-nums text-[var(--text-primary)]">
            {centerValue}
          </p>
        </div>
      </div>

      <div className="w-full space-y-2">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
              <i
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: seg.color }}
              />
              {seg.label}
            </span>
            <span className="tabular-nums text-[var(--text-primary)]">
              {seg.value.toLocaleString("fa-IR")} ·{" "}
              {Math.round((seg.value / total) * 100).toLocaleString("fa-IR")}٪
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type HorizontalBarsProps = {
  rows: { label: string; value: number; share: number; color?: string }[];
};

export function HorizontalBars({ rows }: HorizontalBarsProps) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  if (rows.length === 0) {
    return (
      <p className="m-0 text-sm text-[var(--text-muted)]">داده‌ای نیست.</p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-[var(--text-secondary)]">
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums text-[var(--text-primary)]">
              {row.value.toLocaleString("fa-IR")}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(row.value / max) * 100}%`,
                background: row.color ?? "var(--primary)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type StackedDailyBarsProps = {
  points: {
    label: string;
    enemy: number;
    government: number;
  }[];
  height?: number;
};

export function StackedDailyBars({
  points,
  height = 176,
}: StackedDailyBarsProps) {
  const max = Math.max(
    1,
    ...points.map((p) => p.enemy + p.government),
  );

  return (
    <div className="w-full">
      <div className="mb-3 flex gap-3 text-[11px] text-[var(--text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-[var(--enemy)]" />
          دشمن
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-[var(--government)]" />
          دولت
        </span>
      </div>
      <div
        className="flex items-end gap-1 overflow-x-auto pb-1"
        style={{ height }}
      >
        {points.map((p) => {
          const total = p.enemy + p.government;
          const h = Math.max(6, (total / max) * 100);
          const enemyShare = total ? (p.enemy / total) * 100 : 0;
          return (
            <div
              key={p.label}
              className="group relative flex min-w-[14px] flex-1 flex-col items-center justify-end"
              style={{ height: "100%" }}
              title={`${p.label}: دشمن ${p.enemy} · دولت ${p.government}`}
            >
              <div
                className="flex w-full flex-col justify-end overflow-hidden rounded-t-sm"
                style={{ height: `${h}%` }}
              >
                <div
                  className="w-full bg-[var(--government)]"
                  style={{ height: `${100 - enemyShare}%` }}
                />
                <div
                  className="w-full bg-[var(--enemy)]"
                  style={{ height: `${enemyShare}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
