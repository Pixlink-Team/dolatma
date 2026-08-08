"use client";

import { EventDetailPanel } from "@taghvim/components/timeline/EventDetailPanel";
import type { TimelineEvent } from "@taghvim/types/timeline";
import { useEffect } from "react";

type EventDetailModalProps = {
  event: TimelineEvent | null;
  relatedResponses: TimelineEvent[];
  open: boolean;
  onClose: () => void;
  onOpenRelated: (event: TimelineEvent) => void;
};

/** Full-screen / bottom-sheet event details for small and medium screens. */
export function EventDetailModal({
  event,
  relatedResponses,
  open,
  onClose,
  onOpenRelated,
}: EventDetailModalProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !event) return null;

  return (
    <div className="fixed inset-0 z-[60] xl:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        aria-label="بستن جزئیات رویداد"
        onClick={onClose}
      />

      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface-2)] pb-[env(safe-area-inset-bottom)] shadow-2xl overscroll-contain sm:inset-y-6 sm:left-1/2 sm:right-auto sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-2xl sm:pb-0"
        role="presentation"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--border)] sm:hidden" />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <EventDetailPanel
            open
            event={event}
            relatedResponses={relatedResponses}
            onClose={onClose}
            onOpenRelated={onOpenRelated}
          />
        </div>
      </div>
    </div>
  );
}
