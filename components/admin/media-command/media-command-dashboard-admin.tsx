"use client";

import Link from "next/link";
import { formatPersianNumber, adminHref } from "@/lib/utils";
import type { MediaCommandBundle } from "@/lib/media-command/types";
import { MediaCommandShell } from "@/components/admin/media-command/media-command-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  campaignId: string;
  bundle: MediaCommandBundle;
}

export function MediaCommandDashboardAdmin({ campaignId, bundle }: Props) {
  const { summary, todayTasks, suggestions, recentEvents } = bundle;

  const stats = [
    { label: "حساب‌های متصل", value: summary.connectedAccounts },
    { label: "حساب‌های قطع/خطا", value: summary.brokenAccounts },
    { label: "محتواهای منتشرشده", value: summary.publishedContents },
    { label: "پست‌های زمان‌بندی‌شده", value: summary.scheduledContents },
    { label: "منتظر تأیید", value: summary.pendingApproval },
    { label: "دستورهای جدید", value: summary.newOrders },
    { label: "بدون پاسخ", value: summary.unansweredInteractions },
    { label: "خطاهای انتشار", value: summary.publishErrors },
    { label: "نرخ انجام مأموریت‌ها", value: `${summary.missionCompletionRate}٪` },
  ];

  return (
    <MediaCommandShell
      campaignId={campaignId}
      title="پیشخوان رسانه"
      description="وضعیت امروز میز فرمان رسانه‌ای و اقدام‌های ضروری"
      actions={
        <Button asChild>
          <Link href={adminHref("/admin/media-command/publish", campaignId)}>انتشار محتوا</Link>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold">
                {typeof stat.value === "number" ? formatPersianNumber(stat.value) : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">کارهای امروز من</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">برای امروز کار فوری ثبت نشده است.</p>
            ) : (
              todayTasks.map((task) => (
                <Link
                  key={task.id}
                  href={task.href}
                  className="block rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant={
                        task.urgency === "high"
                          ? "destructive"
                          : task.urgency === "normal"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {task.urgency === "high" ? "فوری" : task.urgency === "normal" ? "عادی" : "کم"}
                    </Badge>
                    <span className="text-sm font-medium">{task.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">پیشنهادهای هوشمند راستا</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.reason}</p>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>مرتبط: {item.relatedCampaignOrDirective}</span>
                  {item.deadlineAt && (
                    <span>
                      مهلت:{" "}
                      {new Intl.DateTimeFormat("fa-IR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.deadlineAt))}
                    </span>
                  )}
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={item.actionHref}>{item.actionLabel}</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخرین رویدادهای محتوا</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز رویدادی ثبت نشده است.</p>
          ) : (
            recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{event.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.actorName ?? "سامانه"} · {event.eventType}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(event.createdAt))}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </MediaCommandShell>
  );
}
