"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  FileStack,
  LogIn,
  MousePointerClick,
  Navigation,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useChartTheme } from "@/lib/hooks/use-chart-theme";
import {
  formatPersianDateShort,
  formatPersianDateTime,
  formatPersianNumber,
} from "@/lib/utils";
import {
  AUDIT_CATEGORY_LABELS,
  getAuditActionLabel,
  getAuditEntityLabel,
  getAuditRoleLabel,
} from "@/lib/audit/labels";
import type { AuditCategory, AuditDashboardData } from "@/lib/audit/types";

const CATEGORY_BADGE_VARIANT: Record<
  AuditCategory,
  "default" | "outline" | "success" | "warning" | "destructive"
> = {
  auth: "success",
  navigation: "outline",
  content: "default",
  ui: "outline",
  admin: "warning",
  system: "outline",
};

const CLICK_CHART_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#22c55e",
  "#06b6d4",
  "#eab308",
  "#ef4444",
];

interface AuditAdminProps {
  data: AuditDashboardData | null;
  databaseReady: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{formatPersianNumber(value)}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <Icon className="h-5 w-5 text-primary shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export function AuditAdmin({ data, databaseReady }: AuditAdminProps) {
  const chartTheme = useChartTheme();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | "all">("all");

  const dailyChartData = useMemo(
    () =>
      (data?.dailySeries ?? []).map((point) => ({
        ...point,
        label: formatPersianDateShort(point.date),
      })),
    [data?.dailySeries]
  );

  const actionChartData = useMemo(
    () =>
      (data?.topActions ?? []).map((item) => ({
        label: getAuditActionLabel(item.action),
        count: item.count,
      })),
    [data?.topActions]
  );

  const clickChartData = useMemo(
    () =>
      (data?.topClicks ?? []).slice(0, 8).map((item) => ({
        label: item.label.length > 22 ? `${item.label.slice(0, 22)}…` : item.label,
        count: item.count,
      })),
    [data?.topClicks]
  );

  const filteredEvents = useMemo(() => {
    const events = data?.recentEvents ?? [];
    const term = search.trim().toLowerCase();
    return events.filter((event) => {
      if (categoryFilter !== "all" && event.category !== categoryFilter) return false;
      if (!term) return true;
      return [
        event.actorName,
        event.actorEmail,
        getAuditActionLabel(event.action),
        event.label,
        event.path,
        getAuditEntityLabel(event.entityType),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [data?.recentEvents, search, categoryFilter]);

  if (!databaseReady || !data) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="رصد فعالیت کاربران"
          description="گزارش کامل ورود، فعالیت و محتوای ثبت‌شده توسط کاربران"
        />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            رصد فعالیت فقط روی پایگاه‌داده PostgreSQL فعال است. لطفاً اتصال دیتابیس را
            پیکربندی و مهاجرت (`npm run db:migrate`) را اجرا کنید.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="رصد فعالیت کاربران"
        description="چه کسی وارد شده، چه محتوایی ثبت کرده، کجا رفته و روی چه دکمه‌هایی کلیک کرده است"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="کاربران فعال امروز" value={summary.activeUsersToday} icon={Users} />
        <StatCard label="ورود امروز" value={summary.loginsToday} icon={LogIn} />
        <StatCard label="تغییرات محتوا امروز" value={summary.contentChangesToday} icon={FileStack} />
        <StatCard label="بازدید صفحه امروز" value={summary.pageViewsToday} icon={Navigation} />
        <StatCard label="کلیک امروز" value={summary.clicksToday} icon={MousePointerClick} />
        <StatCard label="کل رویدادها" value={summary.totalEvents} icon={Activity} />
        <StatCard label="رویداد امروز" value={summary.eventsToday} icon={BarChart3} />
        <StatCard
          label="ورود ناموفق امروز"
          value={summary.failedLoginsToday}
          icon={ShieldAlert}
          hint={summary.failedLoginsToday > 0 ? "بررسی امنیتی توصیه می‌شود" : undefined}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">نمای کلی</TabsTrigger>
          <TabsTrigger value="users">کاربران</TabsTrigger>
          <TabsTrigger value="content">محتوای هر کاربر</TabsTrigger>
          <TabsTrigger value="logins">ورودها</TabsTrigger>
          <TabsTrigger value="events">رویدادها</TabsTrigger>
        </TabsList>

        {/* Overview: charts */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">روند فعالیت ۱۴ روز اخیر</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData}>
                    <defs>
                      <linearGradient id="auditTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="auditContent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartTheme.tick }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: chartTheme.tick }}
                      allowDecimals={false}
                      tickFormatter={(v) => formatPersianNumber(v)}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatPersianNumber(value),
                        name,
                      ]}
                      labelFormatter={(label) => `تاریخ: ${label}`}
                      contentStyle={chartTheme.tooltipContentStyle}
                      labelStyle={chartTheme.tooltipLabelStyle}
                    />
                    <Legend wrapperStyle={chartTheme.legendStyle} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="کل رویدادها"
                      stroke="#3b82f6"
                      fill="url(#auditTotal)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="content"
                      name="تغییرات محتوا"
                      stroke="#22c55e"
                      fill="url(#auditContent)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="logins"
                      name="ورودها"
                      stroke="#f97316"
                      fillOpacity={0}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">پرتکرارترین اقدام‌ها</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={actionChartData} layout="vertical" margin={{ right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: chartTheme.tick }}
                        allowDecimals={false}
                        tickFormatter={(v) => formatPersianNumber(v)}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={110}
                        tick={{ fontSize: 11, fill: chartTheme.tick }}
                      />
                      <Tooltip
                        formatter={(value: number) => formatPersianNumber(value)}
                        contentStyle={chartTheme.tooltipContentStyle}
                        labelStyle={chartTheme.tooltipLabelStyle}
                      />
                      <Bar dataKey="count" name="تعداد" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">پرکلیک‌ترین دکمه‌ها</CardTitle>
              </CardHeader>
              <CardContent>
                {clickChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">
                    هنوز کلیکی ثبت نشده است.
                  </p>
                ) : (
                  <div className="h-[300px] w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={clickChartData} layout="vertical" margin={{ right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: chartTheme.tick }}
                          allowDecimals={false}
                          tickFormatter={(v) => formatPersianNumber(v)}
                        />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={130}
                          tick={{ fontSize: 11, fill: chartTheme.tick }}
                        />
                        <Tooltip
                          formatter={(value: number) => formatPersianNumber(value)}
                          contentStyle={chartTheme.tooltipContentStyle}
                          labelStyle={chartTheme.tooltipLabelStyle}
                        />
                        <Bar dataKey="count" name="کلیک" radius={[0, 4, 4, 0]}>
                          {clickChartData.map((_, index) => (
                            <Cell
                              key={index}
                              fill={CLICK_CHART_COLORS[index % CLICK_CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">پربازدیدترین صفحات</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-right font-medium px-4 py-2.5">صفحه</th>
                      <th className="text-right font-medium px-4 py-2.5">تعداد بازدید</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPaths.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                          موردی ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      data.topPaths.map((row) => (
                        <tr key={row.path} className="border-t">
                          <td className="px-4 py-2.5 font-mono text-xs" dir="ltr">{row.path}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(row.count)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users: top actors */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">فعال‌ترین کاربران</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-right font-medium px-4 py-2.5">کاربر</th>
                      <th className="text-right font-medium px-4 py-2.5">نقش</th>
                      <th className="text-right font-medium px-4 py-2.5">کل رویداد</th>
                      <th className="text-right font-medium px-4 py-2.5">ورود</th>
                      <th className="text-right font-medium px-4 py-2.5">ثبت محتوا</th>
                      <th className="text-right font-medium px-4 py-2.5">ویرایش</th>
                      <th className="text-right font-medium px-4 py-2.5">حذف</th>
                      <th className="text-right font-medium px-4 py-2.5">بازدید</th>
                      <th className="text-right font-medium px-4 py-2.5">کلیک</th>
                      <th className="text-right font-medium px-4 py-2.5">آخرین فعالیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topActors.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">
                          موردی ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      data.topActors.map((actor) => (
                        <tr key={actor.actorKey} className="border-t">
                          <td className="px-4 py-2.5">
                            <div className="font-medium">{actor.actorName}</div>
                            {actor.actorEmail && (
                              <div className="text-xs text-muted-foreground" dir="ltr">
                                {actor.actorEmail}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline">{getAuditRoleLabel(actor.actorRole)}</Badge>
                          </td>
                          <td className="px-4 py-2.5 font-semibold">
                            {formatPersianNumber(actor.eventCount)}
                          </td>
                          <td className="px-4 py-2.5">{formatPersianNumber(actor.loginCount)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(actor.contentCreateCount)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(actor.contentUpdateCount)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(actor.contentDeleteCount)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(actor.pageViewCount)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(actor.clickCount)}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {actor.lastSeenAt ? formatPersianDateTime(actor.lastSeenAt) : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content by user (from ownership) */}
        <TabsContent value="content">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">محتوای ثبت‌شده به تفکیک کاربر</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-right font-medium px-4 py-2.5">کاربر</th>
                      <th className="text-right font-medium px-4 py-2.5">مجموع</th>
                      <th className="text-right font-medium px-4 py-2.5">بیلبورد</th>
                      <th className="text-right font-medium px-4 py-2.5">پوستر</th>
                      <th className="text-right font-medium px-4 py-2.5">ویدیو</th>
                      <th className="text-right font-medium px-4 py-2.5">فایل</th>
                      <th className="text-right font-medium px-4 py-2.5">راش</th>
                      <th className="text-right font-medium px-4 py-2.5">شبکه اجتماعی</th>
                      <th className="text-right font-medium px-4 py-2.5">اقدام</th>
                      <th className="text-right font-medium px-4 py-2.5">پخش</th>
                      <th className="text-right font-medium px-4 py-2.5">جلسه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.contentByUser.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-6 text-center text-muted-foreground">
                          موردی ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      data.contentByUser.map((row) => (
                        <tr key={row.userId} className="border-t">
                          <td className="px-4 py-2.5">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-xs text-muted-foreground" dir="ltr">{row.email}</div>
                          </td>
                          <td className="px-4 py-2.5 font-semibold">{formatPersianNumber(row.total)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(row.billboards)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(row.posters)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(row.videos)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(row.files)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(row.rawMedia)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(row.socialPosts)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(row.activities)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(row.broadcast)}</td>
                          <td className="px-4 py-2.5">{formatPersianNumber(row.meetings)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logins */}
        <TabsContent value="logins">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">تاریخچه ورود کاربران</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-right font-medium px-4 py-2.5">کاربر</th>
                      <th className="text-right font-medium px-4 py-2.5">نقش</th>
                      <th className="text-right font-medium px-4 py-2.5">زمان ورود</th>
                      <th className="text-right font-medium px-4 py-2.5">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logins.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                          موردی ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      data.logins.map((event) => (
                        <tr key={event.id} className="border-t">
                          <td className="px-4 py-2.5">
                            <div className="font-medium">{event.actorName ?? "—"}</div>
                            {event.actorEmail && (
                              <div className="text-xs text-muted-foreground" dir="ltr">
                                {event.actorEmail}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline">{getAuditRoleLabel(event.actorRole)}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {formatPersianDateTime(event.createdAt)}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs" dir="ltr">
                            {event.ipAddress ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full event log */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="جستجو در رویدادها…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="sm:max-w-xs"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                data-audit-label="فیلتر: همه"
                onClick={() => setCategoryFilter("all")}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  categoryFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                همه
              </button>
              {(Object.keys(AUDIT_CATEGORY_LABELS) as AuditCategory[]).map((category) => (
                <button
                  key={category}
                  type="button"
                  data-audit-label={`فیلتر: ${AUDIT_CATEGORY_LABELS[category]}`}
                  onClick={() => setCategoryFilter(category)}
                  className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                    categoryFilter === category
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {AUDIT_CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-right font-medium px-4 py-2.5">زمان</th>
                      <th className="text-right font-medium px-4 py-2.5">کاربر</th>
                      <th className="text-right font-medium px-4 py-2.5">دسته</th>
                      <th className="text-right font-medium px-4 py-2.5">اقدام</th>
                      <th className="text-right font-medium px-4 py-2.5">مورد</th>
                      <th className="text-right font-medium px-4 py-2.5">توضیح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                          موردی یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((event) => (
                        <tr key={event.id} className="border-t align-top">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatPersianDateTime(event.createdAt)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-medium">{event.actorName ?? "—"}</div>
                            {event.actorEmail && (
                              <div className="text-xs text-muted-foreground" dir="ltr">
                                {event.actorEmail}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant={CATEGORY_BADGE_VARIANT[event.category]}>
                              {AUDIT_CATEGORY_LABELS[event.category]}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5">{getAuditActionLabel(event.action)}</td>
                          <td className="px-4 py-2.5">{getAuditEntityLabel(event.entityType)}</td>
                          <td className="px-4 py-2.5 max-w-xs">
                            <span className="line-clamp-2">{event.label ?? event.path ?? "—"}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
