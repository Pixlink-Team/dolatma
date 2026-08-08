"use client";

import {
  AreaTrendChart,
  DonutChart,
  HorizontalBars,
  Sparkline,
  StackedDailyBars,
} from "@taghvim/components/views/analytics/AnalyticsCharts";
import {
  buildAnalyticsModel,
  sparkValues,
} from "@taghvim/lib/analytics";
import { intensityColor, intensityLabel } from "@taghvim/lib/timeline";
import type { TimelineDay } from "@taghvim/types/timeline";
import { useMemo } from "react";

type AnalyticsViewProps = {
  days: TimelineDay[];
};

export function AnalyticsView({ days }: AnalyticsViewProps) {
  const model = useMemo(() => buildAnalyticsModel(days), [days]);

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-10 text-center text-sm text-[var(--text-secondary)]">
        برای این بازه داده‌ای جهت نمایش آمار وجود ندارد.
      </div>
    );
  }

  const totalSpark = sparkValues(model.trend, "total");
  const enemySpark = sparkValues(model.trend, "enemy");
  const govSpark = sparkValues(model.trend, "government");
  const intensitySpark = sparkValues(model.trend, "intensity");

  return (
    <section
      className="space-y-4"
      style={{ direction: "rtl", textAlign: "right" }}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="m-0 text-lg font-bold text-[var(--text-primary)]">
            آمار و نمودارها
          </h2>
          <p className="m-0 mt-1 text-xs text-[var(--text-secondary)]">
            نمای تحلیلی شبیه کنسول — روند، ترکیب و رتبه‌بندی رویدادها
          </p>
        </div>
        <p className="m-0 text-[11px] tabular-nums text-[var(--text-muted)]">
          بازه: {model.rangeLabel}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="کل رویدادها"
          value={model.totalEvents.toLocaleString("fa-IR")}
          hint={`${model.activeDays.toLocaleString("fa-IR")} روز فعال از ${model.dayCount.toLocaleString("fa-IR")}`}
          spark={totalSpark}
          sparkColor="var(--primary)"
        />
        <KpiCard
          title="اقدام دشمن"
          value={model.enemy.toLocaleString("fa-IR")}
          hint={`${model.typeShare.enemy.toLocaleString("fa-IR")}٪ از کل`}
          spark={enemySpark}
          sparkColor="var(--enemy)"
        />
        <KpiCard
          title="اقدام دولت"
          value={model.government.toLocaleString("fa-IR")}
          hint={`${model.typeShare.government.toLocaleString("fa-IR")}٪ از کل`}
          spark={govSpark}
          sparkColor="var(--government)"
        />
        <KpiCard
          title="نرخ پاسخ"
          value={`${model.responseRatio.toLocaleString("fa-IR")}٪`}
          hint={`میانگین واکنش: ${model.avgResponseLabel}`}
          spark={intensitySpark}
          sparkColor="var(--success)"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          title="بدون پاسخ"
          value={model.unanswered.toLocaleString("fa-IR")}
        />
        <MiniStat
          title="روزهای بحرانی"
          value={model.criticalDays.toLocaleString("fa-IR")}
        />
        <MiniStat
          title="تأیید / انتشار"
          value={`${model.verifiedShare.toLocaleString("fa-IR")}٪`}
        />
        <MiniStat
          title="دارای رسانه"
          value={`${model.withMediaShare.toLocaleString("fa-IR")}٪`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Panel title="روند رویدادها در زمان" subtitle="دشمن در برابر دولت">
          <AreaTrendChart
            labels={model.trend.map((p) => p.shortLabel)}
            series={[
              {
                id: "enemy",
                label: "دشمن",
                color: "var(--enemy)",
                values: model.trend.map((p) => p.enemy),
              },
              {
                id: "government",
                label: "دولت",
                color: "var(--government)",
                values: model.trend.map((p) => p.government),
              },
            ]}
          />
        </Panel>

        <Panel title="ترکیب نوع رویداد" subtitle="سهم دشمن و دولت">
          <DonutChart
            centerLabel="کل"
            centerValue={model.totalEvents.toLocaleString("fa-IR")}
            segments={[
              {
                label: "اقدام دشمن",
                value: model.enemy,
                color: "var(--enemy)",
              },
              {
                label: "اقدام دولت",
                value: model.government,
                color: "var(--government)",
              },
            ]}
          />
        </Panel>
      </div>

      <Panel
        title="شدت روزانه"
        subtitle="روند شدت رویدادها در کل بازه — نمای تمام‌عرض"
      >
        <AreaTrendChart
          height={320}
          labels={model.trend.map((p) => p.shortLabel)}
          series={[
            {
              id: "intensity",
              label: "شدت",
              color: "var(--warning)",
              values: model.trend.map((p) => p.intensity),
            },
          ]}
        />
      </Panel>

      <Panel title="میله‌های روزانه" subtitle="انباشته دشمن / دولت در هر روز">
        <StackedDailyBars
          height={220}
          points={model.trend.map((p) => ({
            label: p.shortLabel,
            enemy: p.enemy,
            government: p.government,
          }))}
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="سطح شدت" subtitle="توزیع severity">
          <HorizontalBars
            rows={model.severityRows.map((r, i) => ({
              ...r,
              color: ["#ef4444", "#f97316", "#eab308", "#3b82f6"][i] ?? "var(--primary)",
            }))}
          />
        </Panel>
        <Panel title="دسته‌بندی‌ها" subtitle="پرتکرارترین‌ها">
          <HorizontalBars rows={model.categoryRows} />
        </Panel>
        <Panel title="استان‌ها" subtitle="تمرکز جغرافیایی">
          <HorizontalBars
            rows={model.provinceRows.map((r) => ({
              ...r,
              color: "var(--cyan)",
            }))}
          />
        </Panel>
        <Panel title="نهادها" subtitle="فعال‌ترین سازمان‌ها">
          <HorizontalBars
            rows={model.orgRows.map((r) => ({
              ...r,
              color: "var(--purple)",
            }))}
          />
        </Panel>
      </div>

      <Panel title="روزهای پرشدت" subtitle="مرتب‌شده بر اساس شدت">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                <th className="px-2 py-2 text-right font-medium">تاریخ</th>
                <th className="px-2 py-2 text-right font-medium">رویدادها</th>
                <th className="px-2 py-2 text-right font-medium">شدت</th>
                <th className="px-2 py-2 text-right font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {model.topCriticalDays.map((row) => (
                <tr
                  key={row.date}
                  className="border-b border-[var(--border)]/70 last:border-0"
                >
                  <td className="px-2 py-2.5 text-[var(--text-primary)]">
                    {row.persianDate}
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-[var(--text-secondary)]">
                    {row.totalEvents.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--panel-2)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${row.intensity}%`,
                            background: intensityColor(row.intensity),
                          }}
                        />
                      </div>
                      <span className="tabular-nums text-xs text-[var(--text-secondary)]">
                        {row.intensity.toLocaleString("fa-IR")}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ background: intensityColor(row.intensity) }}
                    >
                      {intensityLabel(row.intensity)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <header className="mb-4">
        <h3 className="m-0 text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        {subtitle ? (
          <p className="m-0 mt-0.5 text-[11px] text-[var(--text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function KpiCard({
  title,
  value,
  hint,
  spark,
  sparkColor,
}: {
  title: string;
  value: string;
  hint: string;
  spark: number[];
  sparkColor: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 text-xs text-[var(--text-secondary)]">{title}</p>
        <Sparkline values={spark} color={sparkColor} />
      </div>
      <p className="mt-2 mb-0 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1 mb-0 text-[11px] text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-3">
      <p className="m-0 text-[11px] text-[var(--text-muted)]">{title}</p>
      <p className="mt-1 mb-0 text-lg font-bold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}
