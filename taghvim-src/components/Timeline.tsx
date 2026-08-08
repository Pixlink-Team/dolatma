"use client";

import {
  activityColor,
  activityLabel,
  formatFaShortDate,
  severityLabel,
} from "@taghvim/lib/activity";
import type { CalendarDay } from "@taghvim/types/calendar";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Shield, Swords } from "lucide-react";
import { useEffect, useRef } from "react";

type TimelineProps = {
  days: CalendarDay[];
  maxScore: number;
  expandedDate: string | null;
  onToggle: (date: string) => void;
  onVisibleDate: (date: string) => void;
};

function IntensityBar({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = maxScore <= 0 ? 0 : Math.round((score / maxScore) * 100);
  const color = activityColor(score, maxScore);

  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>{activityLabel(score, maxScore)}</span>
        <span>{pct.toLocaleString("fa-IR")}٪</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function DayCard({
  day,
  maxScore,
  isLeft,
  expanded,
  onToggle,
}: {
  day: CalendarDay;
  maxScore: number;
  isLeft: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const thumbs = [
    ...(day.media ?? []),
    ...(day.enemy_actions ?? []).flatMap((a) => a.media ?? []),
    ...(day.government_actions ?? []).flatMap((a) => a.media ?? []),
  ].slice(0, 3);

  return (
    <motion.article
      id={`day-${day.date}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45 }}
      className={clsx(
        "relative w-full max-w-md",
        isLeft ? "lg:mr-auto lg:pr-12" : "lg:ml-auto lg:pl-12",
      )}
    >
      <div
        className={clsx(
          "mb-3 inline-flex items-center rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40",
          isLeft ? "lg:float-left" : "lg:float-right",
        )}
      >
        {formatFaShortDate(day.date)}
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="group clear-both w-full rounded-2xl border border-white/10 bg-[#121a2e]/90 p-5 text-right shadow-xl shadow-black/30 backdrop-blur transition hover:border-violet-400/40 hover:bg-[#162038]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">
              {day.title || "گزارش روز"}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-300">
              {day.summary || "برای مشاهده جزئیات کلیک کنید."}
            </p>
          </div>
          <ChevronDown
            className={clsx(
              "mt-1 h-5 w-5 shrink-0 text-violet-300 transition",
              expanded && "rotate-180",
            )}
          />
        </div>

        {thumbs.length > 0 ? (
          <div className="mt-4 flex gap-2">
            {thumbs.map((item) => (
              <div
                key={item.id}
                className="h-16 w-20 overflow-hidden rounded-lg border border-white/10 bg-slate-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.alt || ""}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900"
              />
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1 text-red-300">
            <Swords className="h-3.5 w-3.5" />
            {day.enemy_actions_count.toLocaleString("fa-IR")} دشمن
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-emerald-300">
            <Shield className="h-3.5 w-3.5" />
            {day.government_actions_count.toLocaleString("fa-IR")} دولت
          </span>
        </div>

        <IntensityBar score={day.activity_score} maxScore={maxScore} />
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid gap-3 rounded-2xl border border-white/10 bg-[#0d1424] p-4 sm:grid-cols-2">
              <section>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-300">
                  <Swords className="h-4 w-4" />
                  اقدامات دشمن
                </h4>
                <div className="space-y-2">
                  {(day.enemy_actions ?? []).map((action) => (
                    <div
                      key={action.id}
                      className="rounded-xl border border-red-500/20 bg-red-500/5 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">
                          {action.title}
                        </p>
                        <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-200">
                          {severityLabel(action.severity)}
                        </span>
                      </div>
                      {action.description ? (
                        <p className="mt-1 text-xs leading-6 text-slate-400">
                          {action.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {(day.enemy_actions ?? []).length === 0 ? (
                    <p className="text-xs text-slate-500">موردی ثبت نشده</p>
                  ) : null}
                </div>
              </section>

              <section>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <Shield className="h-4 w-4" />
                  اقدامات دولت
                </h4>
                <div className="space-y-2">
                  {(day.government_actions ?? []).map((action) => (
                    <div
                      key={action.id}
                      className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white">
                          {action.title}
                        </p>
                        {(action.tags ?? []).includes("قهرمان ملی") ? (
                          <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                            قهرمان ملی
                          </span>
                        ) : null}
                      </div>
                      {action.agency ? (
                        <p className="mt-1 text-[11px] text-emerald-200/80">
                          {action.agency}
                        </p>
                      ) : null}
                      {action.description ? (
                        <p className="mt-1 text-xs leading-6 text-slate-400">
                          {action.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {(day.government_actions ?? []).length === 0 ? (
                    <p className="text-xs text-slate-500">موردی ثبت نشده</p>
                  ) : null}
                </div>
              </section>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}

export function Timeline({
  days,
  maxScore,
  expandedDate,
  onToggle,
  onVisibleDate,
}: TimelineProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id.startsWith("day-")) {
          onVisibleDate(visible.target.id.replace("day-", ""));
        }
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0.2, 0.5, 0.8] },
    );

    days.forEach((day) => {
      const el = document.getElementById(`day-${day.date}`);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [days, onVisibleDate]);

  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-violet-500/0 via-violet-400/50 to-violet-500/0 lg:block" />

      <div className="space-y-10 lg:space-y-16">
        {days.map((day, index) => {
          const isLeft = index % 2 === 1;

          return (
            <div key={day.id} className="relative">
              <div className="absolute left-1/2 top-8 z-10 hidden h-4 w-4 -translate-x-1/2 rounded-full border-2 border-[#0a1220] bg-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.8)] lg:block" />
              <DayCard
                day={day}
                maxScore={maxScore}
                isLeft={isLeft}
                expanded={expandedDate === day.date}
                onToggle={() => onToggle(day.date)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
