"use client";

import { intensityLabel } from "@taghvim/lib/timeline";
import type { TimelineDay } from "@taghvim/types/timeline";
import clsx from "clsx";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const LEGEND_COLORS = [
  "#315B9A",
  "#4477C0",
  "#6D75AE",
  "#D46B66",
  "#F0774D",
  "#D93445",
] as const;

const MIN_BAR_WIDTH = 8;
const BAR_GAP = 2;
const MONTH_GAP = 14;
/** Approximate number of days visible in the viewport before panning */
const VISIBLE_DAYS = 60;

function pickColor(normalized: number): string {
  if (normalized < 0.18) return "#193D78";
  if (normalized < 0.28) return "#224C8D";
  if (normalized < 0.38) return "#315C9F";
  if (normalized < 0.48) return "#695779";
  if (normalized < 0.58) return "#985268";
  if (normalized < 0.68) return "#C45257";
  if (normalized < 0.78) return "#E05243";
  if (normalized < 0.88) return "#F15A45";
  if (normalized < 0.94) return "#D82E43";
  return "#B8233C";
}

function shortPersianLabel(day: Pick<TimelineDay, "persianDate">): string {
  const parts = day.persianDate.split(" ");
  if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
  return day.persianDate;
}

function persianDayNumber(dateStr: string): string {
  return new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(
    new Date(`${dateStr}T12:00:00`),
  );
}

function persianMonthKey(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function persianMonthShort(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("fa-IR", { month: "short" }).format(date);
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function persianParts(date: Date): { weekday: string; persianDate: string } {
  const weekday = new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(
    date,
  );
  const persianDate = new Intl.DateTimeFormat("fa-IR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return { weekday, persianDate };
}

function emptyDay(dateStr: string): TimelineDay {
  const date = new Date(`${dateStr}T12:00:00`);
  const { weekday, persianDate } = persianParts(date);
  return {
    date: dateStr,
    persianDate,
    weekday,
    totalEvents: 0,
    enemyActionsCount: 0,
    governmentActionsCount: 0,
    intensity: 0,
    events: [],
  };
}

/** Fill every calendar day between first and last so the chart has no gaps */
function fillContinuousDays(days: TimelineDay[]): TimelineDay[] {
  if (days.length === 0) return [];
  const byDate = new Map(days.map((d) => [d.date, d]));
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const start = new Date(`${sorted[0]!.date}T12:00:00`);
  const end = new Date(`${sorted[sorted.length - 1]!.date}T12:00:00`);
  const filled: TimelineDay[] = [];

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const key = toLocalDateString(cursor);
    filled.push(byDate.get(key) ?? emptyDay(key));
  }

  return filled;
}

type EventIntensityPanelProps = {
  days: TimelineDay[];
  activeDate?: string | null;
  onSelectDay?: (date: string) => void;
  className?: string;
};

export function EventIntensityPanel({
  days,
  activeDate = null,
  onSelectDay,
  className,
}: EventIntensityPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startScroll: number;
    moved: boolean;
  }>({ active: false, startX: 0, startScroll: 0, moved: false });

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isPanning, setIsPanning] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [canPan, setCanPan] = useState(false);

  const chronological = useMemo(() => fillContinuousDays(days), [days]);

  const maxEvents = useMemo(
    () => Math.max(1, ...chronological.map((d) => d.totalEvents)),
    [chronological],
  );

  const bars = useMemo(
    () =>
      chronological.map((day, index) => {
        const normalized = Math.min(1, day.intensity / 100);
        const eventNorm = day.totalEvents / maxEvents;
        const score =
          day.totalEvents === 0
            ? 0.06
            : Math.max(normalized, eventNorm * 0.85);
        const height = Math.round(4 + score * 28);
        const monthKey = persianMonthKey(day.date);
        const prevMonthKey =
          index > 0 ? persianMonthKey(chronological[index - 1]!.date) : null;

        return {
          day,
          height,
          color: day.totalEvents === 0 ? "rgba(148,163,184,0.22)" : pickColor(score),
          shortLabel: shortPersianLabel(day),
          dayNumber: persianDayNumber(day.date),
          isEmpty: day.totalEvents === 0,
          monthKey,
          monthLabel: persianMonthShort(day.date),
          isMonthStart: index === 0 || monthKey !== prevMonthKey,
        };
      }),
    [chronological, maxEvents],
  );

  const barSlotWidth = useMemo(() => {
    if (containerWidth <= 0) return MIN_BAR_WIDTH;
    // Size bars so ~60 days fit in the viewport; remaining days require pan.
    const gaps = Math.max(0, VISIBLE_DAYS - 1) * BAR_GAP;
    return Math.max(MIN_BAR_WIDTH, (containerWidth - gaps) / VISIBLE_DAYS);
  }, [containerWidth]);

  const barOffsets = useMemo(() => {
    const offsets: number[] = [];
    let x = 0;
    for (let i = 0; i < bars.length; i++) {
      if (i > 0) {
        x += BAR_GAP;
        if (bars[i]!.isMonthStart) x += MONTH_GAP;
      }
      offsets.push(x);
      x += barSlotWidth;
    }
    return offsets;
  }, [bars, barSlotWidth]);

  const trackWidth = useMemo(() => {
    if (bars.length === 0 || barOffsets.length === 0) return 0;
    return barOffsets[barOffsets.length - 1]! + barSlotWidth;
  }, [bars.length, barOffsets, barSlotWidth]);

  const monthMarkers = useMemo(
    () =>
      bars
        .map((bar, index) => ({ bar, index }))
        .filter(({ bar }) => bar.isMonthStart),
    [bars],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      setContainerWidth(width);
      setCanPan(el.scrollWidth > el.clientWidth + 2);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [bars.length, trackWidth]);

  useEffect(() => {
    if (!activeDate || !scrollRef.current) return;
    const container = scrollRef.current;
    const el = container.querySelector<HTMLElement>(
      `[data-day="${activeDate}"]`,
    );
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const delta =
      elRect.left +
      elRect.width / 2 -
      (containerRect.left + containerRect.width / 2);

    if (Math.abs(delta) < 2) return;
    container.scrollBy({ left: delta, behavior: "smooth" });
  }, [activeDate]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    // Only start pan with primary button / touch
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: scrollRef.current.scrollLeft,
      moved: false,
    };
    // Delay capture until we actually pan so bar clicks still fire.
  }, []);

  const clearHover = useCallback(() => {
    setHoveredDate(null);
    setHoverPoint(null);
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag.active || !scrollRef.current) return;
      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) > 4) {
        if (!drag.moved) {
          drag.moved = true;
          setIsPanning(true);
          clearHover();
          scrollRef.current.setPointerCapture(e.pointerId);
        }
        scrollRef.current.scrollLeft = drag.startScroll - dx;
      }
    },
    [clearHover],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const wasPanning = drag.moved;
      drag.active = false;
      if (scrollRef.current?.hasPointerCapture(e.pointerId)) {
        scrollRef.current.releasePointerCapture(e.pointerId);
      }
      if (wasPanning) {
        clearHover();
        // Keep hover suppressed briefly so mouseenter after drag doesn't flash tooltip
        window.setTimeout(() => {
          dragRef.current.moved = false;
          setIsPanning(false);
        }, 120);
      } else {
        drag.moved = false;
        setIsPanning(false);
      }
    },
    [clearHover],
  );

  const handleBarClick = useCallback(
    (date: string) => {
      if (dragRef.current.moved) return;
      onSelectDay?.(date);
    },
    [onSelectDay],
  );

  const handleBarHover = useCallback(
    (date: string | null, point?: { x: number; y: number } | null) => {
      if (dragRef.current.active || dragRef.current.moved || isPanning) {
        clearHover();
        return;
      }
      setHoveredDate(date);
      setHoverPoint(date && point ? point : null);
    },
    [clearHover, isPanning],
  );

  if (bars.length === 0) {
    return (
      <div
        className={clsx(
          "flex h-[116px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] text-xs text-[var(--text-secondary)]",
          className,
        )}
      >
        در این بازه روزی برای نمایش شدت وجود ندارد.
      </div>
    );
  }

  const rangeLabel = `${bars[0]!.shortLabel} تا ${bars[bars.length - 1]!.shortLabel}`;
  const hovered =
    !isPanning && hoveredDate
      ? (bars.find((b) => b.day.date === hoveredDate) ?? null)
      : null;
  const selected = activeDate;

  return (
    <div
      className={clsx(
        "event-intensity-panel grid h-auto min-h-[132px] grid-cols-1 items-stretch gap-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 sm:h-[148px] sm:grid-cols-[100px_1fr] sm:gap-3 sm:px-4 sm:py-0 md:grid-cols-[118px_1fr]",
        className,
      )}
      style={{ direction: "rtl" }}
      aria-label="شدت رویدادها"
    >
      <div className="flex min-w-0 flex-row items-center justify-between gap-2 sm:flex-col sm:justify-center sm:gap-2">
        <p className="m-0 text-xs font-medium leading-tight text-[var(--text-secondary)]">
          شدت رویدادها
        </p>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[var(--text-muted)]">کم</span>
          <div className="flex items-center gap-0.5">
            {LEGEND_COLORS.map((color) => (
              <span
                key={color}
                className="inline-block h-[7px] w-2.5 rounded-[1.5px]"
                style={{ background: color }}
              />
            ))}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">زیاد</span>
        </div>

        <p className="m-0 hidden text-[9px] leading-snug text-[var(--text-muted)] sm:block">
          {rangeLabel}
          <br />
          {Math.min(VISIBLE_DAYS, bars.length).toLocaleString("fa-IR")} روز
          نمایان · بقیه را بکشید
        </p>
      </div>

      <div
        ref={scrollRef}
        className={clsx(
          "scrollbar-thin relative min-w-0 overflow-x-auto overflow-y-hidden pt-2 pb-1 select-none",
          canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          isPanning && "[&_button]:pointer-events-none",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={(e) => {
          if (dragRef.current.active) endDrag(e);
          clearHover();
        }}
        onMouseLeave={clearHover}
      >
        <div
          ref={trackRef}
          className="relative flex h-full flex-col justify-end pb-8"
          style={{ width: Math.max(trackWidth, containerWidth || trackWidth) }}
        >
          <div
            className="relative z-[1] flex h-[36px] items-end"
            style={{ gap: BAR_GAP }}
          >
            {bars.map((bar, index) => {
              const isActive = selected === bar.day.date;
              const isHovered = !isPanning && hoveredDate === bar.day.date;

              return (
                <button
                  key={bar.day.date}
                  type="button"
                  data-day={bar.day.date}
                  aria-label={`${bar.day.persianDate}، ${bar.day.totalEvents} رویداد`}
                  onMouseEnter={(e) =>
                    handleBarHover(bar.day.date, {
                      x: e.clientX,
                      y: e.clientY,
                    })
                  }
                  onMouseMove={(e) =>
                    handleBarHover(bar.day.date, {
                      x: e.clientX,
                      y: e.clientY,
                    })
                  }
                  onMouseLeave={() => handleBarHover(null)}
                  onFocus={() => handleBarHover(bar.day.date)}
                  onBlur={() => handleBarHover(null)}
                  onClick={() => handleBarClick(bar.day.date)}
                  className="pointer-events-auto cursor-pointer border-0 p-0 transition-[box-shadow,transform] duration-120"
                  style={{
                    width: barSlotWidth,
                    minWidth: barSlotWidth,
                    height: bar.height,
                    marginInlineStart:
                      index > 0 && bar.isMonthStart ? MONTH_GAP : 0,
                    background: bar.color,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                    boxShadow: isActive
                      ? `0 0 10px ${bar.color}88`
                      : isHovered
                        ? `0 0 8px ${bar.color}55`
                        : "none",
                    outline: isActive ? "1px solid var(--primary)" : "none",
                    outlineOffset: 1,
                    transform:
                      isHovered || isActive ? "scaleY(1.06)" : "none",
                    transformOrigin: "bottom",
                    opacity: bar.isEmpty ? 0.7 : 1,
                  }}
                />
              );
            })}
          </div>

          <div className="relative mt-0 h-px w-full bg-[var(--border)]">
            {bars.map((bar, index) => (
              <span
                key={`tick-${bar.day.date}`}
                className="absolute top-0 h-[4px] w-px bg-[var(--border)]"
                style={{
                  right: (barOffsets[index] ?? 0) + barSlotWidth / 2,
                  opacity: bar.isMonthStart || index % 5 === 0 ? 1 : 0.35,
                }}
              />
            ))}
            {monthMarkers.map(({ bar, index }) =>
              index > 0 ? (
                <span
                  key={`month-sep-${bar.day.date}`}
                  className="absolute top-[-34px] h-[34px] w-px"
                  style={{
                    right:
                      (barOffsets[index] ?? 0) - MONTH_GAP / 2 - BAR_GAP / 2,
                    background:
                      "linear-gradient(to top, var(--border), transparent)",
                  }}
                />
              ) : null,
            )}
          </div>

          {/* Day numbers directly under bars */}
          <div className="relative mt-1 h-[14px]">
            {bars.map((bar, index) => {
              const isSelected = selected === bar.day.date;
              return (
                <button
                  key={`daynum-${bar.day.date}`}
                  type="button"
                  onClick={() => handleBarClick(bar.day.date)}
                  title={bar.day.persianDate}
                  className="absolute z-[2] cursor-pointer whitespace-nowrap leading-none tabular-nums"
                  style={{
                    top: isSelected ? -1 : 0,
                    right: (barOffsets[index] ?? 0) + barSlotWidth / 2,
                    transform: "translateX(50%)",
                    border: isSelected
                      ? "1px solid var(--primary)"
                      : "none",
                    background: isSelected
                      ? "linear-gradient(180deg, #3478ed 0%, #1957c8 100%)"
                      : "transparent",
                    color: isSelected
                      ? "#ffffff"
                      : bar.isMonthStart
                        ? "var(--text-secondary)"
                        : "var(--text-muted)",
                    borderRadius: isSelected ? 5 : 0,
                    padding: isSelected ? "1px 5px" : 0,
                    fontSize: isSelected ? 10 : 8,
                    fontWeight: isSelected || bar.isMonthStart ? 600 : 400,
                    boxShadow: isSelected
                      ? "0 0 10px rgba(39, 112, 255, 0.32)"
                      : "none",
                  }}
                >
                  {isSelected ? bar.shortLabel : bar.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Month names below day numbers */}
          <div className="relative mt-0.5 h-[12px]">
            {monthMarkers.map(({ bar, index }) => (
              <span
                key={`month-${bar.day.date}`}
                className="pointer-events-none absolute top-0 text-[8px] font-medium text-[var(--text-muted)]"
                style={{
                  right: (barOffsets[index] ?? 0) + barSlotWidth / 2,
                  transform: "translateX(50%)",
                }}
              >
                {bar.monthLabel}
              </span>
            ))}
          </div>
        </div>
      </div>

      {hovered && hoverPoint ? (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[80] w-[190px] rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-2 shadow-xl"
          style={{
            left: hoverPoint.x,
            top: hoverPoint.y - 12,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="m-0 text-[11px] font-semibold text-[var(--text-primary)]">
            {hovered.day.weekday} {hovered.day.persianDate}
          </p>
          <p className="mt-1.5 mb-0 text-[10px] text-[var(--text-secondary)]">
            {hovered.day.totalEvents.toLocaleString("fa-IR")} رویداد
          </p>
          <p className="mt-0.5 mb-0 text-[10px] text-[var(--enemy)]">
            {hovered.day.enemyActionsCount.toLocaleString("fa-IR")} اقدام دشمن
          </p>
          <p className="mt-0.5 mb-0 text-[10px] text-[var(--government)]">
            {hovered.day.governmentActionsCount.toLocaleString("fa-IR")} اقدام
            دولت
          </p>
          <p className="mt-1 mb-0 text-[10px] text-[var(--text-secondary)]">
            شدت:{" "}
            {hovered.isEmpty
              ? "بدون فعالیت"
              : intensityLabel(hovered.day.intensity)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
