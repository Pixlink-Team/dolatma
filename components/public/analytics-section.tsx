import { Clock, Eye, MousePointerClick, Users } from "lucide-react";
import { KPICard } from "@/components/public/kpi-card";
import { SectionHeader } from "@/components/public/section-header";
import { VisitsLineChart } from "@/components/charts/visits-line-chart";
import { TrafficSourcesChart } from "@/components/charts/traffic-sources-chart";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import type { AnalyticsSummary } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

interface AnalyticsSectionProps {
  analytics: AnalyticsSummary;
}

export function AnalyticsSection({ analytics }: AnalyticsSectionProps) {
  return (
    <section id="analytics">
      <SectionHeader
        title="آمار بازدید سایت"
        description="آمار ترافیک و بازدیدکنندگان سایت کمپین"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="کل بازدیدکنندگان" value={analytics.totalVisitors} icon={Users} />
        <KPICard title="بازدیدکنندگان یکتا" value={analytics.uniqueVisitors} icon={Eye} />
        <KPICard title="بازدید صفحات" value={analytics.pageViews} icon={MousePointerClick} />
        <KPICard
          title="میانگین مدت نشست"
          value={formatDuration(analytics.avgSessionDuration)}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <VisitsLineChart data={analytics.visitsOverTime} />
        <TrafficSourcesChart data={analytics.trafficSources} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BarChartCard
          title="دستگاه‌ها"
          data={analytics.deviceSplit.map((d) => ({ label: d.device, value: d.count }))}
          color="#16a34a"
        />
        <BarChartCard
          title="صفحات پربازدید"
          data={analytics.topPages.map((p) => ({ label: p.page, value: p.views }))}
          color="#2563eb"
        />
        {analytics.visitorLocations.length > 0 && (
          <BarChartCard
            title="موقعیت بازدیدکنندگان"
            data={analytics.visitorLocations.map((l) => ({ label: l.city, value: l.count }))}
            color="#7c3aed"
          />
        )}
      </div>
    </section>
  );
}
