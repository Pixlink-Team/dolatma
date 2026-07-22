"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPersianNumber, adminHref } from "@/lib/utils";
import { getMediaPlatformLabel } from "@/lib/media-command/platforms";
import type { MediaContent, MediaPublishOrder, MediaSmartSuggestion } from "@/lib/media-command/types";

export interface MediaOpsSnapshot {
  publishedCount: number;
  pendingCount: number;
  failedCount: number;
  orderCount: number;
  platformCoverage: string[];
  unansweredInteractions: number;
  contents: MediaContent[];
  orders: MediaPublishOrder[];
  suggestions: MediaSmartSuggestion[];
}

interface Props {
  campaignId: string;
  directiveId: string;
  snapshot: MediaOpsSnapshot;
}

export function MediaOpsCommandPanel({ campaignId, directiveId, snapshot }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "انتشار انجام‌شده", value: snapshot.publishedCount },
          { label: "در صف / منتظر", value: snapshot.pendingCount },
          { label: "ناموفق", value: snapshot.failedCount },
          { label: "دستورهای انتشار", value: snapshot.orderCount },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-bold">{formatPersianNumber(item.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">پوشش شبکه‌ها و پاسخ‌گویی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {snapshot.platformCoverage.length === 0 ? (
                <p className="text-sm text-muted-foreground">هنوز پوششی ثبت نشده است.</p>
              ) : (
                snapshot.platformCoverage.map((platform) => (
                  <Badge key={platform} variant="secondary">
                    {getMediaPlatformLabel(platform)}
                  </Badge>
                ))
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              تعاملات بدون پاسخ: {formatPersianNumber(snapshot.unansweredInteractions)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={adminHref("/admin/media-command/orders", campaignId)}>
                  صدور دستور برای دستگاه‌های کم‌فعال
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={adminHref("/admin/media-command", campaignId)}>پیشخوان رسانه</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">پیشنهاد اقدام بعدی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshot.suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">پیشنهادی نیست.</p>
            ) : (
              snapshot.suggestions.map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href={item.actionHref}>{item.actionLabel}</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">محتواها و دستورهای مرتبط با این دستورکار</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {snapshot.contents.length === 0 && snapshot.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              هنوز محتوای رسانه‌ای به این دستورکار وصل نشده است. شناسه دستورکار: {directiveId}
            </p>
          ) : (
            <>
              {snapshot.contents.map((content) => (
                <div key={content.id} className="rounded-md border px-3 py-2 text-sm">
                  <span className="font-medium">{content.internalTitle}</span>
                  <span className="text-muted-foreground"> · {content.status}</span>
                </div>
              ))}
              {snapshot.orders.map((order) => (
                <div key={order.id} className="rounded-md border px-3 py-2 text-sm">
                  <span className="font-medium">{order.title}</span>
                  <span className="text-muted-foreground"> · {order.status}</span>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
