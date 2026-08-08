"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Archive,
  FilePlus2,
  FolderOpen,
  LayoutDashboard,
  Radar,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MonitoringEmptyState,
  MonitoringSection,
  MonitoringStatCard,
  RiskBadge,
  UrgencyBadge,
} from "@/components/admin/monitoring/monitoring-ui";
import {
  ensureMonitoringReadyAction,
  getReisMonitoringOverviewAction,
  startRapidResponseCaseAction,
} from "@/lib/actions/monitoring-actions";
import {
  ACTION_STATUS_LABELS,
  ACTION_TYPE_LABELS,
  CASE_STATUS_COLORS,
  CASE_STATUS_LABELS,
} from "@/lib/monitoring/labels";
import type {
  ActiveResponseAction,
  RapidResponseCaseWithActions,
  ReisMonitoringOverview,
} from "@/lib/monitoring/types";
import { adminHref, cn, formatPersianNumber } from "@/lib/utils";

const QUICK_LINKS = [
  {
    href: "/admin/monitoring/dashboard",
    label: "داشبورد رصد",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/monitoring/feed",
    label: "جریان رصد",
    icon: Radar,
  },
  {
    href: "/admin/monitoring/items/new",
    label: "ثبت خبر منفی",
    icon: FilePlus2,
  },
  {
    href: "/admin/rapid-response/cases",
    label: "پرونده‌های واکنش سریع",
    icon: FolderOpen,
  },
  {
    href: "/admin/monitoring/archive",
    label: "بانک خبر و تحلیل",
    icon: Archive,
  },
] as const;

function actionStatusTone(status: ActiveResponseAction["status"]) {
  if (status === "overdue") return "border-red-200 bg-red-50/70 text-red-800";
  if (status === "in_progress") return "border-emerald-200 bg-emerald-50/70 text-emerald-900";
  if (status === "awaiting_approval") return "border-amber-200 bg-amber-50/70 text-amber-900";
  return "border-border bg-muted/40 text-foreground";
}

function sortCaseActions(actions: RapidResponseCaseWithActions["actions"]) {
  const rank: Record<string, number> = {
    overdue: 0,
    in_progress: 1,
    awaiting_approval: 2,
    assigned: 3,
    pending: 4,
  };
  return [...actions].sort((a, b) => {
    const ra = rank[a.status] ?? 8;
    const rb = rank[b.status] ?? 8;
    if (ra !== rb) return ra - rb;
    return b.priority - a.priority;
  });
}

export function ReisMonitoringAdmin({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<ReisMonitoringOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      setLoading(true);
      await ensureMonitoringReadyAction(campaignId);
      const result = await getReisMonitoringOverviewAction(campaignId);
      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setData(result.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const inProgressActions = useMemo(
    () => (data?.activeActions ?? []).filter((row) => row.status === "in_progress"),
    [data]
  );
  const otherActiveActions = useMemo(
    () => (data?.activeActions ?? []).filter((row) => row.status !== "in_progress"),
    [data]
  );
  const orderedActiveActions = useMemo(
    () => [...inProgressActions, ...otherActiveActions],
    [inProgressActions, otherActiveActions]
  );

  if (loading && !data) {
    return (
      <div className="p-2 text-sm text-muted-foreground">در حال بارگذاری رصد و واکنش سریع...</div>
    );
  }

  if (!data) {
    return (
      <MonitoringEmptyState
        title="رصد و واکنش سریع در دسترس نیست"
        description="امکان دریافت داده این بخش وجود ندارد."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">رصد و واکنش سریع</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            نمای مدیریتی برای پیگیری خبرهای منفی، پرونده‌های واکنش سریع و اقدام‌هایی که همین
            حالا روی هر دستور در حال اجراست.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={pending} className="gap-1.5">
          <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
          به‌روزرسانی
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Button key={item.href} asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={adminHref(item.href, campaignId)}>
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <MonitoringStatCard label="خبرهای منفی جدید" value={data.stats.newNegativeItems} tone="danger" />
        <MonitoringStatCard label="نیازمند بررسی" value={data.stats.pendingReview} tone="warning" />
        <MonitoringStatCard label="پرونده‌های باز" value={data.stats.openCases} />
        <MonitoringStatCard label="پرونده‌های بحرانی" value={data.stats.criticalCases} tone="danger" />
        <MonitoringStatCard
          label="اقدام در حال اجرا"
          value={inProgressActions.length}
          tone="success"
        />
        <MonitoringStatCard label="نزدیک به پایان مهلت" value={data.stats.nearDeadlineCases} tone="warning" />
        <MonitoringStatCard label="تأخیرخورده" value={data.stats.overdueCases} tone="danger" />
        <MonitoringStatCard label="ترندهای فعال" value={data.stats.activeTrends} />
      </div>

      <MonitoringSection
        title="اقدام‌های در حال اجرا"
        description="اولویت نمایش با اقدام‌هایی است که همین حالا روی پرونده/دستور واکنش سریع کار می‌شود"
        actions={
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            {formatPersianNumber(orderedActiveActions.length)} اقدام فعال
          </span>
        }
      >
        {orderedActiveActions.length === 0 ? (
          <MonitoringEmptyState
            title="اقدام فعالی نیست"
            description="فعلاً اقدام در حال اجرا یا در صف برای پرونده‌های باز ثبت نشده است."
          />
        ) : (
          <div className="space-y-3">
            {orderedActiveActions.map((action) => (
              <ActiveActionCard key={action.id} action={action} campaignId={campaignId} />
            ))}
          </div>
        )}
      </MonitoringSection>

      <MonitoringSection
        title="هشدارهای فوری"
        description="موارد با فوریت بالا که نیاز به تصمیم و اقدام سریع دارند"
      >
        {data.urgentAlerts.length === 0 ? (
          <MonitoringEmptyState
            title="هشدار فوری نیست"
            description="در حال حاضر پرونده بحرانی بازی وجود ندارد."
          />
        ) : (
          <div className="space-y-3">
            {data.urgentAlerts.map((alert) => (
              <div key={alert.caseId} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <p className="font-semibold">{alert.title}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{alert.organizationName}</span>
                      <span>•</span>
                      <span>{alert.sourceName}</span>
                      {alert.remainingMinutes != null ? (
                        <>
                          <span>•</span>
                          <span>
                            زمان باقی‌مانده: {formatPersianNumber(alert.remainingMinutes)} دقیقه
                          </span>
                        </>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <RiskBadge level={alert.riskLevel} />
                      <UrgencyBadge level={alert.urgencyLevel} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={adminHref(`/admin/rapid-response/cases/${alert.caseId}`, campaignId)}
                      >
                        مشاهده پرونده
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await startRapidResponseCaseAction(alert.caseId);
                          if (!result.success) toast.error(result.error);
                          else {
                            toast.success("واکنش آغاز شد");
                            load();
                          }
                        })
                      }
                    >
                      شروع واکنش
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </MonitoringSection>

      <MonitoringSection
        title="پرونده‌ها و اقدام‌های هر دستور"
        description="برای هر پرونده واکنش سریع ببینید چه اقدام‌هایی تعریف شده و کدام‌ها در حال کار هستند"
      >
        {data.openCases.length === 0 ? (
          <MonitoringEmptyState
            title="پرونده بازی نیست"
            description="پس از ثبت خبر منفی و تبدیل به پرونده، وضعیت اقدام‌ها اینجا دیده می‌شود."
          />
        ) : (
          <div className="space-y-4">
            {data.openCases.map((caseItem) => (
              <CaseActionsCard key={caseItem.id} caseItem={caseItem} campaignId={campaignId} />
            ))}
          </div>
        )}
      </MonitoringSection>
    </div>
  );
}

function ActiveActionCard({
  action,
  campaignId,
}: {
  action: ActiveResponseAction;
  campaignId: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        action.status === "in_progress"
          ? "border-emerald-300/80 bg-emerald-50/40"
          : "bg-card"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                actionStatusTone(action.status)
              )}
            >
              {ACTION_STATUS_LABELS[action.status]}
            </span>
            <span className="text-xs text-muted-foreground">
              {ACTION_TYPE_LABELS[action.actionType]}
            </span>
            <span className="text-xs text-muted-foreground" dir="ltr">
              {action.caseNumber}
            </span>
          </div>
          <p className="font-semibold">{action.title}</p>
          {action.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2">{action.description}</p>
          ) : null}
          <p className="text-sm">
            روی دستور: <span className="font-medium">{action.caseTitle}</span>
          </p>
          {action.commandText?.trim() ? (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-6 text-muted-foreground">
              {action.commandText}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{action.organizationName ?? "سازمان نامشخص"}</span>
            <RiskBadge level={action.caseRiskLevel} />
            <UrgencyBadge level={action.caseUrgencyLevel} />
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 font-medium",
                CASE_STATUS_COLORS[action.caseStatus]
              )}
            >
              {CASE_STATUS_LABELS[action.caseStatus]}
            </span>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={adminHref(`/admin/rapid-response/cases/${action.rapidResponseCaseId}`, campaignId)}>
            جزئیات پرونده
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CaseActionsCard({
  caseItem,
  campaignId,
}: {
  caseItem: RapidResponseCaseWithActions;
  campaignId: string;
}) {
  const actions = sortCaseActions(caseItem.actions);
  const running = actions.filter((a) =>
    ["in_progress", "overdue", "awaiting_approval"].includes(a.status)
  ).length;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground" dir="ltr">
              {caseItem.caseNumber}
            </span>
            <h3 className="font-semibold">{caseItem.title}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                CASE_STATUS_COLORS[caseItem.caseStatus]
              )}
            >
              {CASE_STATUS_LABELS[caseItem.caseStatus]}
            </span>
            <RiskBadge level={caseItem.riskLevel} />
            <UrgencyBadge level={caseItem.urgencyLevel} />
            <span className="text-xs text-muted-foreground">
              {caseItem.organizationName ?? "سازمان نامشخص"}
            </span>
            {running > 0 ? (
              <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900">
                {formatPersianNumber(running)} اقدام در جریان
              </span>
            ) : null}
          </div>
          {caseItem.commandText?.trim() ? (
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">متن دستور</p>
              <p className="mt-1 text-sm leading-6">{caseItem.commandText}</p>
            </div>
          ) : null}
          {caseItem.requiredActions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {caseItem.requiredActions.map((item) => (
                <span
                  key={item}
                  className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={adminHref(`/admin/rapid-response/cases/${caseItem.id}`, campaignId)}>
            باز کردن پرونده
          </Link>
        </Button>
      </div>

      <div className="mt-4 space-y-2 border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground">
          اقدام‌های این دستور ({formatPersianNumber(actions.length)})
        </p>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز اقدامی برای این پرونده ثبت نشده است.</p>
        ) : (
          <ul className="space-y-2">
            {actions.map((action) => (
              <li
                key={action.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                  action.status === "in_progress" && "border-emerald-200 bg-emerald-50/50"
                )}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ACTION_TYPE_LABELS[action.actionType]}
                    {action.assignedUserName ? ` • ${action.assignedUserName}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium",
                    actionStatusTone(action.status)
                  )}
                >
                  {ACTION_STATUS_LABELS[action.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
