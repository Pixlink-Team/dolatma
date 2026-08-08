"use client";

type DayHeaderProps = {
  title: string;
  eventCountLabel: string;
};

export function DayHeader({ title, eventCountLabel }: DayHeaderProps) {
  return (
    <div
      className="flex h-[38px] items-center justify-between"
      style={{ direction: "rtl", textAlign: "right" }}
    >
      <h2
        className="text-[18px] font-bold leading-[1.6]"
        style={{ color: "#E8EDF5" }}
      >
        {title}
      </h2>
      <span
        className="rounded-[10px] px-2.5 py-1 text-[11px]"
        style={{
          background: "#0B1527",
          border: "1px solid #17243B",
          color: "#D4DAE5",
        }}
      >
        {eventCountLabel}
      </span>
    </div>
  );
}
