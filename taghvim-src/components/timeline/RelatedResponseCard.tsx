"use client";

import { formatResponseTime } from "@taghvim/lib/timeline";
import type { TimelineEvent } from "@taghvim/types/timeline";

type RelatedResponseCardProps = {
  response: TimelineEvent;
  responseTimeMinutes?: number;
  onOpen: (event: TimelineEvent) => void;
};

export function RelatedResponseCard({
  response,
  responseTimeMinutes,
  onOpen,
}: RelatedResponseCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(response)}
      className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-right transition hover:bg-emerald-500/10"
    >
      <p className="text-sm font-medium text-[var(--text-primary)]">{response.title}</p>
      <p className="mt-1 text-xs text-emerald-700">
        {response.organization || "نهاد نامشخص"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--text-secondary)]">
        <span>زمان پاسخ: {response.time}</span>
        <span>وضعیت: {response.verificationStatus === "verified" ? "انجام‌شده" : "در جریان"}</span>
        {responseTimeMinutes != null ? (
          <span className="text-[var(--cyan)]">
            زمان واکنش: {formatResponseTime(responseTimeMinutes)}
          </span>
        ) : null}
      </div>
    </button>
  );
}
