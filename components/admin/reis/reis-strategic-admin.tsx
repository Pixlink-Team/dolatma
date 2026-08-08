"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ClipboardList,
  MessageSquareWarning,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DirectivesAdmin } from "@/components/admin/directives-admin";
import { ReisUpwardRequestsPanel } from "@/components/admin/reis/reis-upward-requests-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChartTheme } from "@/lib/hooks/use-chart-theme";
import type { StrategicUpwardRequest } from "@/lib/strategic-requests";
import type {
  CampaignDirective,
  CampaignSubmission,
  Ministry,
} from "@/lib/types";
import { cn, formatPersianNumber } from "@/lib/utils";

type CampaignUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  region: import("@/lib/user-regions").UserRegion | null;
  phone: string | null;
  province?: string | null;
  city?: string | null;
  ministryId?: string | null;
  ministryName?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
};

type ReisStrategicAdminProps = {
  campaignId: string;
  currentUserId: string | null;
  initialDirectives: CampaignDirective[];
  archivedDirectives: CampaignDirective[];
  inboxDirectives: CampaignDirective[];
  rejectedSubmissions: CampaignSubmission[];
  campaignUsers: CampaignUserOption[];
  ministries: Ministry[];
  upwardRequests: StrategicUpwardRequest[];
  canCreateUpwardRequest: boolean;
};

const PRIORITY_COLORS = {
  urgent: "#ef4444",
  normal: "#3b82f6",
};

const AUDIENCE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];

function audienceLabel(item: CampaignDirective): string {
  if (item.audienceType === "region") return "منطقه";
  if (item.audienceType === "users") return "افراد";
  if (item.audienceType === "ministry_city") return "وزارتخانه / شهر";
  return "همه";
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof ClipboardList;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200/80 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
      : tone === "warning"
        ? "border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
        : tone === "success"
          ? "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
          : "";

  return (
    <Card className={cn(toneClass)}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="shrink-0 rounded-lg bg-muted/80 p-2.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {typeof value === "number" ? formatPersianNumber(value) : value}
          </p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function ReisStrategicAdmin({
  campaignId,
  currentUserId,
  initialDirectives,
  archivedDirectives,
  inboxDirectives,
  rejectedSubmissions,
  campaignUsers,
  ministries,
  upwardRequests,
  canCreateUpwardRequest,
}: ReisStrategicAdminProps) {
  const [tab, setTab] = useState<"directives" | "requests">("directives");
  const chartTheme = useChartTheme();

  const stats = useMemo(() => {
    const mine = currentUserId
      ? initialDirectives.filter((row) => row.createdByUserId === currentUserId).length
      : 0;
    const subordinates = currentUserId
      ? initialDirectives.filter(
          (row) => row.createdByUserId && row.createdByUserId !== currentUserId
        ).length
      : 0;
    const urgent = initialDirectives.filter((row) => row.priority === "urgent").length;
    const pendingRequests = upwardRequests.filter(
      (row) => row.status === "pending" || row.status === "reviewing"
    ).length;
    const inboxNew = inboxDirectives.filter((row) => !row.confirmed).length;

    return {
      active: initialDirectives.length,
      archived: archivedDirectives.length,
      urgent,
      mine,
      subordinates,
      pendingRequests,
      inboxNew,
      totalRequests: upwardRequests.length,
    };
  }, [
    archivedDirectives.length,
    currentUserId,
    inboxDirectives,
    initialDirectives,
    upwardRequests,
  ]);

  const priorityChartData = useMemo(() => {
    const urgent = initialDirectives.filter((row) => row.priority === "urgent").length;
    const normal = initialDirectives.length - urgent;
    return [
      { name: "فوری", value: urgent, color: PRIORITY_COLORS.urgent },
      { name: "عادی", value: normal, color: PRIORITY_COLORS.normal },
    ].filter((row) => row.value > 0);
  }, [initialDirectives]);

  const audienceChartData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of initialDirectives) {
      const label = audienceLabel(item);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [initialDirectives]);

  const issuerChartData = useMemo(
    () =>
      [
        { name: "دستورکارهای من", value: stats.mine },
        { name: "زیرمجموعه", value: stats.subordinates },
      ].filter((row) => row.value > 0),
    [stats.mine, stats.subordinates]
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">ارتباطات راهبردی</h1>
          <Badge variant="outline">نمای مدیریتی</Badge>
        </div>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          در این داشبورد وضعیت دستورکارها، مخاطبان، و درخواست‌های بالاسری را یکجا ببینید؛
          دستور بدهید، پیگیری کنید، و پاسخ درخواست‌های زیرمجموعه را ثبت کنید.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="دستورکار فعال"
          value={stats.active}
          icon={ClipboardList}
          hint={`${formatPersianNumber(stats.mine)} صادرشده توسط شما`}
        />
        <StatCard
          label="فوری"
          value={stats.urgent}
          icon={ShieldAlert}
          tone={stats.urgent > 0 ? "danger" : "default"}
        />
        <StatCard
          label="دستورکار زیرمجموعه"
          value={stats.subordinates}
          icon={Users}
        />
        <StatCard
          label="آرشیو"
          value={stats.archived}
          icon={Archive}
        />
        <StatCard
          label="کارتابل جدید"
          value={stats.inboxNew}
          icon={ClipboardList}
          tone={stats.inboxNew > 0 ? "warning" : "default"}
        />
        <StatCard
          label="درخواست در انتظار"
          value={stats.pendingRequests}
          icon={MessageSquareWarning}
          tone={stats.pendingRequests > 0 ? "warning" : "success"}
          hint={`از ${formatPersianNumber(stats.totalRequests)} درخواست`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">اولویت دستورکارها</CardTitle>
            <CardDescription>تفکیک فوری و عادی در دستورکارهای فعال</CardDescription>
          </CardHeader>
          <CardContent>
            {priorityChartData.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                هنوز دستورکار فعالی نیست
              </div>
            ) : (
              <div className="h-[240px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                    >
                      {priorityChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatPersianNumber(value)}
                      contentStyle={chartTheme.tooltipContentStyle}
                      labelStyle={chartTheme.tooltipLabelStyle}
                    />
                    <Legend wrapperStyle={chartTheme.legendStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">صادرکننده</CardTitle>
            <CardDescription>دستورکارهای شما در برابر زیرمجموعه‌ها</CardDescription>
          </CardHeader>
          <CardContent>
            {issuerChartData.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                داده‌ای برای نمایش نیست
              </div>
            ) : (
              <div className="h-[240px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={issuerChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: chartTheme.tick }}
                      tickFormatter={(value) => formatPersianNumber(value)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 12, fill: chartTheme.tick }}
                    />
                    <Tooltip
                      formatter={(value: number) => formatPersianNumber(value)}
                      contentStyle={chartTheme.tooltipContentStyle}
                      labelStyle={chartTheme.tooltipLabelStyle}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">مخاطبان دستورکار</CardTitle>
            <CardDescription>ترکیب نوع مخاطب در دستورکارهای فعال</CardDescription>
          </CardHeader>
          <CardContent>
            {audienceChartData.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                داده‌ای برای نمایش نیست
              </div>
            ) : (
              <div className="h-[240px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={audienceChartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: chartTheme.tick }}
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: chartTheme.tick }}
                      tickFormatter={(value) => formatPersianNumber(value)}
                      width={32}
                    />
                    <Tooltip
                      formatter={(value: number) => formatPersianNumber(value)}
                      contentStyle={chartTheme.tooltipContentStyle}
                      labelStyle={chartTheme.tooltipLabelStyle}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={28}>
                      {audienceChartData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={AUDIENCE_COLORS[index % AUDIENCE_COLORS.length]}
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">میز کار ارتباطات راهبردی</CardTitle>
          <CardDescription>
            مدیریت دستورکارها، پیگیری مشاهده مخاطبان، و رسیدگی به درخواست‌های بالاسری
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} dir="rtl">
            <TabsList className="w-full justify-start sm:w-auto">
              <TabsTrigger value="directives">دستورکار و پیگیری</TabsTrigger>
              <TabsTrigger value="requests" className="gap-1.5">
                درخواست‌های بالاسری
                {stats.pendingRequests > 0 ? (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">
                    {formatPersianNumber(stats.pendingRequests)}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="directives" className="mt-5">
              <DirectivesAdmin
                campaignId={campaignId}
                canManage
                audienceScope="global"
                isFullAdmin={false}
                issuerFilterEnabled
                currentUserId={currentUserId}
                hideHeading
                headingTitle="دستورکارها"
                headingDescription="دستورکارهای صادرشده توسط شما، دستورکارهای زیرمجموعه‌ها، و پیگیری مشاهده مخاطبان"
                initialDirectives={initialDirectives}
                archivedDirectives={archivedDirectives}
                inboxDirectives={inboxDirectives}
                rejectedSubmissions={rejectedSubmissions}
                campaignUsers={campaignUsers}
                ministries={ministries}
              />
            </TabsContent>

            <TabsContent value="requests" className="mt-5">
              <ReisUpwardRequestsPanel
                campaignId={campaignId}
                initialRequests={upwardRequests}
                canRespond
                canCreate={canCreateUpwardRequest}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
