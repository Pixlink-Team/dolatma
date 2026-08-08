"use client";

import { StatusBadge } from "@taghvim/components/shared/SeverityBadge";
import { RelatedResponseCard } from "@taghvim/components/timeline/RelatedResponseCard";
import { formatResponseTime, severityLabel } from "@taghvim/lib/timeline";
import type { TimelineEvent } from "@taghvim/types/timeline";
import { Bug, MessageCircle, Shield, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type EventDetailPanelProps = {
  event: TimelineEvent | null;
  relatedResponses: TimelineEvent[];
  open: boolean;
  onClose: () => void;
  onOpenRelated: (event: TimelineEvent) => void;
};

export function EventDetailPanel({
  event,
  relatedResponses,
  open,
  onClose,
  onOpenRelated,
}: EventDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{
    url: string;
    type: "image" | "video" | "audio";
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
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, lightbox]);

  if (!open) return null;

  if (!event) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-primary)] p-4 text-sm text-[var(--text-secondary)]"
      >
        رویدادی برای نمایش جزئیات انتخاب نشده است.
      </div>
    );
  }

  const isEnemy = event.eventType === "enemy";
  const media = [
    ...(event.imageUrl
      ? [{ id: "cover", url: event.imageUrl, type: "image" as const }]
      : []),
    ...(event.media ?? []),
  ];
  const impacts = (event.impact || "")
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="جزئیات رخداد"
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] xl:rounded-[14px]"
        style={{
          background: isEnemy
            ? "var(--detail-enemy-bg)"
            : "var(--detail-gov-bg)",
          border: isEnemy
            ? "1px solid var(--enemy-border)"
            : "1px solid var(--government-border)",
        }}
      >
        <div
          className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4"
        >
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {isEnemy ? (
                <Bug className="h-[19px] w-[19px] text-[var(--enemy)]" />
              ) : (
                <Shield className="h-[19px] w-[19px] text-[var(--government)]" />
              )}
              <span
                className="text-[14px] font-bold"
                style={{ color: isEnemy ? "var(--enemy)" : "var(--government)" }}
              >
                {isEnemy ? "جزئیات اقدام دشمن" : "جزئیات اقدام دولت"}
              </span>
              {isEnemy ? (
                <span
                  className="rounded-lg px-[9px] py-1 text-[10px]"
                  style={{
                    background: "var(--enemy-soft)",
                    color: "var(--enemy)",
                  }}
                >
                  {severityLabel(event.severity)}
                </span>
              ) : (
                <StatusBadge
                  status={event.actionStatus ?? event.verificationStatus}
                />
              )}
            </div>
            <h3 className="text-[16px] font-bold leading-7 text-[var(--text-primary)]">
              {event.title}
            </h3>
            {(event.duplicateReports?.length ?? 0) > 0 ? (
              <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-5 text-amber-700">
                این باکس{" "}
                {((event.duplicateReports?.length ?? 0) + 1).toLocaleString(
                  "fa-IR",
                )}{" "}
                گزارش مشابه را برای ادمین ادغام کرده است.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            style={{
              borderBottom: isEnemy
                ? "1px solid rgba(151, 56, 73, 0.18)"
                : "1px solid rgba(59, 130, 246, 0.15)",
              paddingBottom: 14,
            }}
          >
            <Meta label="تاریخ" value={event.date} />
            <Meta label="ساعت" value={event.time} />
            <Meta label="دسته‌بندی" value={event.category} />
            <Meta label="منبع" value={event.source || "—"} />
            <Meta
              label="مکان"
              value={
                [event.location?.city, event.location?.province]
                  .filter(Boolean)
                  .join("، ") || "—"
              }
            />
            {event.location?.lat != null && event.location?.lng != null ? (
              <Meta
                label="نقشه"
                value={
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${event.location.lat}&mlon=${event.location.lng}#map=14/${event.location.lat}/${event.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    مشاهده روی نقشه
                  </a>
                }
              />
            ) : null}
            {!isEnemy ? (
              <>
                <Meta label="نهاد" value={event.organization || "—"} />
                <Meta
                  label="وزارتخانه"
                  value={event.agencyName || event.organization || "—"}
                />
              </>
            ) : null}
            {event.createdByName ? (
              <Meta label="ثبت‌کننده" value={event.createdByName} />
            ) : null}
          </div>

          {(event.duplicateReports?.length ?? 0) > 0 ? (
            <section className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
              <h4 className="mb-2 text-[13px] font-bold text-amber-700">
                گزارش‌های مشابه (ادغام‌شده برای ادمین)
              </h4>
              <ul className="space-y-1.5 text-[12px] text-[var(--text-secondary)]">
                <li>
                  · {event.createdByName || "ثبت‌کننده اصلی"} — نسخهٔ اصلی این باکس
                </li>
                {event.duplicateReports!.map((report) => (
                  <li key={report.id}>
                    · {report.createdByName || "کاربر دیگر"}
                    {report.agencyName ? ` · ${report.agencyName}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h4 className="mb-1.5 flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: isEnemy ? "var(--enemy)" : "var(--government)" }}
              />
              خلاصه رویداد
            </h4>
            <p className="text-[13px] leading-[1.85] text-[var(--text-secondary)]">
              {event.description || event.summary}
            </p>
          </section>

          {media.length > 0 ? (
            <section>
              <h4 className="mb-2 text-[13px] font-bold text-[var(--text-primary)]">
                تصاویر، فیلم و صوت
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {media.slice(0, 3).map((item, idx) => {
                  const isVideo = item.type === "video";
                  const isAudio = item.type === "audio";
                  const thumb =
                    item.thumbnailUrl ||
                    (isVideo || isAudio ? undefined : item.url) ||
                    event.imageUrl ||
                    "";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setLightbox({
                          url: item.url,
                          type: isVideo ? "video" : isAudio ? "audio" : "image",
                        })
                      }
                      className="relative overflow-hidden rounded-lg border border-[var(--border)]"
                    >
                      {isVideo ? (
                        <video
                          src={item.url}
                          poster={thumb || undefined}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-20 w-full object-cover"
                        />
                      ) : isAudio ? (
                        <span className="flex h-20 w-full items-center justify-center bg-[var(--panel-2)] text-[11px] font-bold text-[var(--text-secondary)]">
                          صوت
                        </span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb || item.url}
                          alt=""
                          className="h-20 w-full object-cover"
                        />
                      )}
                      {isVideo ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[10px] font-bold text-white">
                          فیلم
                        </span>
                      ) : null}
                      {idx === 2 && media.length > 3 ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-bold text-white">
                          +{(media.length - 3).toLocaleString("fa-IR")}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {impacts.length > 0 ? (
            <section>
              <h4 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: isEnemy ? "var(--enemy)" : "var(--government)" }}
                />
                تأثیر و پیامد
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[var(--text-secondary)]">
                {impacts.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span
                      className="mt-2 h-[5px] w-[5px] shrink-0 rounded-full"
                      style={{ background: isEnemy ? "var(--enemy)" : "var(--government)" }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(event.tags ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {event.tags!.map((tag) => {
                const hero = tag === "قهرمان ملی";
                return (
                  <span
                    key={tag}
                    className="rounded-full px-[15px] py-[5px] text-[11px] font-medium"
                    style={{
                      background: hero
                        ? "rgba(201, 162, 39, 0.18)"
                        : isEnemy
                          ? "var(--enemy-soft)"
                          : "var(--government-soft)",
                      border: hero
                        ? "1px solid rgba(201, 162, 39, 0.7)"
                        : isEnemy
                          ? "1px solid var(--enemy-border)"
                          : "1px solid var(--government-border)",
                      color: hero
                        ? "#C9A227"
                        : isEnemy
                          ? "var(--enemy)"
                          : "var(--government)",
                    }}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          ) : null}

          {isEnemy ? (
            <section className="space-y-2">
              <h4 className="text-[13px] font-bold text-[var(--text-primary)]">
                پاسخ‌های مرتبط دولت
              </h4>
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
                <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                  برای این رخداد هنوز پاسخ مرتبطی ثبت نشده است.
                </p>
              )}
              {event.responseTimeMinutes != null ? (
                <p className="text-xs text-[var(--cyan)]">
                  زمان واکنش: {formatResponseTime(event.responseTimeMinutes)}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="border-t border-[var(--border)] p-3">
          <button
            type="button"
            className="inline-flex h-[38px] items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-4 text-[11px] text-[var(--text-primary)]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            مشاهده نظرات ({(event.commentsCount ?? 0).toLocaleString("fa-IR")})
          </button>
        </div>
      </div>

      {lightbox ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--overlay)] p-4">
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
              className="relative z-[71] max-h-[85vh] max-w-[90vw] rounded-xl bg-black"
            />
          ) : lightbox.type === "audio" ? (
            <div className="relative z-[71] w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
              <p className="mb-3 text-center text-sm text-[var(--text-secondary)]">
                پخش صوت
              </p>
              <audio src={lightbox.url} controls autoPlay className="w-full" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox.url}
              alt=""
              className="relative z-[71] max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
            />
          )}
        </div>
      ) : null}
    </>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
      <div className="mt-[5px] text-[11px] text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
