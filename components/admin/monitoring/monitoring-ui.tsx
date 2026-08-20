"use client";

import { cn, formatPersianNumber, toPersianDigits } from "@/lib/utils";
import type { RiskLevel, UrgencyLevel } from "@/lib/monitoring/types";
import { RISK_COLORS, RISK_LABELS, URGENCY_COLORS, URGENCY_LABELS } from "@/lib/monitoring/labels";

export function MonitoringStatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50/60"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50/60"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-border bg-card";
  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", toneClass)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">
        {typeof value === "number" ? formatPersianNumber(value) : toPersianDigits(value)}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-medium", RISK_COLORS[level])}>
      {RISK_LABELS[level]}
    </span>
  );
}

export function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  return (
    <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-medium", URGENCY_COLORS[level])}>
      {URGENCY_LABELS[level]}
    </span>
  );
}

export function MonitoringEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function MonitoringSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
