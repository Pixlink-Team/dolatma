"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminHref, formatPersianNumber } from "@/lib/utils";
import {
  CASE_STATUS_LABELS,
  ORG_TYPE_LABELS,
  PLATFORM_LABELS,
  SENTIMENT_LABELS,
} from "@/lib/monitoring/labels";
import type { OrganizationMediaIntelligence } from "@/lib/monitoring/types";
import {
  ensureMonitoringReadyAction,
  getOrganizationMediaIntelligenceAction,
} from "@/lib/actions/monitoring-actions";
import {
  MonitoringEmptyState,
  MonitoringSection,
  MonitoringStatCard,
  RiskBadge,
  UrgencyBadge,
} from "@/components/admin/monitoring/monitoring-ui";

function riskFromScore(score: number) {
  if (score >= 75) return "critical" as const;
  if (score >= 50) return "high" as const;
  if (score >= 25) return "medium" as const;
  return "low" as const;
}

export function OrganizationMediaIntelligenceAdmin({
  campaignId,
  organizationId,
}: {
  campaignId: string;
  organizationId: string;
}) {
  const [data, setData] = useState<OrganizationMediaIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      setLoading(true);
      await ensureMonitoringReadyAction(campaignId);
      const result = await getOrganizationMediaIntelligenceAction(organizationId);
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
  }, [campaignId, organizationId]);

  if (loading && !data) {
    return <div className="p-6 text-sm text-muted-foreground">در حال بارگذاری تحلیل سازمان...</div>;
  }

  if (!data) {
    return (
      <div className="p-6">
        <MonitoringEmptyState
          title="تحلیل در دسترس نیست"
          description="امکان دریافت اطلاعات رسانه‌ای این سازمان وجود ندارد."
        />
      </div>
    );
  }

  const { organization } = data;

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{organization.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {organization.shortName} • {ORG_TYPE_LABELS[organization.organizationType]} • اهمیت{" "}
            {formatPersianNumber(organization.importanceScore)}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={pending}>
          به‌روزرسانی
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MonitoringStatCard label="خبر منفی امروز" value={data.negativeToday} tone="danger" />
        <MonitoringStatCard label="بدون پاسخ" value={data.unansweredItems} tone="warning" />
        <MonitoringStatCard label="ترند فعال" value={data.activeTrends} />
        <MonitoringStatCard label="پرونده باز" value={data.openCases} />
        <MonitoringStatCard label="تأخیرخورده" value={data.overdueCases} tone="danger" />
        <MonitoringStatCard
          label="میانگین زمان پاسخ"
          value={
            data.avgResponseHours != null
              ? `${formatPersianNumber(Math.round(data.avgResponseHours * 10) / 10)} ساعت`
              : "—"
          }
        />
        <MonitoringStatCard
          label="میانگین اثربخشی"
          value={
            data.avgEffectiveness != null
              ? formatPersianNumber(Math.round(data.avgEffectiveness))
              : "—"
          }
          tone="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <MonitoringSection title="موضوعات پرتکرار">
          <div className="space-y-2">
            {data.topTopics.map((t) => (
              <div key={t.topic} className="flex items-center justify-between rounded-xl border p-3">
                <span className="text-sm">{t.topic}</span>
                <span className="text-sm font-semibold">{formatPersianNumber(t.count)}</span>
              </div>
            ))}
          </div>
        </MonitoringSection>
        <MonitoringSection title="منابع فعال">
          <div className="space-y-2">
            {data.activeSources.map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {PLATFORM_LABELS[s.platform] ?? s.platform}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatPersianNumber(s.count)}</span>
              </div>
            ))}
          </div>
        </MonitoringSection>
      </div>

      <MonitoringSection title="توزیع پلتفرم">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {data.platformBreakdown.map((p) => (
            <div key={p.platform} className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">
                {PLATFORM_LABELS[p.platform] ?? p.platform}
              </p>
              <p className="mt-1 text-lg font-bold">{formatPersianNumber(p.count)}</p>
            </div>
          ))}
        </div>
      </MonitoringSection>

      <MonitoringSection title="احساسات و ریسک">
        <div className="grid gap-3 md:grid-cols-2">
          {data.sentimentSeries.map((row) => (
            <div key={row.label} className="rounded-xl border p-4 text-sm space-y-1">
              <p className="font-medium">{row.label}</p>
              <p>مثبت: {formatPersianNumber(row.positive)}</p>
              <p>خنثی: {formatPersianNumber(row.neutral)}</p>
              <p>منفی: {formatPersianNumber(row.negative)}</p>
            </div>
          ))}
          {data.riskTrend.map((row) => (
            <div key={row.label} className="rounded-xl border p-4 text-sm">
              <p className="font-medium">{row.label}</p>
              <p className="mt-2 text-2xl font-bold">
                {formatPersianNumber(Math.round(row.avgRisk))}
              </p>
            </div>
          ))}
        </div>
      </MonitoringSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <MonitoringSection title="اخبار اخیر">
          {data.recentItems.length === 0 ? (
            <MonitoringEmptyState title="خبری نیست" description="خبر اخیری برای سازمان ثبت نشده." />
          ) : (
            <div className="space-y-2">
              {data.recentItems.map((item) => (
                <Link
                  key={item.id}
                  href={adminHref(`/admin/monitoring/items/${item.id}`, campaignId)}
                  className="block rounded-xl border p-3 hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <RiskBadge level={riskFromScore(item.riskScore)} />
                    <UrgencyBadge level={item.urgencyLevel} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {SENTIMENT_LABELS[item.sentiment]} • بازدید{" "}
                    {formatPersianNumber(item.viewCount)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </MonitoringSection>

        <MonitoringSection title="پرونده‌های اخیر">
          {data.recentCases.length === 0 ? (
            <MonitoringEmptyState
              title="پرونده‌ای نیست"
              description="پرونده واکنش سریعی برای سازمان نیست."
            />
          ) : (
            <div className="space-y-2">
              {data.recentCases.map((c) => (
                <Link
                  key={c.id}
                  href={adminHref(`/admin/rapid-response/cases/${c.id}`, campaignId)}
                  className="block rounded-xl border p-3 hover:bg-muted/40"
                >
                  <p className="font-medium">{c.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {CASE_STATUS_LABELS[c.caseStatus]} • {c.caseNumber}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </MonitoringSection>
      </div>

      <MonitoringSection title="آرشیو مرتبط">
        {data.archives.length === 0 ? (
          <MonitoringEmptyState title="آرشیوی نیست" description="مورد آرشیوی برای سازمان نیست." />
        ) : (
          <div className="space-y-2">
            {data.archives.map((a) => (
              <div key={a.id} className="rounded-xl border p-3 text-sm">
                <p className="font-medium">{a.topic}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.finalResult ?? a.responseSummary ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </MonitoringSection>
    </div>
  );
}
