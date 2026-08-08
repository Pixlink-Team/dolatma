"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminHref, formatPersianNumber } from "@/lib/utils";
import {
  SENTIMENT_LABELS,
  TREND_STATUS_LABELS,
  TREND_TYPE_LABELS,
} from "@/lib/monitoring/labels";
import type { Trend } from "@/lib/monitoring/types";
import {
  ensureMonitoringReadyAction,
  listTrendsAction,
} from "@/lib/actions/monitoring-actions";
import {
  MonitoringEmptyState,
  MonitoringSection,
} from "@/components/admin/monitoring/monitoring-ui";
import { useMonitoringPaths } from "@/components/admin/monitoring/monitoring-paths";

export function MonitoringTrendsAdmin({ campaignId }: { campaignId: string }) {
  const paths = useMonitoringPaths();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      await ensureMonitoringReadyAction(campaignId);
      const result = await listTrendsAction(campaignId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setTrends(result.trends);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">ترندهای رسانه‌ای</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            موضوعات در حال رشد و روایت‌های مرتبط با سازمان‌ها
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={pending}>
            به‌روزرسانی
          </Button>
          <Button asChild variant="outline">
            <Link href={adminHref(paths.feed, campaignId)}>جریان رصد</Link>
          </Button>
        </div>
      </div>

      <MonitoringSection title="ترندهای فعال و اخیر">
        {pending && trends.length === 0 ? (
          <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
        ) : trends.length === 0 ? (
          <MonitoringEmptyState
            title="ترندی ثبت نشده"
            description="هنوز ترند فعالی برای نمایش وجود ندارد."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {trends.map((trend) => (
              <div key={trend.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{trend.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{trend.description}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {formatPersianNumber(trend.growthPercentage)}٪
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{trend.organizationName ?? "سازمان"}</span>
                  <span>{TREND_TYPE_LABELS[trend.trendType]}</span>
                  <span>{TREND_STATUS_LABELS[trend.status]}</span>
                  <span>{SENTIMENT_LABELS[trend.sentiment]}</span>
                  <span>اشاره: {formatPersianNumber(trend.mentionCount)}</span>
                  <span>دسترسی: {formatPersianNumber(trend.estimatedReach)}</span>
                  <span>ریسک: {formatPersianNumber(trend.riskScore)}</span>
                </div>
                {trend.keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {trend.keywords.map((kw) => (
                      <span key={kw} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                        {kw}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex h-12 items-end gap-1">
                  {trend.sparkline.map((v, idx) => (
                    <div
                      key={`${trend.id}-${idx}`}
                      className="flex-1 rounded-sm bg-primary/70"
                      style={{ height: `${Math.max(10, Math.min(100, v))}%` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </MonitoringSection>
    </div>
  );
}
