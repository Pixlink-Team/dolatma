"use client";

import { intensityColor, intensityLabel } from "@taghvim/lib/timeline";
import type { MonthlyDayCell } from "@taghvim/lib/monthly";
import clsx from "clsx";

type MonthlyDayCellProps = {
  cell: MonthlyDayCell;
  selected?: boolean;
  onSelect: (date: string) => void;
};

export function MonthlyDayCellCard({
  cell,
  selected = false,
  onSelect,
}: MonthlyDayCellProps) {
  if (!cell.inMonth || !cell.date || !cell.day) {
    return (
      <div
        className="aspect-square min-h-[92px] rounded-xl border border-transparent bg-transparent md:min-h-[132px] md:aspect-auto"
        aria-hidden
      />
    );
  }

  const { day, thumbs, summary, dayNumber } = cell;
  const hasEvents = day.totalEvents > 0;
  const tone = intensityColor(day.intensity);

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.date!)}
      className={clsx(
        "flex aspect-square min-h-[92px] w-full flex-col gap-1 rounded-xl border p-2 text-right transition duration-150 md:min-h-[132px] md:aspect-auto md:gap-1.5 md:p-2.5",
        "hover:border-[var(--primary)]/40 hover:bg-[var(--surface-3)]",
        selected
          ? "border-[var(--primary)]/55 bg-[var(--surface-3)] shadow-[0_0_18px_rgba(39,112,255,0.16)]"
          : "border-[var(--border)] bg-[var(--panel)]",
        !hasEvents && "opacity-80",
      )}
      style={{
        boxShadow: selected
          ? undefined
          : hasEvents
            ? `inset 0 0 0 1px ${tone}28`
            : undefined,
      }}
      aria-pressed={selected}
      aria-label={`${day.persianDate}، ${day.totalEvents} رویداد`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={clsx(
            "flex h-7 min-w-7 items-center justify-center rounded-lg text-sm font-bold tabular-nums",
            selected
              ? "bg-blue-600 text-white"
              : "bg-[var(--panel-2)] text-[var(--text-primary)]",
          )}
        >
          {(dayNumber ?? 0).toLocaleString("fa-IR")}
        </span>

        {hasEvents ? (
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: tone }}
            title={intensityLabel(day.intensity)}
          >
            {day.totalEvents.toLocaleString("fa-IR")}
          </span>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)]">—</span>
        )}
      </div>

      {hasEvents ? (
        <>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]">
            <span className="text-[var(--enemy)]">
              د {day.enemyActionsCount.toLocaleString("fa-IR")}
            </span>
            <span className="text-[var(--government)]">
              و {day.governmentActionsCount.toLocaleString("fa-IR")}
            </span>
          </div>

          {summary ? (
            <p className="m-0 line-clamp-2 hidden text-[10px] leading-4 text-[var(--text-secondary)] md:block">
              {summary}
            </p>
          ) : null}

          {thumbs.length > 0 ? (
            <div className="mt-auto hidden gap-1 pt-0.5 md:flex">
              {thumbs.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-7 w-7 rounded-md object-cover ring-1 ring-[var(--border)]"
                  loading="lazy"
                />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="m-0 mt-auto text-[10px] text-[var(--text-muted)]">
          بدون رویداد
        </p>
      )}
    </button>
  );
}
