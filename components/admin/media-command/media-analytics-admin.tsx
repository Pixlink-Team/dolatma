"use client";

import { MediaCommandShell } from "@/components/admin/media-command/media-command-shell";
import { MediaEmptyState } from "@/components/admin/media-command/media-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPersianNumber, adminHref } from "@/lib/utils";
import type { MediaCommandBundle } from "@/lib/media-command/types";
import { getMediaPlatformLabel } from "@/lib/media-command/platforms";

interface Props {
  campaignId: string;
  bundle: MediaCommandBundle;
}

export function MediaAnalyticsAdmin({ campaignId, bundle }: Props) {
  const { contents, accounts, orders, interactions, summary } = bundle;
  const hasData = contents.length > 0 || interactions.length > 0;

  const platformCoverage = new Map<string, number>();
  for (const content of contents) {
    for (const target of content.targets) {
      platformCoverage.set(
        target.platform,
        (platformCoverage.get(target.platform) ?? 0) + 1
      );
    }
  }

  const unanswered = interactions.filter((i) => !["replied", "closed"].includes(i.status)).length;
  const successRate =
    contents.length === 0
      ? 0
      : Math.round(
          (contents.filter((c) => c.status === "published").length / contents.length) * 100
        );

  return (
    <MediaCommandShell
      campaignId={campaignId}
      title="تحلیل عملکرد"
      description="تحلیل در سه سطح محتوا، حساب/دستگاه و کمپین"
    >
      {!hasData ? (
        <MediaEmptyState
          title="اطلاعات تحلیلی کافی وجود ندارد"
          description="پس از انتشار محتوا و دریافت تعامل، نمودارهای عملکرد اینجا فعال می‌شوند."
          actionLabel="رفتن به تقویم انتشار"
          actionHref={adminHref("/admin/media-command/calendar", campaignId)}
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold">سطح محتوا</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "تعداد انتشار", value: summary.publishedContents },
                { label: "زمان‌بندی‌شده", value: summary.scheduledContents },
                { label: "خطای انتشار", value: summary.publishErrors },
                { label: "نرخ پاسخ", value: `${Math.max(0, 100 - unanswered)}٪ تقریبی` },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-xl font-bold">
                      {typeof item.value === "number"
                        ? formatPersianNumber(item.value)
                        : item.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">سطح حساب و دستگاه</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "حساب‌های متصل", value: summary.connectedAccounts },
                { label: "درصد موفقیت انتشار", value: `${successRate}٪` },
                { label: "پیام بدون پاسخ", value: unanswered },
                { label: "حساب دارای خطا", value: summary.brokenAccounts },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-xl font-bold">
                      {typeof item.value === "number"
                        ? formatPersianNumber(item.value)
                        : item.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="mt-3">
              <CardHeader>
                <CardTitle className="text-sm">پوشش شبکه‌ها</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {[...platformCoverage.entries()].map(([platform, count]) => (
                  <span
                    key={platform}
                    className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
                  >
                    {getMediaPlatformLabel(platform)}: {formatPersianNumber(count)}
                  </span>
                ))}
                {platformCoverage.size === 0 && (
                  <p className="text-sm text-muted-foreground">پوششی ثبت نشده است.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">سطح کمپین</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "دستورهای انتشار", value: orders.length },
                { label: "نرخ انجام مأموریت", value: `${summary.missionCompletionRate}٪` },
                { label: "محتواهای فعال", value: contents.length },
                { label: "حساب‌های مدیریت‌شده", value: accounts.length },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-xl font-bold">
                      {typeof item.value === "number"
                        ? formatPersianNumber(item.value)
                        : item.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </MediaCommandShell>
  );
}
