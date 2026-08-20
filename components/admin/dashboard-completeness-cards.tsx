import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCompletenessCardClass,
  getCompletenessStatusLabel,
  type CategoryCompletenessStatus,
  type CategoryCompletenessSummary,
} from "@/lib/edit-suggestions";
import { cn, formatPersianNumber } from "@/lib/utils";

export interface DashboardCompletenessCardData {
  label: string;
  href: string;
  icon: LucideIcon;
  value: number;
  /** Lower = more important section (from DASHBOARD_STAT_DEFINITIONS). */
  priority?: number;
  completeness?: CategoryCompletenessSummary;
  showOwnerHint?: boolean;
}

interface DashboardCompletenessCardsProps {
  cards: DashboardCompletenessCardData[];
}

type CardSize = "lg" | "md" | "sm";

const STATUS_RANK: Record<CategoryCompletenessStatus, number> = {
  incomplete: 0,
  partial: 1,
  empty: 2,
  complete: 3,
};

function resolveCardSize(
  status: CategoryCompletenessStatus,
  sectionPriority: number,
  index: number
): CardSize {
  if (status === "incomplete") return "lg";
  if (status === "partial") return sectionPriority <= 6 || index < 2 ? "md" : "sm";
  if (status === "empty") return sectionPriority <= 4 && index < 3 ? "md" : "sm";
  return "sm";
}

function sizeClass(size: CardSize): string {
  switch (size) {
    case "lg":
      return "sm:col-span-2 lg:col-span-2 xl:col-span-2";
    case "md":
      return "sm:col-span-2 lg:col-span-1 xl:col-span-2";
    case "sm":
    default:
      return "sm:col-span-1";
  }
}

function sortCards(cards: DashboardCompletenessCardData[]): DashboardCompletenessCardData[] {
  return [...cards].sort((a, b) => {
    const statusA = a.completeness?.status ?? "empty";
    const statusB = b.completeness?.status ?? "empty";
    const statusDiff = STATUS_RANK[statusA] - STATUS_RANK[statusB];
    if (statusDiff !== 0) return statusDiff;

    const incompleteA = a.completeness?.incompleteItems ?? 0;
    const incompleteB = b.completeness?.incompleteItems ?? 0;
    if (incompleteA !== incompleteB) return incompleteB - incompleteA;

    const priorityA = a.priority ?? 99;
    const priorityB = b.priority ?? 99;
    if (priorityA !== priorityB) return priorityA - priorityB;

    return a.label.localeCompare(b.label, "fa");
  });
}

export function DashboardCompletenessCards({ cards }: DashboardCompletenessCardsProps) {
  const sorted = sortCards(cards);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {sorted.map((card, index) => {
        const Icon = card.icon;
        const status = card.completeness?.status ?? "empty";
        const sectionPriority = card.priority ?? 99;
        const size = resolveCardSize(status, sectionPriority, index);
        const errorMessages = card.completeness?.errorMessages.slice(0, 3) ?? [];
        const warningMessages = card.completeness?.warningMessages.slice(0, 3) ?? [];
        const hasMessages = errorMessages.length > 0 || warningMessages.length > 0;
        const softOnly =
          (card.completeness?.incompleteItems ?? 0) === 0 &&
          (card.completeness?.recommendedItems ?? 0) > 0;
        const isLarge = size === "lg";

        return (
          <Link key={card.href} href={card.href} className={cn(sizeClass(size))}>
            <Card
              className={cn(
                "h-full cursor-pointer border hover:border-primary/40",
                getCompletenessCardClass(status),
                isLarge && "min-h-[11rem]"
              )}
            >
              <CardContent
                className={cn("space-y-3 p-4 sm:p-5", isLarge && "sm:space-y-4 sm:p-6")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-muted-foreground",
                        isLarge ? "text-sm sm:text-base" : "text-sm"
                      )}
                    >
                      {card.label}
                    </p>
                    <p
                      className={cn(
                        "mt-1 font-bold",
                        isLarge ? "text-3xl sm:text-4xl" : size === "md" ? "text-2xl" : "text-xl"
                      )}
                    >
                      {formatPersianNumber(card.value)}
                    </p>
                    {card.showOwnerHint && (
                      <p className="mt-1 text-xs text-muted-foreground">مورد ثبت‌شده</p>
                    )}
                  </div>
                  <Icon
                    className={cn(
                      "shrink-0 opacity-80",
                      isLarge ? "h-6 w-6 sm:h-7 sm:w-7" : "h-5 w-5"
                    )}
                  />
                </div>

                {card.completeness ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={
                          status === "complete"
                            ? "success"
                            : status === "partial"
                              ? "warning"
                              : status === "incomplete"
                                ? "destructive"
                                : "outline"
                        }
                      >
                        {getCompletenessStatusLabel(status)}
                      </Badge>
                      {card.completeness.incompleteItems > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {formatPersianNumber(card.completeness.incompleteItems)} ناقص از{" "}
                          {formatPersianNumber(card.completeness.totalItems)}
                        </span>
                      ) : softOnly ? (
                        <span className="text-xs text-muted-foreground">
                          {formatPersianNumber(card.completeness.recommendedItems)} مورد بهتر است
                          تکمیل شود
                        </span>
                      ) : null}
                    </div>

                    {status === "empty" ? (
                      <p className="text-xs text-muted-foreground">هنوز موردی ثبت نشده است.</p>
                    ) : hasMessages ? (
                      <div className="space-y-1">
                        {errorMessages.length > 0 ? (
                          <ul className="space-y-1 text-xs text-destructive">
                            {errorMessages.map((message) => (
                              <li key={message}>• {message}</li>
                            ))}
                          </ul>
                        ) : null}
                        {warningMessages.length > 0 ? (
                          <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-200">
                            {warningMessages.map((message) => (
                              <li key={message}>• {message}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        همه فیلدهای این بخش کامل است.
                      </p>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
