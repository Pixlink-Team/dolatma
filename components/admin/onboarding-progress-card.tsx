import { Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OnboardingProgress } from "@/lib/onboarding/types";
import { cn, formatPersianNumber } from "@/lib/utils";

interface OnboardingProgressSummaryProps {
  progress: OnboardingProgress;
  title?: string;
  description?: string;
}

/** Compact completion indicator for Rasad (audit) — percent only, no step checklist. */
export function OnboardingProgressSummary({
  progress,
  title = "پیشرفت راه‌اندازی دستگاه",
  description,
}: OnboardingProgressSummaryProps) {
  const { completedCount, totalCount, percent, deviceName } = progress;
  const done = percent === 100;

  return (
    <Card className="border-emerald-200/60 bg-gradient-to-l from-emerald-50/70 via-background to-background">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{title}</p>
            <Badge
              variant={done ? "default" : "secondary"}
              className={cn("gap-1 text-xs", done && "bg-emerald-600 hover:bg-emerald-600")}
            >
              <Target className="h-3 w-3" />
              {done ? "تکمیل شد" : `${formatPersianNumber(percent)}٪`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {description ??
              `دستگاه «${deviceName}» — ${formatPersianNumber(completedCount)} از ${formatPersianNumber(totalCount)} مرحله`}
          </p>
        </div>

        <div className="flex w-full max-w-[220px] flex-col gap-1.5 sm:w-[180px]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {formatPersianNumber(completedCount)}/{formatPersianNumber(totalCount)}
            </span>
            <span className={cn("font-medium", done ? "text-emerald-700" : "text-foreground")}>
              {formatPersianNumber(percent)}٪
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
