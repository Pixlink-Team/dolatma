"use client";

import { formatResponseTime } from "@taghvim/lib/timeline";

type SummaryBarProps = {
  totalEvents: number;
  enemy: number;
  government: number;
  responseRatio: number;
  avgResponseMinutes: number;
};

export function SummaryBar({
  totalEvents,
  enemy,
  government,
  responseRatio,
  avgResponseMinutes,
}: SummaryBarProps) {
  return (
    <section className="grid grid-cols-2 gap-2 xl:grid-cols-5">
      <Card label="کل رخدادهای بازه" value={totalEvents.toLocaleString("fa-IR")} />
      <Card
        label="اقدامات دشمن"
        value={enemy.toLocaleString("fa-IR")}
        tone="enemy"
      />
      <Card
        label="اقدامات دولت"
        value={government.toLocaleString("fa-IR")}
        tone="gov"
      />
      <Card
        label="نرخ پاسخ"
        value={`${responseRatio.toLocaleString("fa-IR")}٪`}
        tone="cyan"
      />
      <Card
        label="میانگین زمان واکنش"
        value={formatResponseTime(avgResponseMinutes) || "—"}
        className="col-span-2 xl:col-span-1"
      />
    </section>
  );
}

function Card({
  label,
  value,
  tone,
  className = "",
}: {
  label: string;
  value: string;
  tone?: "enemy" | "gov" | "cyan";
  className?: string;
}) {
  const toneClass =
    tone === "enemy"
      ? "border-[var(--enemy-border)] bg-[var(--enemy-soft)]"
      : tone === "gov"
        ? "border-[var(--government-border)] bg-[var(--government-soft)]"
        : tone === "cyan"
          ? "border-cyan-500/20 bg-cyan-500/5"
          : "border-[var(--border)] bg-[var(--surface-2)]";

  return (
    <div className={`rounded-[14px] border p-3 ${toneClass} ${className}`}>
      <p className="text-[11px] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-[var(--text-primary)] sm:text-2xl">{value}</p>
    </div>
  );
}
