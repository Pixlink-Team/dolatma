import Link from "next/link";
import { ArrowLeft, Check, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OnboardingProgress } from "@/lib/onboarding/types";
import { cn, formatPersianNumber } from "@/lib/utils";

interface OnboardingProgressCardProps {
  progress: OnboardingProgress;
}

function CircularProgress({
  percent,
  completedCount,
  totalCount,
}: {
  percent: number;
  completedCount: number;
  totalCount: number;
}) {
  const size = 168;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const done = percent === 100;

  return (
    <div className="relative mx-auto flex h-[168px] w-[168px] items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/60"
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
            "transition-[stroke-dashoffset] duration-700 ease-out",
            done ? "text-emerald-500" : "text-emerald-500"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={cn(
            "text-3xl font-bold tracking-tight",
            done ? "text-emerald-600" : "text-foreground"
          )}
        >
          {formatPersianNumber(completedCount)}
          <span className="mx-0.5 text-lg font-medium text-muted-foreground">/</span>
          {formatPersianNumber(totalCount)}
        </span>
        <span className="mt-0.5 text-xs text-muted-foreground">
          {done ? "تکمیل شد" : `${formatPersianNumber(percent)}٪ پیشرفت`}
        </span>
      </div>
    </div>
  );
}

export function OnboardingProgressCard({ progress }: OnboardingProgressCardProps) {
  const { steps, completedCount, totalCount, percent } = progress;
  const currentIndex = steps.findIndex((step) => !step.done);
  const remaining = steps.filter((step) => !step.done).length;

  return (
    <Card className="overflow-hidden border-emerald-200/60 bg-gradient-to-l from-emerald-50/70 via-background to-background">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">راه‌اندازی سامانه</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              مأموریت‌های زیر را انجام دهید تا آماده‌سازی کامل شود.
            </p>
          </div>
          <Badge
            variant={percent === 100 ? "default" : "secondary"}
            className={cn(
              "gap-1 text-sm",
              percent === 100 && "bg-emerald-600 hover:bg-emerald-600"
            )}
          >
            <Target className="h-3.5 w-3.5" />
            {percent === 100
              ? "همه مأموریت‌ها انجام شد"
              : `${formatPersianNumber(remaining)} مأموریت باقی‌مانده`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[200px_1fr] md:items-start">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-background/70 p-4 ring-1 ring-emerald-100">
            <CircularProgress
              percent={percent}
              completedCount={completedCount}
              totalCount={totalCount}
            />
            <p className="text-center text-xs text-muted-foreground">
              {formatPersianNumber(completedCount)} از {formatPersianNumber(totalCount)} مأموریت
              تکمیل شده
            </p>
          </div>

          <ol className="space-y-2">
            {steps.map((step, index) => {
              const isDone = step.done;
              const isCurrent = index === currentIndex;

              return (
                <li key={step.stepKey}>
                  <Link
                    href={step.href}
                    className={cn(
                      "group flex items-start gap-3 rounded-xl border p-3 transition-colors",
                      isDone &&
                        "border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-50",
                      isCurrent &&
                        "border-emerald-400 bg-white shadow-sm ring-1 ring-emerald-200 hover:bg-emerald-50/40",
                      !isDone &&
                        !isCurrent &&
                        "border-border/70 bg-background/60 hover:bg-muted/40"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        isDone && "bg-emerald-500 text-white",
                        isCurrent && "bg-emerald-100 text-emerald-800",
                        !isDone && !isCurrent && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isDone ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : (
                        formatPersianNumber(index + 1)
                      )}
                    </span>

                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{step.title}</span>
                        {isDone ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">
                            انجام شد
                          </Badge>
                        ) : isCurrent ? (
                          <Badge variant="outline" className="border-emerald-400 text-emerald-700 text-[10px]">
                            مأموریت فعلی
                          </Badge>
                        ) : null}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {step.detail || step.description}
                      </span>
                    </span>

                    {!isDone ? (
                      <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 opacity-80 group-hover:opacity-100">
                        انجام مأموریت
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
