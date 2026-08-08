"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type StatCardProps = {
  label: string;
  value: number;
  suffix?: string;
  accent: string;
};

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const duration = 900;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [isInView, value]);

  return <span ref={ref}>{display.toLocaleString("fa-IR")}</span>;
}

function StatCard({ label, value, suffix, accent }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md"
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent }}
      />
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-white">
        <AnimatedNumber value={value} />
        {suffix ? <span className="mr-1 text-lg text-slate-300">{suffix}</span> : null}
      </p>
    </motion.div>
  );
}

type StatsBarProps = {
  enemy: number;
  government: number;
  days: number;
  responseRatio: number;
};

export function StatsBar({
  enemy,
  government,
  days,
  responseRatio,
}: StatsBarProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="اقدامات دشمن" value={enemy} accent="#EF4444" />
      <StatCard label="اقدامات دولت" value={government} accent="#10B981" />
      <StatCard label="روزهای ثبت‌شده" value={days} accent="#6366F1" />
      <StatCard
        label="نسبت پاسخ"
        value={responseRatio}
        suffix="٪"
        accent="#A855F7"
      />
    </div>
  );
}
