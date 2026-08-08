"use client";

import { EventDetailPanel } from "@taghvim/components/timeline/EventDetailPanel";
import { DayFullView } from "@taghvim/components/views/daily/DayFullView";
import { resolveDay } from "@taghvim/components/views/daily/DailyToolbar";
import type { TimelineDay, TimelineEvent } from "@taghvim/types/timeline";
import { X } from "lucide-react";
import { useEffect, useMemo } from "react";

type DayDetailModalProps = {
  open: boolean;
  date: string | null;
  days: TimelineDay[];
  selectedEvent: TimelineEvent | null;
  relatedResponses: TimelineEvent[];
  searchQuery?: string;
  showEnemy?: boolean;
  showGovernment?: boolean;
  relatedLookup: (event: TimelineEvent) => {
    hasResponse: boolean;
    responseTimeMinutes?: number;
  };
  onClose: () => void;
  onOpenEvent: (event: TimelineEvent) => void;
  onOpenRelated: (event: TimelineEvent) => void;
};

export function DayDetailModal({
  open,
  date,
  days,
  selectedEvent,
  relatedResponses,
  searchQuery = "",
  showEnemy = true,
  showGovernment = true,
  relatedLookup,
  onClose,
  onOpenEvent,
  onOpenRelated,
}: DayDetailModalProps) {
  const day = useMemo(
    () => (date ? resolveDay(days, date) : null),
    [days, date],
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !day) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay)]"
        aria-label="بستن نمای روز"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`نمای روزانه ${day.persianDate}`}
        className="relative z-[1] flex h-full w-full max-w-6xl flex-col overflow-hidden border border-[var(--border)] bg-[var(--background)] shadow-2xl pt-[env(safe-area-inset-top)] sm:h-[min(92dvh,920px)] sm:rounded-2xl sm:pt-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 sm:px-4">
          <div className="min-w-0">
            <p className="m-0 text-sm font-bold text-[var(--text-primary)]">
              نمای روزانه
            </p>
            <p className="m-0 truncate text-xs text-[var(--text-secondary)]">
              {day.weekday}، {day.persianDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4">
            <DayFullView
              day={day}
              searchQuery={searchQuery}
              selectedEventId={selectedEvent?.id ?? null}
              showEnemy={showEnemy}
              showGovernment={showGovernment}
              relatedLookup={relatedLookup}
              onOpenEvent={onOpenEvent}
            />
          </div>

          <div className="hidden min-h-0 border-t border-[var(--border)] lg:block lg:border-t-0 lg:border-r lg:border-[var(--border)]">
            <div className="h-full min-h-[320px] overflow-y-auto overscroll-contain p-3 sm:p-4">
              <EventDetailPanel
                open
                event={selectedEvent}
                relatedResponses={relatedResponses}
                onClose={() => undefined}
                onOpenRelated={onOpenRelated}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
