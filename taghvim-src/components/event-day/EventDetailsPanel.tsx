"use client";

import { DetailSection } from "@taghvim/components/event-day/DetailSection";
import { EvidenceGallery } from "@taghvim/components/event-day/EvidenceGallery";
import { EventTags } from "@taghvim/components/event-day/EventTags";
import type { EventDayDetail, EventItem } from "@taghvim/types/event-day";
import { Bug, MessageSquare, X } from "lucide-react";

type EventDetailsPanelProps = {
  event: EventItem;
  detail: EventDayDetail;
  onClose?: () => void;
};

export function EventDetailsPanel({
  event,
  detail,
  onClose,
}: EventDetailsPanelProps) {
  return (
    <aside
      className="flex min-h-[620px] flex-col overflow-hidden rounded-[14px]"
      style={{
        direction: "rtl",
        textAlign: "right",
        padding: "17px 18px 10px",
        background: `
          radial-gradient(circle at 55% 10%, rgba(109, 30, 48, 0.22), transparent 38%),
          linear-gradient(180deg, #17101C 0%, #0E1322 70%, #0B1322 100%)
        `,
        border: "1px solid rgba(207, 48, 62, 0.62)",
        boxShadow: "inset 0 0 40px rgba(174, 28, 49, 0.06)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="h-[19px] w-[19px]" style={{ color: "#E83442" }} />
          <h3
            className="text-[14px] font-bold"
            style={{ color: "#FF494F" }}
          >
            {detail.panelTitle}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center"
          style={{ color: "#F3F4F6" }}
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-[14px] flex flex-wrap items-center gap-2">
        <h2
          className="text-[16px] font-bold"
          style={{ color: "#F7F3F5" }}
        >
          {event.title}
        </h2>
        <span
          className="rounded-lg px-[9px] py-1 text-[10px]"
          style={{
            background: "rgba(171, 27, 43, 0.35)",
            color: "#FF555D",
          }}
        >
          {event.status}
        </span>
      </div>

      <div
        className="mt-[13px]"
        style={{ borderTop: "1px solid rgba(151, 56, 73, 0.18)" }}
      />

      <div
        className="mt-[13px] grid"
        style={{
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px 4px",
        }}
      >
        <Meta label="تاریخ" value={detail.dateLabel} />
        <Meta label="دسته‌بندی" value={detail.category} />
        <Meta label="ساعت" value={detail.timeLabel} />
        <Meta label="منبع" value={detail.source} />
      </div>

      <div
        className="mt-[14px]"
        style={{ borderTop: "1px solid rgba(151, 56, 73, 0.18)" }}
      />

      <DetailSection title="خلاصه رویداد" className="mt-[14px]">
        <p
          className="mt-2.5 text-[11px] leading-[1.95]"
          style={{ color: "#C6BEC4" }}
        >
          {detail.summary}
        </p>
      </DetailSection>

      <DetailSection
        title="تصاویر و مدارک"
        showDot={false}
        className="mt-[17px]"
      >
        <EvidenceGallery
          images={detail.evidenceImages}
          extraCount={detail.evidenceExtraCount}
        />
      </DetailSection>

      <DetailSection title="تأثیر و پیامد" className="mt-[18px]">
        <ul className="space-y-1.5">
          {detail.impacts.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span
                className="mt-2 shrink-0 rounded-full"
                style={{ width: 5, height: 5, background: "#EE4C58" }}
              />
              <span
                className="text-[11px] leading-[1.9]"
                style={{ color: "#D0C8CE" }}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      </DetailSection>

      <DetailSection title="برچسب‌ها" showDot={false} className="mt-[14px]">
        <EventTags tags={detail.tags} />
      </DetailSection>

      <div className="mt-auto flex justify-start pt-3">
        <button
          type="button"
          className="inline-flex h-[38px] w-[190px] items-center justify-center gap-2 rounded-lg text-[11px]"
          style={{
            background: "linear-gradient(180deg, #171F35, #121A2E)",
            border: "1px solid #25304B",
            color: "#E5E7EC",
          }}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          مشاهده نظرات ({detail.commentsCount.toLocaleString("fa-IR")})
        </button>
      </div>
    </aside>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px]" style={{ color: "#8E8792" }}>
        {label}
      </p>
      <p className="mt-[5px] text-[11px]" style={{ color: "#E1DCE1" }}>
        {value}
      </p>
    </div>
  );
}
