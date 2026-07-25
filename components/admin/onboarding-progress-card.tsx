import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OnboardingProgress } from "@/lib/onboarding/types";
import { cn, formatPersianNumber } from "@/lib/utils";

interface OnboardingProgressCardProps {
  progress: OnboardingProgress;
}

export function OnboardingProgressCard({ progress }: OnboardingProgressCardProps) {
  const { steps, completedCount, totalCount, percent } = progress;
  const currentIndex = steps.findIndex((step) => !step.done);

  return (
    <Card className="overflow-hidden border-emerald-200/60 bg-gradient-to-l from-emerald-50/80 via-background to-background">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">راه‌اندازی سامانه</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              مراحل زیر را به ترتیب تکمیل کنید تا آماده‌سازی کامل شود.
            </p>
          </div>
          <Badge
            variant={percent === 100 ? "default" : "secondary"}
            className={cn(
              "text-sm",
              percent === 100 && "bg-emerald-600 hover:bg-emerald-600"
            )}
          >
            {formatPersianNumber(completedCount)} از {formatPersianNumber(totalCount)} (
            {formatPersianNumber(percent)}٪)
          </Badge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-0 md:flex-row md:items-start md:justify-between">
          {steps.map((step, index) => {
            const isCurrent = index === currentIndex;
            const isDone = step.done;
            const isLast = index === steps.length - 1;

            return (
              <li
                key={step.stepKey}
                className="relative flex flex-1 items-stretch gap-3 md:flex-col md:items-center md:gap-2 md:px-1"
              >
                {!isLast && (
                  <span
                    className={cn(
                      "absolute end-0 top-4 hidden h-0.5 w-full translate-x-1/2 md:block",
                      isDone ? "bg-emerald-500" : "bg-muted-foreground/25"
                    )}
                    aria-hidden
                  />
                )}
                {!isLast && (
                  <span
                    className={cn(
                      "absolute start-4 top-8 bottom-0 w-0.5 md:hidden",
                      isDone ? "bg-emerald-500" : "bg-muted-foreground/25"
                    )}
                    aria-hidden
                  />
                )}

                <Link
                  href={step.href}
                  className={cn(
                    "relative z-10 flex min-w-0 flex-1 items-start gap-3 rounded-lg p-2 transition-colors hover:bg-emerald-50/70 md:flex-col md:items-center md:text-center",
                    isCurrent && "bg-emerald-50/90 ring-1 ring-emerald-200"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                      isDone && "border-emerald-500 bg-emerald-500 text-white",
                      isCurrent && !isDone && "border-emerald-500 bg-background text-emerald-700",
                      !isDone && !isCurrent && "border-muted-foreground/30 bg-background text-muted-foreground"
                    )}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      <Circle className="h-3 w-3 fill-current" />
                    )}
                  </span>
                  <span className="min-w-0 space-y-0.5 md:space-y-1">
                    <span
                      className={cn(
                        "block text-sm font-medium",
                        isDone && "text-emerald-700",
                        isCurrent && "text-foreground",
                        !isDone && !isCurrent && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                    <span className="block text-xs text-muted-foreground line-clamp-2">
                      {step.detail || step.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
