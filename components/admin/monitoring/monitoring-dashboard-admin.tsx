"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminHref, formatPersianNumber } from "@/lib/utils";
import {
  CASE_STATUS_LABELS,
  PLATFORM_LABELS,
  RISK_LABELS,
  SENTIMENT_LABELS,
  URGENCY_LABELS,
} from "@/lib/monitoring/labels";
import type { MonitoringDashboardData } from "@/lib/monitoring/types";
import {
  ensureMonitoringReadyAction,
  getMonitoringDashboardAction,
  pollingMonitoringUpdatesAction,
  startRapidResponseCaseAction,
} from "@/lib/actions/monitoring-actions";
import {
  MonitoringEmptyState,
  MonitoringSection,
  MonitoringStatCard,
  RiskBadge,
  UrgencyBadge,
} from "@/components/admin/monitoring/monitoring-ui";
import { NarrativeComparisonChart } from "@/components/admin/monitoring/narrative-comparison-chart";

export function MonitoringDashboardAdmin({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [data, setData] = useState<MonitoringDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      setLoading(true);
      await ensureMonitoringReadyAction(campaignId);
      const result = await getMonitoringDashboardAction();
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
    const timer = setInterval(async () => {
      const poll = await pollingMonitoringUpdatesAction();
      if (poll.success && (poll.newItems.length > 0 || poll.updatedCases.length > 0)) {
        load();
      }
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const chartData = useMemo(
    () =>
      (data?.comparisonSeries ?? []).map((row) => ({
        label: new Date(row.recordedAt).toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        negativeReach: row.negativeReach,
        responseReach: row.responseReach,
      })),
    [data]
  );

  if (loading && !data) {
    return <div className="p-6 text-sm text-muted-foreground">در حال بارگذاری داشبورد رصد...</div>;
  }

  if (!data) {
    return (
      <MonitoringEmptyState
        title="داشبورد در دسترس نیست"
        description="امکان دریافت داده داشبورد رصد وجود ندارد."
      />
    );
  }

  const statusOrder = [
    "open",
    "content_in_production",
    "awaiting_approval",
    "publishing",
    "impact_monitoring",
    "closed",
    "overdue",
  ];

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">داشبورد رصد و واکنش سریع</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نمای عملیاتی اخبار منفی، هشدارها و پرونده‌های واکنش سریع
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={pending}>
            به‌روزرسانی
          </Button>
          <Button asChild>
            <Link href={adminHref("/admin/monitoring/items/new", campaignId)}>ثبت خبر منفی</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <MonitoringStatCard label="خبرهای منفی جدید" value={data.stats.newNegativeItems} tone="danger" />
        <MonitoringStatCard label="نیازمند بررسی" value={data.stats.pendingReview} tone="warning" />
        <MonitoringStatCard label="پرونده‌های باز" value={data.stats.openCases} />
        <MonitoringStatCard label="پرونده‌های بحرانی" value={data.stats.criticalCases} tone="danger" />
        <MonitoringStatCard label="نزدیک به پایان مهلت" value={data.stats.nearDeadlineCases} tone="warning" />
        <MonitoringStatCard label="تأخیرخورده" value={data.stats.overdueCases} tone="danger" />
        <MonitoringStatCard label="ترندهای فعال" value={data.stats.activeTrends} />
        <MonitoringStatCard
          label="میانگین زمان اولین واکنش"
          value={
            data.stats.avgFirstResponseHours != null
              ? `${formatPersianNumber(data.stats.avgFirstResponseHours)} ساعت`
              : "—"
          }
        />
        <MonitoringStatCard
          label="میانگین اثربخشی پاسخ"
          value={
            data.stats.avgEffectiveness != null
              ? formatPersianNumber(data.stats.avgEffectiveness)
              : "—"
          }
          tone="success"
        />
      </div>

      <MonitoringSection title="هشدارهای فوری" description="موارد با فوریت بالا که نیاز به اقدام سریع دارند">
        {data.urgentAlerts.length === 0 ? (
          <MonitoringEmptyState title="هشدار فوری نیست" description="در حال حاضر پرونده بحرانی بازی وجود ندارد." />
        ) : (
          <div className="space-y-3">
            {data.urgentAlerts.map((alert) => (
              <div key={alert.caseId} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="font-semibold">{alert.title}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{alert.organizationName}</span>
                      <span>•</span>
                      <span>{alert.sourceName}</span>
                      <span>•</span>
                      <span>بازدید: {formatPersianNumber(alert.viewCount)}</span>
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
                      <Link href={adminHref(`/admin/rapid-response/cases/${alert.caseId}`, campaignId)}>
                        مشاهده پرونده
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(adminHref(`/admin/rapid-response/cases/${alert.caseId}`, campaignId))
                      }
                    >
                      تعیین مسئول
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

      <MonitoringSection title="خبرهای منفی در حال رشد">
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-right font-medium">خبر</th>
                <th className="px-3 py-2 text-right font-medium">سازمان</th>
                <th className="px-3 py-2 text-right font-medium">منبع</th>
                <th className="px-3 py-2 text-right font-medium">پلتفرم</th>
                <th className="px-3 py-2 text-right font-medium">بازدید</th>
                <th className="px-3 py-2 text-right font-medium">رشد</th>
                <th className="px-3 py-2 text-right font-medium">ریسک</th>
                <th className="px-3 py-2 text-right font-medium">وضعیت</th>
                <th className="px-3 py-2 text-right font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {data.growingNegativeItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2 max-w-[240px]">
                    <p className="line-clamp-2 font-medium">{item.title}</p>
                  </td>
                  <td className="px-3 py-2">{item.organizationName}</td>
                  <td className="px-3 py-2">{item.sourceName ?? "—"}</td>
                  <td className="px-3 py-2">{PLATFORM_LABELS[item.platform] ?? item.platform}</td>
                  <td className="px-3 py-2">{formatPersianNumber(item.viewCount)}</td>
                  <td className="px-3 py-2">{formatPersianNumber(item.growthRate)}٪</td>
                  <td className="px-3 py-2">{formatPersianNumber(item.riskScore)}</td>
                  <td className="px-3 py-2">{SENTIMENT_LABELS[item.sentiment]}</td>
                  <td className="px-3 py-2">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={adminHref(`/admin/monitoring/items/${item.id}`, campaignId)}>جزئیات</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MonitoringSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <MonitoringSection title="ترندهای مرتبط">
          <div className="space-y-3">
            {data.trends.map((trend) => (
              <div key={trend.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{trend.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{trend.organizationName}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {formatPersianNumber(trend.growthPercentage)}٪
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>اشاره: {formatPersianNumber(trend.mentionCount)}</span>
                  <span>دسترسی: {formatPersianNumber(trend.estimatedReach)}</span>
                  <span>احساسات: {SENTIMENT_LABELS[trend.sentiment]}</span>
                  <span>وضعیت: فعال</span>
                </div>
                <div className="mt-3 flex h-10 items-end gap-1">
                  {trend.sparkline.map((v, idx) => (
                    <div
                      key={`${trend.id}-${idx}`}
                      className="flex-1 rounded-sm bg-primary/70"
                      style={{ height: `${Math.max(12, Math.min(100, v))}%` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </MonitoringSection>

        <MonitoringSection title="وضعیت پرونده‌های واکنش سریع">
          <div className="grid gap-3 sm:grid-cols-2">
            {statusOrder.map((status) => (
              <div key={status} className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">
                  {CASE_STATUS_LABELS[status as keyof typeof CASE_STATUS_LABELS] ?? status}
                </p>
                <p className="mt-1 text-xl font-bold">
                  {formatPersianNumber(data.caseStatusCounts[status] ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </MonitoringSection>
      </div>

      <MonitoringSection
        title="مقایسه رشد خبر منفی و روایت رسمی"
        description="خط قرمز: خبر منفی — خط برند: پاسخ رسمی"
      >
        <NarrativeComparisonChart data={chartData} />
        <p className="text-xs text-muted-foreground">
          راهنما ریسک: {Object.entries(RISK_LABELS).map(([k, v]) => `${v}`).join("، ")} | فوریت:{" "}
          {Object.values(URGENCY_LABELS).join("، ")}
        </p>
      </MonitoringSection>
    </div>
  );
}
