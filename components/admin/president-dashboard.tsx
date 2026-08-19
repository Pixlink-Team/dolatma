"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Building2, Eye, Gauge, MapPin, Target, Users } from "lucide-react";
import { KPICard } from "@/components/public/kpi-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PresidentIranMap } from "@/components/admin/president-iran-map";
import type { PresidentDashboardData } from "@/lib/data-access/president-dashboard";
import { formatPersianDateShort, formatPersianNumber } from "@/lib/utils";

interface PresidentDashboardProps {
  data: PresidentDashboardData;
  selectedOwnerId: string | null;
  dateRange: "all" | "30d" | "90d";
}

export function PresidentDashboard({ data, selectedOwnerId, dateRange }: PresidentDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  const provinceSummaries = useMemo(() => {
    const map = new Map<string, {
      province: string;
      uploads: number;
      views: number;
      score: number;
      ownerIds: Set<string>;
      campaignIds: Set<string>;
    }>();
    for (const city of data.citySummaries) {
      const key = city.province;
      const current = map.get(key) ?? {
        province: key,
        uploads: 0,
        views: 0,
        score: 0,
        ownerIds: new Set<string>(),
        campaignIds: new Set<string>(),
      };
      current.uploads += city.uploads;
      current.views += city.views;
      current.score += city.score;
      map.set(key, current);
    }
    return [...map.values()]
      .sort((a, b) => b.uploads - a.uploads)
      .map((item) => ({
        province: item.province,
        uploads: item.uploads,
        views: item.views,
        score: item.score,
        avgScore: item.uploads > 0 ? Math.round(item.score / item.uploads) : 0,
      }));
  }, [data.citySummaries]);

  const provinceMapData = useMemo(() => {
    const result: Record<string, { uploads: number; views: number }> = {};
    for (const item of provinceSummaries) {
      result[item.province] = { uploads: item.uploads, views: item.views };
    }
    return result;
  }, [provinceSummaries]);

  const selectedProvinceSummary = useMemo(
    () => provinceSummaries.find((item) => item.province === selectedProvince) ?? null,
    [provinceSummaries, selectedProvince]
  );

  const citiesOfProvince = useMemo(
    () =>
      selectedProvince
        ? data.citySummaries.filter((item) => item.province === selectedProvince)
        : data.citySummaries,
    [data.citySummaries, selectedProvince]
  );

  const effectiveKpis = selectedProvinceSummary
    ? {
        activeCampaigns: data.kpis.activeCampaigns,
        totalUploads: selectedProvinceSummary.uploads,
        totalViews: selectedProvinceSummary.views,
        activeOwners: data.kpis.activeOwners,
        avgScore: selectedProvinceSummary.avgScore,
        completionRate: data.kpis.completionRate,
      }
    : data.kpis;

  const topProvincesChart = useMemo(
    () =>
      provinceSummaries.slice(0, 10).map((item) => ({
        label: item.province,
        value: item.uploads,
      })),
    [provinceSummaries]
  );

  const timelineChart = useMemo(
    () =>
      data.timeseries.slice(-14).map((item) => ({
        label: formatPersianDateShort(item.date),
        value: item.uploads,
      })),
    [data.timeseries]
  );

  const updateQuery = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value && value.trim()) params.set(key, value);
      else params.delete(key);
    }
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">صفحه رییس‌جمهور</h1>
        <p className="text-sm text-muted-foreground">
          نمای ملی عملکرد؛ با کلیک روی هر استان، شاخص‌های همان استان نمایش داده می‌شود.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">بازه زمانی</p>
          <Select
            value={dateRange}
            onValueChange={(value: "all" | "30d" | "90d") => updateQuery({ range: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">۳۰ روز اخیر</SelectItem>
              <SelectItem value="90d">۹۰ روز اخیر</SelectItem>
              <SelectItem value="all">همه زمان‌ها</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data.canSwitchOwner ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">کارفرما</p>
            <Select
              value={selectedOwnerId ?? "all"}
              onValueChange={(value) => updateQuery({ owner: value === "all" ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="همه کارفرماها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه کارفرماها</SelectItem>
                {data.ownerOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({formatPersianNumber(item.contentCount)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground md:col-span-2">
            این نما برای حساب شما به‌صورت owner-scoped نمایش داده می‌شود.
          </div>
        )}

        <div className="md:col-span-2 flex items-end justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedProvince(null)}
            disabled={!selectedProvince}
          >
            بازگشت به کل ایران
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <PresidentIranMap
          provinceData={provinceMapData}
          selectedProvince={selectedProvince}
          onSelectProvince={setSelectedProvince}
        />
      </div>

      {selectedProvince ? (
        <div className="rounded-xl border bg-primary/5 px-4 py-3 text-sm">
          استان انتخاب‌شده: <span className="font-bold">{selectedProvince}</span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KPICard title="کمپین فعال" value={effectiveKpis.activeCampaigns} icon={Target} />
        <KPICard title="کل محتوا" value={effectiveKpis.totalUploads} icon={BarChart3} />
        <KPICard title="مجموع بازدید" value={effectiveKpis.totalViews} icon={Eye} />
        <KPICard title="کاربران فعال" value={effectiveKpis.activeOwners} icon={Users} />
        <KPICard title="میانگین امتیاز محتوا" value={effectiveKpis.avgScore} icon={Gauge} />
        <KPICard title="نرخ تایید مشارکت" value={`${formatPersianNumber(effectiveKpis.completionRate)}٪`} icon={Building2} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BarChartCard data={timelineChart} title="روند تولید محتوا (۱۴ روز اخیر)" color="#2563eb" />
        <BarChartCard data={topProvincesChart} title="۱۰ استان برتر بر اساس حجم محتوا" color="#16a34a" />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/40 text-right">
            <tr>
              <th className="p-3 font-medium">{selectedProvince ? "شهر" : "استان"}</th>
              {selectedProvince && <th className="p-3 font-medium">استان</th>}
              <th className="p-3 font-medium">کل محتوا</th>
              <th className="p-3 font-medium">بازدید</th>
              <th className="p-3 font-medium">میانگین امتیاز</th>
              {!selectedProvince && <th className="p-3 font-medium">رتبه</th>}
              {selectedProvince && <th className="p-3 font-medium">کاربران فعال</th>}
              {selectedProvince && <th className="p-3 font-medium">کمپین‌های فعال</th>}
            </tr>
          </thead>
          <tbody>
            {selectedProvince ? (
              citiesOfProvince.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    داده شهری برای استان انتخاب‌شده یافت نشد.
                  </td>
                </tr>
              ) : (
                citiesOfProvince.map((item) => {
                  const avgScore = item.uploads > 0 ? Math.round(item.score / item.uploads) : 0;
                  return (
                    <tr key={item.key} className="border-t">
                      <td className="p-3 font-medium">{item.city}</td>
                      <td className="p-3">{item.province}</td>
                      <td className="p-3">{formatPersianNumber(item.uploads)}</td>
                      <td className="p-3">{formatPersianNumber(item.views)}</td>
                      <td className="p-3">{formatPersianNumber(avgScore)}</td>
                      <td className="p-3">{formatPersianNumber(item.ownerCount)}</td>
                      <td className="p-3">{formatPersianNumber(item.campaignCount)}</td>
                    </tr>
                  );
                })
              )
            ) : provinceSummaries.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  داده‌ای برای بازه/فیلتر فعلی یافت نشد.
                </td>
              </tr>
            ) : (
              provinceSummaries.map((item, idx) => {
                const active = selectedProvince === item.province;
                return (
                  <tr
                    key={item.province}
                    className={`border-t ${active ? "bg-primary/5" : ""} cursor-pointer`}
                    onClick={() => setSelectedProvince(item.province)}
                  >
                    <td className="p-3 font-medium">{item.province}</td>
                    <td className="p-3">{formatPersianNumber(item.uploads)}</td>
                    <td className="p-3">{formatPersianNumber(item.views)}</td>
                    <td className="p-3">{formatPersianNumber(item.avgScore)}</td>
                    <td className="p-3">{formatPersianNumber(idx + 1)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground">
        <MapPin className="me-1 inline h-3.5 w-3.5" />
        با کلیک روی استان در نقشه یا جدول، نمای استانی فعال می‌شود.
      </div>
    </div>
  );
}
