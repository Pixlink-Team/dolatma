import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DASHBOARD_STAT_GROUP_LABELS,
  type DashboardStatGroupKey,
} from "@/lib/admin-dashboard-stats";
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
  group?: DashboardStatGroupKey;
  completeness?: CategoryCompletenessSummary;
  showOwnerHint?: boolean;
}

interface DashboardCompletenessCardsProps {
  cards: DashboardCompletenessCardData[];
}

const STATUS_RANK: Record<CategoryCompletenessStatus, number> = {
  incomplete: 0,
  partial: 1,
  empty: 2,
  complete: 3,
};

const GROUP_ORDER: DashboardStatGroupKey[] = ["production", "publishing", "assets", "other"];

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

function groupCards(
  cards: DashboardCompletenessCardData[]
): Array<{ key: DashboardStatGroupKey; label: string; cards: DashboardCompletenessCardData[] }> {
  const buckets = new Map<DashboardStatGroupKey, DashboardCompletenessCardData[]>();
  for (const key of GROUP_ORDER) buckets.set(key, []);

  for (const card of cards) {
    const key = card.group ?? "other";
    const list = buckets.get(key) ?? [];
    list.push(card);
    buckets.set(key, list);
  }

  return GROUP_ORDER.map((key) => ({
    key,
    label: DASHBOARD_STAT_GROUP_LABELS[key],
    cards: sortCards(buckets.get(key) ?? []),
  })).filter((group) => group.cards.length > 0);
}

function CompletenessCard({ card }: { card: DashboardCompletenessCardData }) {
  const Icon = card.icon;
  const status = card.completeness?.status ?? "empty";
  const errorMessages = card.completeness?.errorMessages.slice(0, 2) ?? [];
  const warningMessages = card.completeness?.warningMessages.slice(0, 2) ?? [];
  const hasMessages = errorMessages.length > 0 || warningMessages.length > 0;
  const softOnly =
    (card.completeness?.incompleteItems ?? 0) === 0 &&
    (card.completeness?.recommendedItems ?? 0) > 0;
  const hasCompleteness = Boolean(card.completeness);

  return (
    <Link href={card.href} className="min-w-0">
      <Card
        className={cn(
          "h-full cursor-pointer border hover:border-primary/40",
          hasCompleteness ? getCompletenessCardClass(status) : "bg-card"
        )}
      >
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-bold">{formatPersianNumber(card.value)}</p>
              {card.showOwnerHint ? (
                <p className="mt-1 text-xs text-muted-foreground">مورد ثبت‌شده</p>
              ) : null}
            </div>
            <Icon className="h-5 w-5 shrink-0 opacity-80" />
          </div>

          {hasCompleteness ? (
            <div className="mt-auto space-y-2">
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
                {card.completeness!.incompleteItems > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {formatPersianNumber(card.completeness!.incompleteItems)} ناقص از{" "}
                    {formatPersianNumber(card.completeness!.totalItems)}
                  </span>
                ) : softOnly ? (
                  <span className="text-xs text-muted-foreground">
                    {formatPersianNumber(card.completeness!.recommendedItems)} مورد بهتر است تکمیل
                    شود
                  </span>
                ) : null}
              </div>

              {hasMessages ? (
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
              ) : status === "complete" ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  همه فیلدهای این بخش کامل است.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-auto text-xs text-muted-foreground">مشاهده و مدیریت این بخش</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function DashboardCompletenessCards({ cards }: DashboardCompletenessCardsProps) {
  const groups = groupCards(cards);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
            <span className="text-xs text-muted-foreground">
              ({formatPersianNumber(group.cards.length)})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {group.cards.map((card) => (
              <CompletenessCard key={card.href} card={card} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
