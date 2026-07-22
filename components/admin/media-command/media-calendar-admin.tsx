"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MediaCommandShell } from "@/components/admin/media-command/media-command-shell";
import { MediaEmptyState } from "@/components/admin/media-command/media-empty-state";
import {
  MediaContentStatusBadge,
  MediaPublishModeBadge,
} from "@/components/admin/media-command/media-status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMediaPlatformLabel, MEDIA_PLATFORMS } from "@/lib/media-command/platforms";
import { MEDIA_CONTENT_STATUS_LABELS } from "@/lib/media-command/labels";
import type { MediaAccount, MediaContent, MediaContentStatus } from "@/lib/media-command/types";
import { rescheduleMediaContentAction } from "@/lib/actions/media-command-actions";
import { adminHref } from "@/lib/utils";
import Link from "next/link";

type ViewMode = "day" | "week" | "month" | "list";

interface Props {
  campaignId: string;
  contents: MediaContent[];
  accounts: MediaAccount[];
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function MediaCalendarAdmin({ campaignId, contents, accounts }: Props) {
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<MediaContentStatus | "all">("all");

  const scheduled = useMemo(() => {
    return contents.filter((c) => c.scheduledAt || c.status === "scheduled" || c.status === "published");
  }, [contents]);

  const filtered = useMemo(() => {
    return scheduled.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (platformFilter !== "all" && !item.targets.some((t) => t.platform === platformFilter)) {
        return false;
      }
      if (accountFilter !== "all" && !item.targets.some((t) => t.accountId === accountFilter)) {
        return false;
      }
      return true;
    });
  }, [scheduled, statusFilter, platformFilter, accountFilter]);

  const days = useMemo(() => {
    if (view === "day") return [anchor];
    if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
    if (view === "month") {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      return Array.from({ length: 31 }, (_, i) => addDays(first, i)).filter(
        (d) => d.getMonth() === first.getMonth()
      );
    }
    return [];
  }, [view, anchor]);

  const itemsForDay = (day: Date) => {
    const start = startOfDay(day).getTime();
    const end = addDays(day, 1).getTime();
    return filtered.filter((item) => {
      const at = item.scheduledAt ? new Date(item.scheduledAt).getTime() : null;
      if (!at) return false;
      return at >= start && at < end;
    });
  };

  const reschedule = async (id: string, value: string) => {
    const result = await rescheduleMediaContentAction({
      campaignId,
      id,
      scheduledAt: new Date(value).toISOString(),
    });
    if (!result.success) {
      toast.error(result.error ?? "جابه‌جایی زمان ناموفق بود");
      return;
    }
    toast.success("زمان انتشار به‌روزرسانی شد");
    window.location.reload();
  };

  return (
    <MediaCommandShell
      campaignId={campaignId}
      title="تقویم انتشار"
      description="نمای روزانه، هفتگی، ماهانه و فهرستی از انتشارات برنامه‌ریزی‌شده"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month", "list"] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={view === mode ? "default" : "outline"}
              onClick={() => setView(mode)}
            >
              {mode === "day"
                ? "روزانه"
                : mode === "week"
                  ? "هفتگی"
                  : mode === "month"
                    ? "ماهانه"
                    : "فهرستی"}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setAnchor(addDays(anchor, view === "month" ? -30 : -7))}>
            قبلی
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAnchor(startOfDay(new Date()))}>
            امروز
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAnchor(addDays(anchor, view === "month" ? 30 : 7))}>
            بعدی
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger>
            <SelectValue placeholder="شبکه" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه شبکه‌ها</SelectItem>
            {MEDIA_PLATFORMS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger>
            <SelectValue placeholder="حساب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه حساب‌ها</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.accountName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as MediaContentStatus | "all")}
        >
          <SelectTrigger>
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            {(Object.keys(MEDIA_CONTENT_STATUS_LABELS) as MediaContentStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {MEDIA_CONTENT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <MediaEmptyState
          title="موردی در تقویم نیست"
          description="محتوای زمان‌بندی‌شده‌ای برای نمایش وجود ندارد."
          actionLabel="ساخت محتوا"
          actionHref={adminHref("/admin/media-command/publish", campaignId)}
        />
      ) : view === "list" ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.internalTitle}</span>
                    <MediaContentStatusBadge status={item.status} />
                    <MediaPublishModeBadge mode={item.publishMode} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[...new Set(item.targets.map((t) => getMediaPlatformLabel(t.platform)))].join(
                      "، "
                    )}
                    {" · "}
                    {item.scheduledAt
                      ? new Intl.DateTimeFormat("fa-IR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.scheduledAt))
                      : "بدون زمان"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    className="w-auto"
                    defaultValue={item.scheduledAt?.slice(0, 16) ?? ""}
                    onBlur={(e) => {
                      if (e.target.value) reschedule(item.id, e.target.value);
                    }}
                  />
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={adminHref(
                        `/admin/media-command/publish?edit=${item.id}`,
                        campaignId
                      )}
                    >
                      جزئیات
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className={`grid gap-3 ${view === "day" ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {days.map((day) => {
            const items = itemsForDay(day);
            return (
              <Card key={day.toISOString()}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {new Intl.DateTimeFormat("fa-IR", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    }).format(day)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">موردی نیست</p>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="rounded-md border p-2 text-xs space-y-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-medium">{item.internalTitle}</span>
                          <MediaContentStatusBadge status={item.status} />
                          <MediaPublishModeBadge mode={item.publishMode} />
                        </div>
                        <p className="text-muted-foreground">
                          {item.targets[0]
                            ? `${getMediaPlatformLabel(item.targets[0].platform)} · ${item.targets[0].accountName}`
                            : "بدون حساب"}
                        </p>
                        <Input
                          type="datetime-local"
                          className="h-8 text-xs"
                          defaultValue={item.scheduledAt?.slice(0, 16) ?? ""}
                          onBlur={(e) => {
                            if (e.target.value) reschedule(item.id, e.target.value);
                          }}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </MediaCommandShell>
  );
}
