"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileStack,
  Loader2,
  LogIn,
  MousePointerClick,
  Navigation,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAuditCalendarMonthAction,
  getAuditDayDetailAction,
} from "@/lib/actions/audit-calendar-actions";
import {
  AUDIT_CATEGORY_LABELS,
  getAuditActionLabel,
  getAuditEntityLabel,
  getAuditRoleLabel,
} from "@/lib/audit/labels";
import type {
  AuditActorSummary,
  AuditCategory,
  AuditDailyPoint,
  AuditDayDetail,
  AuditEvent,
} from "@/lib/audit/types";
import {
  getPersianMonthName,
  isoToJalaali,
  jalaaliMonthLength,
  jalaaliToISO,
} from "@/lib/jalali";
import { getTehranCalendarDateIso } from "@/lib/safe-dates";
import {
  cn,
  formatPersianDate,
  formatPersianDateTime,
  formatPersianNumber,
} from "@/lib/utils";

const WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

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

function persianWeekdayIndex(isoDate: string): number {
  // JS Sunday=0 … Saturday=6 → Persian Saturday=0 … Friday=6
  const jsDay = new Date(`${isoDate}T12:00:00+03:30`).getUTCDay();
  return (jsDay + 1) % 7;
}

function resolveUserDisplay(name?: string | null, email?: string | null) {
  const displayName = name?.trim() || email?.trim() || "ناشناس";
  const showEmail = Boolean(email?.trim() && email.trim() !== displayName);
  return { displayName, showEmail, email: email?.trim() || null };
}

function intensityClass(total: number): string {
  if (total <= 0) return "";
  if (total < 10) return "bg-primary/10 hover:bg-primary/15";
  if (total < 40) return "bg-primary/20 hover:bg-primary/25";
  if (total < 100) return "bg-primary/30 hover:bg-primary/35";
  return "bg-primary/45 hover:bg-primary/50 text-primary-foreground";
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5 flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight">{formatPersianNumber(value)}</p>
      </div>
    </div>
  );
}

function UserCell({ name, email }: { name?: string | null; email?: string | null }) {
  const { displayName, showEmail, email: resolvedEmail } = resolveUserDisplay(name, email);
  return (
    <div className="min-w-0 text-right">
      <div className="font-medium truncate" title={displayName}>
        {displayName}
      </div>
      {showEmail && resolvedEmail && (
        <div className="text-xs text-muted-foreground truncate" dir="ltr" title={resolvedEmail}>
          {resolvedEmail}
        </div>
      )}
    </div>
  );
}

export function AuditCalendarPanel() {
  const todayIso = getTehranCalendarDateIso();
  const todayJalali = isoToJalaali(todayIso);

  const [viewYear, setViewYear] = useState(todayJalali.jy);
  const [viewMonth, setViewMonth] = useState(todayJalali.jm);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [monthSeries, setMonthSeries] = useState<AuditDailyPoint[]>([]);
  const [dayDetail, setDayDetail] = useState<AuditDayDetail | null>(null);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);
  const [isMonthPending, startMonthTransition] = useTransition();
  const [isDayPending, startDayTransition] = useTransition();

  const daysInMonth = jalaaliMonthLength(viewYear, viewMonth);
  const firstDayIso = jalaaliToISO(viewYear, viewMonth, 1);
  const leadingEmpty = persianWeekdayIndex(firstDayIso);

  const seriesByDate = useMemo(() => {
    const map = new Map<string, AuditDailyPoint>();
    for (const point of monthSeries) {
      map.set(point.date, point);
    }
    return map;
  }, [monthSeries]);

  const calendarCells = useMemo(() => {
    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push({ day: null, iso: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, iso: jalaaliToISO(viewYear, viewMonth, day) });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, iso: null });
    }
    return cells;
  }, [daysInMonth, leadingEmpty, viewMonth, viewYear]);

  useEffect(() => {
    startMonthTransition(async () => {
      setMonthError(null);
      const result = await getAuditCalendarMonthAction(viewYear, viewMonth);
      if (!result.success || !result.data) {
        setMonthSeries([]);
        setMonthError(result.error ?? "بارگذاری ماه ناموفق بود");
        return;
      }
      setMonthSeries(result.data);
    });
  }, [viewMonth, viewYear]);

  useEffect(() => {
    startDayTransition(async () => {
      setDayError(null);
      const result = await getAuditDayDetailAction(selectedDate);
      if (!result.success || !result.data) {
        setDayDetail(null);
        setDayError(result.error ?? "بارگذاری روز ناموفق بود");
        return;
      }
      setDayDetail(result.data);
    });
  }, [selectedDate]);

  const goToPreviousMonth = () => {
    if (viewMonth === 1) {
      setViewYear((year) => year - 1);
      setViewMonth(12);
      return;
    }
    setViewMonth((month) => month - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((year) => year + 1);
      setViewMonth(1);
      return;
    }
    setViewMonth((month) => month + 1);
  };

  const goToToday = () => {
    setViewYear(todayJalali.jy);
    setViewMonth(todayJalali.jm);
    setSelectedDate(todayIso);
  };

  const groupedLogins = useMemo(() => groupLogins(dayDetail?.logins ?? []), [dayDetail?.logins]);
  const groupedFailed = useMemo(
    () => groupFailedLogins(dayDetail?.failedLogins ?? []),
    [dayDetail?.failedLogins]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,380px)_1fr] gap-4">
        <Card>
          <CardHeader className="pb-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                تقویم فعالیت
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={goToToday}>
                امروز
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToNextMonth}
                aria-label="ماه بعد"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium">
                {getPersianMonthName(viewMonth)} {formatPersianNumber(viewYear)}
                {isMonthPending && (
                  <Loader2 className="inline-block mr-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToPreviousMonth}
                aria-label="ماه قبل"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {monthError && (
              <p className="text-sm text-destructive text-center py-2">{monthError}</p>
            )}
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1 font-medium">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, index) => {
                if (!cell.iso || cell.day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }
                const point = seriesByDate.get(cell.iso);
                const total = point?.total ?? 0;
                const isSelected = cell.iso === selectedDate;
                const isToday = cell.iso === todayIso;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelectedDate(cell.iso!)}
                    className={cn(
                      "aspect-square rounded-md border text-sm transition-colors flex flex-col items-center justify-center gap-0.5",
                      intensityClass(total),
                      isSelected && "ring-2 ring-primary border-primary",
                      isToday && !isSelected && "border-primary/60",
                      total === 0 && "hover:bg-muted/60"
                    )}
                    title={
                      total > 0
                        ? `${formatPersianNumber(total)} رویداد`
                        : "بدون رویداد"
                    }
                  >
                    <span className="leading-none">{formatPersianNumber(cell.day)}</span>
                    {total > 0 && (
                      <span className="text-[10px] leading-none opacity-80">
                        {formatPersianNumber(total)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center pt-1">
              رنگ پررنگ‌تر یعنی فعالیت بیشتر در آن روز
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              جزئیات روز
              <Badge variant="outline">{formatPersianDate(selectedDate)}</Badge>
              {isDayPending && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {dayError && <p className="text-sm text-destructive">{dayError}</p>}

            {!dayDetail && !dayError && isDayPending && (
              <p className="text-sm text-muted-foreground py-8 text-center">در حال بارگذاری…</p>
            )}

            {dayDetail && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  <MiniStat label="کاربران فعال" value={dayDetail.summary.uniqueUsers} icon={Users} />
                  <MiniStat label="ورود" value={dayDetail.summary.logins} icon={LogIn} />
                  <MiniStat
                    label="تغییر محتوا"
                    value={dayDetail.summary.contentChanges}
                    icon={FileStack}
                  />
                  <MiniStat label="بازدید" value={dayDetail.summary.pageViews} icon={Navigation} />
                  <MiniStat label="کلیک" value={dayDetail.summary.clicks} icon={MousePointerClick} />
                  <MiniStat
                    label="ورود ناموفق"
                    value={dayDetail.summary.failedLogins}
                    icon={ShieldAlert}
                  />
                </div>

                <section className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <LogIn className="h-4 w-4 text-primary" />
                    چه کسانی وارد شده‌اند
                    <Badge variant="outline">
                      {formatPersianNumber(groupedLogins.length)}
                    </Badge>
                  </h3>
                  {groupedLogins.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">
                      در این روز ورودی ثبت نشده است.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto">
                      {groupedLogins.map(({ event, loginCount }) => (
                        <div
                          key={event.id}
                          className="rounded-lg border px-3 py-2.5 flex items-start gap-2"
                        >
                          <LogIn className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate text-sm">
                                {
                                  resolveUserDisplay(event.actorName, event.actorEmail)
                                    .displayName
                                }
                              </p>
                              <Badge variant="outline" className="shrink-0 text-[10px]">
                                {getAuditRoleLabel(event.actorRole)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              آخرین ورود: {formatPersianDateTime(event.createdAt)}
                            </p>
                            {loginCount > 1 && (
                              <p className="text-xs text-primary mt-0.5">
                                {formatPersianNumber(loginCount)} بار وارد شده
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {groupedFailed.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-destructive">
                      <ShieldAlert className="h-4 w-4" />
                      ورودهای ناموفق
                      <Badge variant="destructive">
                        {formatPersianNumber(groupedFailed.length)}
                      </Badge>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
                      {groupedFailed.map(({ event, attempts, enteredEmail, ip }) => (
                        <div
                          key={event.id}
                          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5"
                        >
                          <p className="font-medium truncate text-sm" dir="ltr">
                            {enteredEmail?.trim() || "بدون نام کاربری"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            آخرین تلاش: {formatPersianDateTime(event.createdAt)}
                          </p>
                          {attempts > 1 && (
                            <p className="text-xs text-destructive mt-0.5">
                              {formatPersianNumber(attempts)} تلاش ناموفق
                            </p>
                          )}
                          {ip && (
                            <p className="text-xs font-mono text-muted-foreground mt-0.5" dir="ltr">
                              {ip}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    کاربران فعال در این روز
                    <Badge variant="outline">
                      {formatPersianNumber(dayDetail.actors.length)}
                    </Badge>
                  </h3>
                  <DayActorsTable actors={dayDetail.actors} />
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-medium">
                    رویدادهای روز
                    <Badge variant="outline" className="mr-2">
                      {formatPersianNumber(dayDetail.events.length)}
                    </Badge>
                  </h3>
                  <DayEventsTable events={dayDetail.events} />
                </section>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function groupLogins(events: AuditEvent[]) {
  const groups = new Map<string, { event: AuditEvent; loginCount: number }>();
  for (const event of events) {
    const key = event.actorEmail?.trim().toLowerCase() || event.actorName?.trim() || event.id;
    const existing = groups.get(key);
    if (existing) {
      existing.loginCount += 1;
      if (new Date(event.createdAt) > new Date(existing.event.createdAt)) {
        existing.event = event;
      }
    } else {
      groups.set(key, { event, loginCount: 1 });
    }
  }
  return Array.from(groups.values());
}

function groupFailedLogins(events: AuditEvent[]) {
  const groups = new Map<
    string,
    { event: AuditEvent; attempts: number; enteredEmail: string | null; ip: string | null }
  >();
  for (const event of events) {
    const enteredEmail =
      (typeof event.metadata?.email === "string" ? event.metadata.email : null) ||
      event.actorEmail;
    const ip =
      (typeof event.metadata?.ip === "string" ? event.metadata.ip : null) || event.ipAddress;
    const key = `${enteredEmail?.trim().toLowerCase() || "empty"}|${ip ?? "unknown"}`;
    const existing = groups.get(key);
    if (existing) {
      existing.attempts += 1;
      if (new Date(event.createdAt) > new Date(existing.event.createdAt)) {
        existing.event = event;
      }
    } else {
      groups.set(key, { event, attempts: 1, enteredEmail, ip });
    }
  }
  return Array.from(groups.values());
}

function DayActorsTable({ actors }: { actors: AuditActorSummary[] }) {
  if (actors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-3">در این روز فعالیت کاربری ثبت نشده است.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm" style={{ minWidth: "640px", direction: "rtl" }}>
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th className="border-b px-3 py-2.5 text-right font-medium">کاربر</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">نقش</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">رویداد</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">ورود</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">ثبت</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">ویرایش</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">بازدید</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">کلیک</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">آخرین فعالیت</th>
          </tr>
        </thead>
        <tbody>
          {actors.map((actor) => (
            <tr key={actor.actorKey} className="border-b last:border-0">
              <td className="px-3 py-2.5">
                <UserCell name={actor.actorName} email={actor.actorEmail} />
              </td>
              <td className="px-3 py-2.5">
                <Badge variant="outline">{getAuditRoleLabel(actor.actorRole)}</Badge>
              </td>
              <td className="px-3 py-2.5 font-semibold">
                {formatPersianNumber(actor.eventCount)}
              </td>
              <td className="px-3 py-2.5">{formatPersianNumber(actor.loginCount)}</td>
              <td className="px-3 py-2.5">{formatPersianNumber(actor.contentCreateCount)}</td>
              <td className="px-3 py-2.5">{formatPersianNumber(actor.contentUpdateCount)}</td>
              <td className="px-3 py-2.5">{formatPersianNumber(actor.pageViewCount)}</td>
              <td className="px-3 py-2.5">{formatPersianNumber(actor.clickCount)}</td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                {actor.lastSeenAt ? formatPersianDateTime(actor.lastSeenAt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayEventsTable({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground py-3">رویدادی در این روز ثبت نشده است.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth: "720px", direction: "rtl" }}>
        <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm">
          <tr className="text-muted-foreground">
            <th className="border-b px-3 py-2.5 text-right font-medium">زمان</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">کاربر</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">دسته</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">اقدام</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">مورد</th>
            <th className="border-b px-3 py-2.5 text-right font-medium">توضیح</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b last:border-0">
              <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                {formatPersianDateTime(event.createdAt)}
              </td>
              <td className="px-3 py-2.5">
                <UserCell name={event.actorName} email={event.actorEmail} />
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={CATEGORY_BADGE_VARIANT[event.category]}>
                  {AUDIT_CATEGORY_LABELS[event.category]}
                </Badge>
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                {getAuditActionLabel(event.action)}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                {getAuditEntityLabel(event.entityType)}
              </td>
              <td className="px-3 py-2.5 max-w-[240px]">
                <span className="line-clamp-2 break-words">
                  {event.label?.trim() || event.path || "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
