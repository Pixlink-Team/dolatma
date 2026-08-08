"use client";

import { formatResponseTime } from "@taghvim/lib/timeline";
import clsx from "clsx";
import {
  Building2,
  CalendarDays,
  Clock3,
  Swords,
  Target,
} from "lucide-react";

type WeeklyKpiCardsProps = {
  totalEvents: number;
  enemy: number;
  government: number;
  responseRatio: number;
  avgResponseMinutes: number;
  className?: string;
};

export function WeeklyKpiCards({
  totalEvents,
  enemy,
  government,
  responseRatio,
  avgResponseMinutes,
  className,
}: WeeklyKpiCardsProps) {
  const items = [
    {
      label: "میانگین زمان واکنش",
      value: formatResponseTime(avgResponseMinutes) || "—",
      icon: Clock3,
      tone: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
      iconTone: "bg-cyan-500/15 text-cyan-300",
    },
    {
      label: "کل رویدادها",
      value: totalEvents.toLocaleString("fa-IR"),
      icon: CalendarDays,
      tone: "border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)]",
      iconTone: "bg-[var(--purple)]/15 text-indigo-300",
    },
    {
      label: "اقدامات دشمن",
      value: enemy.toLocaleString("fa-IR"),
      icon: Swords,
      tone: "border-[var(--enemy-border)] bg-[var(--enemy-soft)] text-[var(--enemy)]",
      iconTone: "bg-[var(--enemy)]/15 text-[var(--enemy)]",
    },
    {
      label: "اقدامات دولت",
      value: government.toLocaleString("fa-IR"),
      icon: Building2,
      tone: "border-[var(--government-border)] bg-[var(--government-soft)] text-[var(--government)]",
      iconTone: "bg-[var(--government)]/15 text-[var(--government)]",
    },
    {
      label: "نرخ پاسخ",
      value: `${responseRatio.toLocaleString("fa-IR")}٪`,
      icon: Target,
      tone: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
      iconTone: "bg-emerald-500/15 text-emerald-300",
    },
  ] as const;

  return (
    <section
      className={clsx(
        "scrollbar-thin -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0 md:pb-0",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`flex min-w-[11.5rem] shrink-0 items-center justify-between gap-3 rounded-[14px] border p-3 md:min-w-0 ${item.tone}`}
          >
            <div className="min-w-0 text-right">
              <p className="text-[11px] text-[var(--text-secondary)]">{item.label}</p>
              <p className="mt-1 text-xl font-extrabold text-[var(--text-primary)] sm:text-2xl">
                {item.value}
              </p>
            </div>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.iconTone}`}
            >
              <Icon className="h-4 w-4" />
            </div>
          </div>
        );
      })}
    </section>
  );
}
