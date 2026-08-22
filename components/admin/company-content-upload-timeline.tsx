"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersianDateInput } from "@/components/ui/persian-date-input";
import {
  collectSupervisionItemsForDate,
  reviewStatusLabel,
  type CompanySupervisionContentType,
  type CompanySupervisionItem,
} from "@/lib/company-supervision";
import {
  dayPositionPercent,
  getTehranCalendarDateIso,
  getTehranOffsetDateIso,
  shiftTehranCalendarDateIso,
} from "@/lib/safe-dates";
import { formatPersianDateShort, formatPersianNumber, formatTehranClock } from "@/lib/utils";

const CONTENT_MARKER_COLORS: Partial<Record<CompanySupervisionContentType, string>> = {
  billboard: "bg-sky-500",
  poster: "bg-violet-500",
  video: "bg-rose-500",
  social_post: "bg-pink-500",
  site_publication: "bg-indigo-500",
  activity: "bg-amber-500",
  file: "bg-emerald-500",
};

function markerColor(contentType: CompanySupervisionContentType): string {
  return CONTENT_MARKER_COLORS[contentType] ?? "bg-primary";
}

function UploadDayBar({
  dateIso,
  items,
}: {
  dateIso: string;
  items: CompanySupervisionItem[];
}) {
  const markers = useMemo(
    () =>
      items
        .filter((item) => item.createdAt)
        .map((item) => ({
          key: item.key,
          left: dayPositionPercent(item.createdAt!, dateIso),
          title: `${formatTehranClock(item.createdAt!)} — ${item.typeLabel}: ${item.title}`,
          color: markerColor(item.contentType),
        })),
    [dateIso, items]
  );

  return (
    <div className="space-y-2" dir="ltr">
      <div className="relative h-14 overflow-hidden rounded-lg border bg-muted/60">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/80" />
        {markers.map((marker) => (
          <div
            key={marker.key}
            className={`absolute top-1 bottom-1 w-1 rounded-full ${marker.color}`}
            style={{ left: `${marker.left}%` }}
            title={marker.title}
          />
        ))}
      </div>
      <div className="flex justify-between px-0.5 text-[11px] text-muted-foreground">
        <span>۰۰:۰۰</span>
        <span>۰۶:۰۰</span>
        <span>۱۲:۰۰</span>
        <span>۱۸:۰۰</span>
        <span>۲۴:۰۰</span>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-full bg-primary" />
          آپلود محتوا
        </span>
      </div>
    </div>
  );
}

export function CompanyContentUploadTimeline({
  items,
  onItemClick,
}: {
  items: CompanySupervisionItem[];
  onItemClick?: (item: CompanySupervisionItem) => void;
}) {
  const todayIso = getTehranCalendarDateIso();
  const yesterdayIso = getTehranOffsetDateIso(-1);
  const [selectedDate, setSelectedDate] = useState(todayIso);

  const dayItems = useMemo(
    () => collectSupervisionItemsForDate(items, selectedDate),
    [items, selectedDate]
  );

  return (
    <Card>
      <CardHeader className="space-y-4 pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Upload className="h-4 w-4 text-primary" />
          خط زمانی آپلود محتوا
          <Badge variant="outline">{formatPersianDateShort(selectedDate)}</Badge>
          <Badge variant="secondary">{formatPersianNumber(dayItems.length)} مورد</Badge>
        </CardTitle>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate((date) => shiftTehranCalendarDateIso(date, -1))}
              aria-label="روز قبل"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="w-[200px]">
              <PersianDateInput value={selectedDate} onChange={setSelectedDate} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate((date) => shiftTehranCalendarDateIso(date, 1))}
              disabled={selectedDate >= todayIso}
              aria-label="روز بعد"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={selectedDate === todayIso ? "default" : "outline"}
              onClick={() => setSelectedDate(todayIso)}
            >
              امروز
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedDate === yesterdayIso ? "default" : "outline"}
              onClick={() => setSelectedDate(yesterdayIso)}
            >
              دیروز
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <UploadDayBar dateIso={selectedDate} items={dayItems} />

        {dayItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            در این روز محتوایی آپلود نشده است.
          </p>
        ) : (
          <ol className="space-y-2">
            {dayItems.map((item) => {
              const statusLabel = reviewStatusLabel(item.reviewStatus);
              const content = (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium tabular-nums">
                      {item.createdAt ? formatTehranClock(item.createdAt) : "—"}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {item.typeLabel}
                      </Badge>
                      {statusLabel ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {statusLabel}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm">{item.title}</p>
                </>
              );

              if (onItemClick) {
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      className="w-full rounded-lg border bg-card px-3 py-2.5 text-right transition-colors hover:bg-muted/40"
                      onClick={() => onItemClick(item)}
                    >
                      {content}
                    </button>
                  </li>
                );
              }

              return (
                <li
                  key={item.key}
                  className="rounded-lg border bg-card px-3 py-2.5 text-right"
                >
                  {content}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
