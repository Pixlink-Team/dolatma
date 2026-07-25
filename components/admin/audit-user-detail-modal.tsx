"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Activity,
  FileStack,
  LogIn,
  MousePointerClick,
  Navigation,
  Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAuditUserDetailAction } from "@/lib/actions/audit-user-actions";
import {
  AUDIT_CATEGORY_LABELS,
  getAuditActionLabel,
  getAuditEntityLabel,
  getAuditRoleLabel,
} from "@/lib/audit/labels";
import type { AuditUserDetail } from "@/lib/audit/types";
import { formatPersianDateTime, formatPersianNumber } from "@/lib/utils";

export type AuditUserLookup = {
  actorKey?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
};

interface AuditUserDetailModalProps {
  target: AuditUserLookup | null;
  onOpenChange: (open: boolean) => void;
}

function StatChip({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </div>
      <p className="mt-1 text-lg font-semibold">{formatPersianNumber(value)}</p>
    </div>
  );
}

const CONTENT_LABELS: { key: keyof NonNullable<AuditUserDetail["content"]>; label: string }[] = [
  { key: "billboards", label: "بیلبورد" },
  { key: "posters", label: "پوستر" },
  { key: "videos", label: "ویدیو" },
  { key: "files", label: "فایل" },
  { key: "rawMedia", label: "راش" },
  { key: "socialPosts", label: "شبکه اجتماعی" },
  { key: "activities", label: "اقدام" },
  { key: "broadcast", label: "پخش" },
  { key: "meetings", label: "جلسه" },
  { key: "analytics", label: "سایت" },
  { key: "submissions", label: "ارسال" },
];

export function AuditUserDetailModal({ target, onOpenChange }: AuditUserDetailModalProps) {
  const [detail, setDetail] = useState<AuditUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!target) {
      setDetail(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await getAuditUserDetailAction({
        actorKey: target.actorKey,
        actorUserId: target.actorUserId,
        actorEmail: target.actorEmail,
      });
      if (!result.success || !result.data) {
        setDetail(null);
        setError(result.error ?? "بارگذاری ناموفق بود");
        return;
      }
      setDetail(result.data);
    });
  }, [target]);

  const open = Boolean(target);
  const titleName =
    detail?.actor.actorName ||
    target?.actorName ||
    target?.actorEmail ||
    "جزئیات کاربر";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex max-h-[92vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pe-12">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{titleName}</span>
            {detail?.actor.isOnline ? (
              <Badge variant="success" className="gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                آنلاین
              </Badge>
            ) : null}
            {detail?.actor.actorRole ? (
              <Badge variant="outline">{getAuditRoleLabel(detail.actor.actorRole)}</Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription className="text-right">
            {detail?.actor.actorEmail ? (
              <span dir="ltr">{detail.actor.actorEmail}</span>
            ) : (
              "پرونده کامل فعالیت این کاربر در سامانه"
            )}
            {detail?.actor.lastSeenAt ? (
              <span className="mt-1 block text-xs">
                آخرین فعالیت: {formatPersianDateTime(detail.actor.lastSeenAt)}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isPending && !detail ? (
            <p className="py-10 text-center text-sm text-muted-foreground">در حال بارگذاری…</p>
          ) : null}

          {error ? (
            <p className="py-10 text-center text-sm text-destructive">{error}</p>
          ) : null}

          {detail ? (
            <>
              <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                <StatChip label="کل رویداد" value={detail.actor.eventCount} icon={Activity} />
                <StatChip label="ورود" value={detail.actor.loginCount} icon={LogIn} />
                <StatChip
                  label="ثبت محتوا"
                  value={detail.actor.contentCreateCount}
                  icon={FileStack}
                />
                <StatChip
                  label="ویرایش"
                  value={detail.actor.contentUpdateCount}
                  icon={FileStack}
                />
                <StatChip
                  label="حذف"
                  value={detail.actor.contentDeleteCount}
                  icon={FileStack}
                />
                <StatChip label="بازدید صفحه" value={detail.actor.pageViewCount} icon={Navigation} />
                <StatChip label="کلیک" value={detail.actor.clickCount} icon={MousePointerClick} />
                <StatChip
                  label="محتوای ثبت‌شده"
                  value={detail.content?.total ?? 0}
                  icon={Radio}
                />
              </section>

              {detail.content && detail.content.total > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">محتوای ثبت‌شده</h3>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_LABELS.filter(({ key }) => {
                      const value = detail.content?.[key];
                      return typeof value === "number" && value > 0;
                    }).map(({ key, label }) => (
                      <Badge key={key} variant="secondary">
                        {label}: {formatPersianNumber(Number(detail.content?.[key] ?? 0))}
                      </Badge>
                    ))}
                  </div>
                </section>
              ) : null}

              {detail.topActions.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">پرتکرارترین اقدامات</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full border-collapse text-sm" style={{ direction: "rtl" }}>
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground">
                          <th className="border-b px-3 py-2 text-right font-medium">اقدام</th>
                          <th className="border-b px-3 py-2 text-right font-medium">دسته</th>
                          <th className="border-b px-3 py-2 text-right font-medium">تعداد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.topActions.map((row) => (
                          <tr key={`${row.category}:${row.action}`} className="border-b last:border-0">
                            <td className="px-3 py-2">{getAuditActionLabel(row.action)}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline">{AUDIT_CATEGORY_LABELS[row.category]}</Badge>
                            </td>
                            <td className="px-3 py-2 font-medium">
                              {formatPersianNumber(row.count)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {detail.topPaths.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">صفحات پربازدید</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full border-collapse text-sm" style={{ direction: "rtl" }}>
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground">
                          <th className="border-b px-3 py-2 text-right font-medium">مسیر</th>
                          <th className="border-b px-3 py-2 text-right font-medium">بازدید</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.topPaths.map((row) => (
                          <tr key={row.path} className="border-b last:border-0">
                            <td className="px-3 py-2 font-mono text-xs" dir="ltr">
                              {row.path}
                            </td>
                            <td className="px-3 py-2">{formatPersianNumber(row.count)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {detail.recentLogins.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">
                    ورودهای اخیر
                    <Badge variant="outline" className="mr-2">
                      {formatPersianNumber(detail.recentLogins.length)}
                    </Badge>
                  </h3>
                  <div className="max-h-40 overflow-y-auto rounded-lg border divide-y">
                    {detail.recentLogins.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span className="text-xs text-muted-foreground">
                          {formatPersianDateTime(event.createdAt)}
                        </span>
                        {event.ipAddress ? (
                          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                            {event.ipAddress}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  رویدادهای اخیر
                  <Badge variant="outline" className="mr-2">
                    {formatPersianNumber(detail.recentEvents.length)}
                  </Badge>
                </h3>
                {detail.recentEvents.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">رویدادی ثبت نشده است.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto rounded-lg border">
                    <table
                      className="w-full border-collapse text-sm"
                      style={{ minWidth: "640px", direction: "rtl" }}
                    >
                      <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm">
                        <tr className="text-muted-foreground">
                          <th className="border-b px-3 py-2 text-right font-medium">زمان</th>
                          <th className="border-b px-3 py-2 text-right font-medium">دسته</th>
                          <th className="border-b px-3 py-2 text-right font-medium">اقدام</th>
                          <th className="border-b px-3 py-2 text-right font-medium">مورد</th>
                          <th className="border-b px-3 py-2 text-right font-medium">توضیح</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.recentEvents.map((event) => (
                          <tr key={event.id} className="border-b last:border-0">
                            <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                              {formatPersianDateTime(event.createdAt)}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline">
                                {AUDIT_CATEGORY_LABELS[event.category]}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {getAuditActionLabel(event.action)}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {getAuditEntityLabel(event.entityType) || "—"}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground max-w-[220px] truncate">
                              {event.label || event.path || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
