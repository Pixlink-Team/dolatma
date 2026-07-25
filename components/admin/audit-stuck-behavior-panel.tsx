"use client";

import { Bug, Lightbulb, TriangleAlert, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAppError } from "@/lib/app-errors/catalog";
import {
  STUCK_SIGNAL_KIND_LABELS,
  type RecentUserError,
  type StuckBehaviorSignal,
} from "@/lib/audit/problem-types";
import { getAuditRoleLabel } from "@/lib/audit/labels";
import { formatPersianDateTime, formatPersianNumber } from "@/lib/utils";

const SEVERITY_BADGE: Record<
  StuckBehaviorSignal["severity"],
  "destructive" | "warning" | "outline"
> = {
  high: "destructive",
  medium: "warning",
  low: "outline",
};

const SEVERITY_LABEL: Record<StuckBehaviorSignal["severity"], string> = {
  high: "بالا",
  medium: "متوسط",
  low: "کم",
};

function resolveName(name?: string | null, email?: string | null) {
  return name?.trim() || email?.trim() || "ناشناس";
}

export function AuditStuckBehaviorPanel({
  signals,
  recentErrors,
}: {
  signals: StuckBehaviorSignal[];
  recentErrors: RecentUserError[];
}) {
  return (
    <div className="space-y-6 text-right" dir="rtl">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="h-4 w-4 text-destructive" />
            خطاهای کاربران (۲۴ ساعت اخیر)
            <Badge variant="destructive">{formatPersianNumber(recentErrors.length)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            هر خطا همراه با توضیح «چرا رخ داده» و «کاربر الان چه کار کند» است تا بتوانید سریع
            راهنمایی یا رفع مشکل کنید.
          </p>
          {recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              خطای ثبت‌شده‌ای در ۲۴ ساعت اخیر نیست.
            </p>
          ) : (
            <div className="space-y-3">
              {recentErrors.map((error) => {
                const guide = resolveAppError(error.message);
                return (
                  <div
                    key={error.id}
                    className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-medium truncate">
                          {resolveName(error.actorName, error.actorEmail)}
                        </span>
                        {error.actorRole ? (
                          <Badge variant="outline">{getAuditRoleLabel(error.actorRole)}</Badge>
                        ) : null}
                        <Badge variant="secondary">{guide.title}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatPersianDateTime(error.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{error.message}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md border bg-background/70 p-2.5">
                        <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Wrench className="h-3.5 w-3.5" />
                          چرا؟
                        </p>
                        <p className="text-xs leading-6 text-muted-foreground">{guide.why}</p>
                      </div>
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5">
                        <p className="mb-1 flex items-center gap-1 text-xs font-medium text-primary">
                          <Lightbulb className="h-3.5 w-3.5" />
                          راه‌حل برای کاربر
                        </p>
                        <p className="text-xs leading-6">{guide.whatToDo}</p>
                      </div>
                    </div>
                    {error.path ? (
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                        {error.path}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-500" />
            هشدار رفتار مشکوک
            <Badge variant="warning">{formatPersianNumber(signals.length)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            تمرکز روی اکشن‌های محتوایی مثل ذخیره، افزودن، ویرایش، بستن و ثبت جدید است.
            اگر کاربر چند بار ذخیره کند و خطا ببیند، اینجا نمایش داده می‌شود.
          </p>
          {signals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              فعلاً هشدار رفتاری ثبت نشده است.
            </p>
          ) : (
            <div className="space-y-3">
              {signals.map((signal) => (
                <div key={signal.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={SEVERITY_BADGE[signal.severity]}>
                        شدت {SEVERITY_LABEL[signal.severity]}
                      </Badge>
                      <Badge variant="outline">{STUCK_SIGNAL_KIND_LABELS[signal.kind]}</Badge>
                      <span className="font-medium">
                        {resolveName(signal.actorName, signal.actorEmail)}
                      </span>
                      {signal.actorRole ? (
                        <Badge variant="outline">{getAuditRoleLabel(signal.actorRole)}</Badge>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatPersianNumber(signal.count)} بار ·{" "}
                      {formatPersianDateTime(signal.lastSeenAt)}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{signal.title}</p>
                  <p className="text-sm text-muted-foreground">{signal.detail}</p>
                  {(signal.path || signal.label) && (
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {signal.label ? <span>جزئیات: {signal.label}</span> : null}
                      {signal.path ? (
                        <span dir="ltr" className="font-mono">
                          {signal.path}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
