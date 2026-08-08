"use client";

import { Radio } from "lucide-react";

type LiveUpdateBannerProps = {
  online?: boolean;
  lastUpdatedLabel: string;
  pendingCount: number;
  onShowNew: () => void;
};

export function LiveUpdateBanner({
  online = true,
  lastUpdatedLabel,
  pendingCount,
  onShowNew,
}: LiveUpdateBannerProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            background: online
              ? "color-mix(in srgb, var(--success) 14%, transparent)"
              : "color-mix(in srgb, var(--text-muted) 14%, transparent)",
            color: online ? "var(--success)" : "var(--text-muted)",
            border: `1px solid color-mix(in srgb, ${online ? "var(--success)" : "var(--text-muted)"} 28%, transparent)`,
          }}
        >
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          {online ? "آنلاین" : "آفلاین"}
        </span>
        <span className="text-[var(--text-secondary)]">
          آخرین بروزرسانی: {lastUpdatedLabel}
        </span>
        {pendingCount > 0 ? (
          <span
            className="font-medium"
            style={{ color: "var(--warning)" }}
          >
            {pendingCount.toLocaleString("fa-IR")} رخداد جدید
          </span>
        ) : null}
      </div>

      {pendingCount > 0 ? (
        <button
          type="button"
          onClick={onShowNew}
          className="rounded-xl px-3 py-1.5 text-sm font-medium transition hover:opacity-90"
          style={{
            background: "color-mix(in srgb, var(--warning) 14%, transparent)",
            color: "var(--warning)",
            border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)",
          }}
        >
          نمایش رخدادهای جدید
        </button>
      ) : null}
    </div>
  );
}
