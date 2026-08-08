"use client";

import { RelatedResponseCard } from "@taghvim/components/timeline/RelatedResponseCard";
import {
  formatResponseTime,
  severityLabel,
  verificationLabel,
} from "@taghvim/lib/timeline";
import type { TimelineEvent } from "@taghvim/types/timeline";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type EventDetailsDrawerProps = {
  event: TimelineEvent | null;
  relatedResponses: TimelineEvent[];
  open: boolean;
  onClose: () => void;
  onOpenRelated: (event: TimelineEvent) => void;
};

export function EventDetailsDrawer({
  event,
  relatedResponses,
  open,
  onClose,
  onOpenRelated,
}: EventDetailsDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{
    url: string;
    type: "image" | "video" | "audio" | "document";
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightbox) setLightbox(null);
        else onClose();
      }
    };

    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, lightbox]);

  if (!open || !event) return null;

  const media = [
    ...(event.imageUrl
      ? [{ id: "cover", url: event.imageUrl, type: "image" as const }]
      : []),
    ...(event.media ?? []),
  ];

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="بستن پنل جزئیات"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="جزئیات رخداد"
        className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl scrollbar-thin focus:outline-none md:inset-y-0 md:left-0 md:right-auto md:max-h-none md:w-[440px] md:rounded-none md:border-y-0 md:border-l-0 md:border-r"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">
              {event.eventType === "enemy" ? "اقدام دشمن" : "اقدام دولت"}
            </p>
            <h3 className="mt-1 text-lg font-bold text-white">{event.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/5"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-md bg-red-500/15 px-2 py-1 text-red-200">
            شدت: {severityLabel(event.severity)}
          </span>
          <span className="rounded-md bg-white/5 px-2 py-1 text-slate-300">
            {event.date} · {event.time}
          </span>
          <span className="rounded-md bg-white/5 px-2 py-1 text-slate-300">
            {verificationLabel(event.verificationStatus)}
          </span>
        </div>

        <dl className="space-y-2 text-sm text-slate-300">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">محل</dt>
            <dd>
              {[event.location?.city, event.location?.province]
                .filter(Boolean)
                .join("، ") || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">منبع</dt>
            <dd>{event.source || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">دسته‌بندی</dt>
            <dd>{event.category}</dd>
          </div>
          {event.organization ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">نهاد</dt>
              <dd>{event.organization}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-5 space-y-2">
          <h4 className="text-sm font-semibold text-white">شرح کامل</h4>
          <p className="text-sm leading-7 text-slate-300">
            {event.description || event.summary}
          </p>
        </div>

        {event.impact ? (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold text-white">اثر و پیامد</h4>
            <p className="text-sm leading-7 text-slate-300">{event.impact}</p>
          </div>
        ) : null}

        {media.length > 0 ? (
          <div className="mt-5 space-y-2">
            <h4 className="text-sm font-semibold text-white">تصاویر، فیلم و صوت</h4>
            <div className="grid grid-cols-2 gap-2">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setLightbox({
                      url: item.url,
                      type: item.type,
                    })
                  }
                  className="overflow-hidden rounded-xl border border-[var(--border)]"
                >
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-24 w-full object-cover"
                    />
                  ) : item.type === "audio" ? (
                    <span className="flex h-24 w-full items-center justify-center bg-white/5 text-xs text-slate-300">
                      صوت
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt=""
                      className="h-24 w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {(event.tags ?? []).length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {event.tags!.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        {event.eventType === "enemy" ? (
          <div className="mt-5 space-y-2">
            <h4 className="text-sm font-semibold text-white">پاسخ‌های مرتبط</h4>
            {relatedResponses.length > 0 ? (
              relatedResponses.map((response) => (
                <RelatedResponseCard
                  key={response.id}
                  response={response}
                  responseTimeMinutes={event.responseTimeMinutes}
                  onOpen={onOpenRelated}
                />
              ))
            ) : (
              <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                بدون پاسخ ثبت‌شده
              </p>
            )}
            {event.responseTimeMinutes != null ? (
              <p className="text-xs text-cyan-300">
                زمان واکنش: {formatResponseTime(event.responseTimeMinutes)}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div className="rounded-xl border border-[var(--border)] p-3">
            نظرات: {(event.commentsCount ?? 0).toLocaleString("fa-IR")}
          </div>
          <div className="rounded-xl border border-[var(--border)] p-3">
            ویرایش‌ها: {(event.editHistory?.length ?? 0).toLocaleString("fa-IR")}
          </div>
        </div>
      </div>

      {lightbox ? (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="بستن رسانه"
            onClick={() => setLightbox(null)}
          />
          {lightbox.type === "video" ? (
            <video
              src={lightbox.url}
              controls
              autoPlay
              className="relative z-[61] max-h-[85vh] max-w-[90vw] rounded-xl bg-black"
            />
          ) : lightbox.type === "audio" ? (
            <div className="relative z-[61] w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6">
              <audio src={lightbox.url} controls autoPlay className="w-full" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox.url}
              alt=""
              className="relative z-[61] max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
