"use client";

import { Check } from "lucide-react";
import { cn, formatPersianNumber } from "@/lib/utils";
import type { PassportCompletion } from "@/lib/device-passport-completion";

function CircularProgress({
  percent,
  complete,
}: {
  percent: number;
  complete: boolean;
}) {
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative mx-auto flex h-[120px] w-[120px] items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/50"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "transition-[stroke-dashoffset,color] duration-700 ease-out",
            complete ? "text-emerald-500" : "text-amber-500"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {complete ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
        ) : (
          <>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {formatPersianNumber(percent)}
              <span className="text-sm font-medium text-muted-foreground">٪</span>
            </span>
            <span className="text-[11px] text-muted-foreground">پیشرفت</span>
          </>
        )}
      </div>
    </div>
  );
}

interface DevicePassportCompletionRingProps {
  completion: PassportCompletion;
  className?: string;
  /** Called when user taps a missing checklist item (e.g. open the right editor). */
  onMissingItemClick?: (key: string) => void;
}

export function DevicePassportCompletionRing({
  completion,
  className,
  onMissingItemClick,
}: DevicePassportCompletionRingProps) {
  const { percent, complete, completedCount, totalCount, missingLabels, items } = completion;

  return (
    <div
      className={cn(
        "flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border p-4",
        complete
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-amber-200/80 bg-amber-50/40",
        className
      )}
    >
      <p className="w-full text-center text-xs font-medium text-muted-foreground">
        پیشرفت تکمیل شناسنامه
      </p>
      <CircularProgress percent={percent} complete={complete} />

      <div className="w-full space-y-2 text-center sm:text-right">
        <p
          className={cn(
            "text-sm font-semibold",
            complete ? "text-emerald-700" : "text-foreground"
          )}
        >
          {complete
            ? "شناسنامه کامل است"
            : `${formatPersianNumber(completedCount)} از ${formatPersianNumber(totalCount)} مورد تکمیل شده`}
        </p>

        {complete ? (
          <p className="text-xs leading-relaxed text-emerald-700/90">
            همه اطلاعات لازم برای شناسنامه دستگاه وارد شده است.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">هنوز وارد نشده:</p>
            <ul className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {items
                .filter((item) => !item.done)
                .map((item) => {
                  const clickable = Boolean(onMissingItemClick);
                  const Tag = clickable ? "button" : "span";
                  return (
                    <li key={item.key}>
                      <Tag
                        type={clickable ? "button" : undefined}
                        onClick={
                          clickable ? () => onMissingItemClick?.(item.key) : undefined
                        }
                        className={cn(
                          "rounded-md border border-amber-300/70 bg-background/80 px-2 py-0.5 text-xs font-medium text-amber-900",
                          clickable && "hover:border-amber-500 hover:bg-amber-100/80"
                        )}
                      >
                        {item.label}
                      </Tag>
                    </li>
                  );
                })}
            </ul>
            <ul className="hidden space-y-1.5 pt-1 sm:block">
              {items.map((item) => {
                const clickable = !item.done && Boolean(onMissingItemClick);
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => onMissingItemClick?.(item.key)}
                      className={cn(
                        "flex w-full items-center gap-2 text-xs",
                        item.done ? "text-emerald-700" : "text-muted-foreground",
                        clickable && "hover:text-amber-900"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                          item.done
                            ? "bg-emerald-500 text-white"
                            : "border border-dashed border-muted-foreground/50"
                        )}
                      >
                        {item.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {missingLabels.length > 0 ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                با تکمیل موارد بالا، نوار دایره‌ای پر می‌شود و سبز می‌شود.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
