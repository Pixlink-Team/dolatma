"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { markNotificationsSeenAction } from "@/lib/actions/notification-actions";
import {
  buildNotificationFeed,
  filterNotificationFeed,
  type NotificationFeedItem,
  type NotificationRange,
} from "@/lib/notification-feed";
import type { Billboard, CampaignActivity, Poster, SocialMediaPost, Video } from "@/lib/types";
import { formatPersianDate, formatPersianNumber } from "@/lib/utils";

interface NotificationsAdminProps {
  campaignId: string;
  isAdmin: boolean;
  posters: Poster[];
  videos: Video[];
  billboards: Billboard[];
  activities: CampaignActivity[];
  socialPosts: SocialMediaPost[];
}

export function NotificationsAdmin({
  campaignId,
  isAdmin,
  posters,
  videos,
  billboards,
  activities,
  socialPosts,
}: NotificationsAdminProps) {
  const [range, setRange] = useState<NotificationRange>("week");
  const [seenKeys, setSeenKeys] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const feed = useMemo(
    () => buildNotificationFeed({ posters, videos, billboards, activities, socialPosts }),
    [posters, videos, billboards, activities, socialPosts]
  );

  const filtered = useMemo(
    () => filterNotificationFeed(feed, range).filter((item) => !seenKeys.has(item.key)),
    [feed, range, seenKeys]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationFeedItem[]>();
    for (const item of filtered) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  useEffect(() => {
    return () => {
      if (feed.length === 0) return;
      void markNotificationsSeenAction(
        campaignId,
        feed.map((item) => item.key)
      );
    };
  }, [campaignId, feed]);

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await markNotificationsSeenAction(
        campaignId,
        filtered.map((item) => item.key),
        true
      );
      if (!result.success) {
        toast.error("ثبت تأیید ناموفق بود");
        return;
      }
      setSeenKeys((prev) => new Set([...prev, ...filtered.map((item) => item.key)]));
      toast.success("موارد مشاهده‌شده تأیید شد");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">اعلان‌ها</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "مدیر و کارفرما" : "کارفرما"} — محتوای جدید آپلودشده بر اساس تاریخ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onValueChange={(value) => setRange(value as NotificationRange)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">امروز</SelectItem>
              <SelectItem value="week">این هفته</SelectItem>
              <SelectItem value="month">این ماه</SelectItem>
            </SelectContent>
          </Select>
          {filtered.length > 0 && (
            <Button variant="outline" onClick={handleConfirm} disabled={isPending}>
              تأیید مشاهده ({formatPersianNumber(filtered.length)})
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          موارد جدید: {formatPersianNumber(filtered.length)} — با خروج از صفحه، موارد فعلی به‌عنوان دیده‌شده ثبت می‌شوند.
        </p>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border py-12 text-center text-muted-foreground">
          اعلان جدیدی در این بازه وجود ندارد.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <div key={date} className="space-y-3">
              <h2 className="text-sm font-semibold">{formatPersianDate(date)}</h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.ownerName ?? "کاربر"} — {item.typeLabel}
                      </p>
                    </div>
                    <Badge variant="secondary">{item.typeLabel}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
