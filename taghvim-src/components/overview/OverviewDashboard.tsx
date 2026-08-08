"use client";
import { taghvimPath, stripTaghvimBase, TAGHVIM_BASE } from "@taghvim/lib/paths";

import { EventIntensityPanel } from "@taghvim/components/timeline/EventIntensityPanel";
import { buildAnalyticsModel } from "@taghvim/lib/analytics";
import {
  getPersianYmd,
  monthLabel,
  shiftPersianMonth,
} from "@taghvim/lib/monthly";
import {
  WEEKDAY_LABELS,
  buildPersianCalendarCells,
  todayGregorianString,
} from "@taghvim/lib/persian-date";
import { intensityColor, intensityLabel } from "@taghvim/lib/timeline";
import { getCurrentUser } from "@taghvim/lib/auth";
import { ROLE_LABELS } from "@taghvim/types/auth";
import type { AdminUser } from "@taghvim/types/auth";
import type { TimelineDay } from "@taghvim/types/timeline";
import clsx from "clsx";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bug,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Map as MapIcon,
  Shield,
  Sun,
  Timer,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type OverviewDashboardProps = {
  days: TimelineDay[];
};

const VIEW_LINKS = [
  {
    href: taghvimPath("/timeline?view=day"),
    label: "نمای روزانه",
    hint: "جزئیات یک روز",
    icon: Sun,
    accent: "from-amber-500/20 to-orange-500/5",
    iconColor: "text-amber-500",
  },
  {
    href: taghvimPath("/timeline?view=week"),
    label: "نمای هفتگی",
    hint: "هفت روز در یک نگاه",
    icon: CalendarDays,
    accent: "from-sky-500/20 to-cyan-500/5",
    iconColor: "text-sky-500",
  },
  {
    href: taghvimPath("/timeline?view=month"),
    label: "نمای ماهانه",
    hint: "تقویم ماهانه",
    icon: CalendarRange,
    accent: "from-emerald-500/20 to-teal-500/5",
    iconColor: "text-emerald-500",
  },
  {
    href: taghvimPath("/timeline?view=timeline"),
    label: "خط زمانی",
    hint: "فید کامل رویدادها",
    icon: Activity,
    accent: "from-blue-500/20 to-indigo-500/5",
    iconColor: "text-blue-500",
  },
  {
    href: taghvimPath("/timeline?view=analytics"),
    label: "آمار و نمودارها",
    hint: "تحلیل و روندها",
    icon: BarChart3,
    accent: "from-violet-500/15 to-fuchsia-500/5",
    iconColor: "text-violet-400",
  },
  {
    href: taghvimPath("/timeline?view=map"),
    label: "نقشه رویدادها",
    hint: "تمرکز جغرافیایی",
    icon: MapIcon,
    accent: "from-rose-500/15 to-red-500/5",
    iconColor: "text-rose-400",
  },
] as const;

export function OverviewDashboard({ days }: OverviewDashboardProps) {
  const router = useRouter();
  const model = useMemo(() => buildAnalyticsModel(days), [days]);
  const byDate = useMemo(
    () => new Map(days.map((d) => [d.date, d])),
    [days],
  );
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const latest = days[0] ?? null;
  const initial = getPersianYmd(latest?.date ?? todayGregorianString());
  const [cursorYear, setCursorYear] = useState(initial.year);
  const [cursorMonth, setCursorMonth] = useState(initial.month);
  const [activeDate, setActiveDate] = useState<string | null>(
    latest?.date ?? null,
  );

  const cells = useMemo(
    () => buildPersianCalendarCells(cursorYear, cursorMonth),
    [cursorYear, cursorMonth],
  );

  const today = todayGregorianString();
  const activeDay = activeDate ? byDate.get(activeDate) ?? null : null;

  const openDay = (date: string) => {
    setActiveDate(date);
    router.push(`/timeline?date=${date}&view=day`);
  };

  return (
    <div className="space-y-5" style={{ direction: "rtl" }}>
      <header className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(37,99,235,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(220,38,38,0.10), transparent 50%)",
          }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 text-xs font-medium text-[var(--primary)]">
              داشبورد عملیاتی
            </p>
            <h1 className="mt-1 mb-0 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              نمای کلی
            </h1>
            <p className="mt-2 mb-0 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
              خلاصه وضعیت، میانبر نماها و تقویم تعاملی — روی هر روز بزنید تا
              جزئیات همان تاریخ باز شود.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <p className="m-0 text-[11px] tabular-nums text-[var(--text-muted)]">
              بازه: {model.rangeLabel}
            </p>
            {user ? (
              <Link
                href={taghvimPath("/admin")}
                className="inline-flex items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/90 px-3 py-2 transition hover:border-[var(--primary)]/40 hover:bg-[var(--hover)]"
                title="رفتن به داشبورد"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                  {user.name.trim().charAt(0) || "ک"}
                </div>
                <div className="min-w-0 text-right">
                  <p className="m-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                    {user.name}
                  </p>
                  <p className="m-0 text-[11px] text-[var(--text-secondary)]">
                    {ROLE_LABELS[user.role]} · داشبورد
                  </p>
                </div>
                <LayoutDashboard className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </Link>
            ) : (
              <Link
                href={taghvimPath("/admin/login")}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/90 px-3 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--hover)]"
              >
                <UserRound className="h-4 w-4 text-[var(--text-muted)]" />
                ورود به داشبورد
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {VIEW_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br p-4 transition",
                item.accent,
                "hover:border-[var(--primary)]/35 hover:shadow-lg hover:shadow-blue-500/5",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)]/80">
                  <Icon className={clsx("h-5 w-5", item.iconColor)} />
                </div>
                <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] transition group-hover:text-[var(--primary)]" />
              </div>
              <h2 className="mt-4 mb-0 text-base font-bold text-[var(--text-primary)]">
                {item.label}
              </h2>
              <p className="mt-1 mb-0 text-xs text-[var(--text-secondary)]">
                {item.hint}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="کل رویدادها"
          value={model.totalEvents.toLocaleString("fa-IR")}
          hint={`${model.activeDays.toLocaleString("fa-IR")} روز فعال`}
          icon={Activity}
        />
        <StatCard
          label="اقدام دشمن"
          value={model.enemy.toLocaleString("fa-IR")}
          hint={`${model.typeShare.enemy.toLocaleString("fa-IR")}٪ از کل`}
          icon={Bug}
          tone="enemy"
        />
        <StatCard
          label="اقدام دولت"
          value={model.government.toLocaleString("fa-IR")}
          hint={`${model.typeShare.government.toLocaleString("fa-IR")}٪ از کل`}
          icon={Shield}
          tone="gov"
        />
        <StatCard
          label="نرخ پاسخ"
          value={`${model.responseRatio.toLocaleString("fa-IR")}٪`}
          hint={`بدون پاسخ: ${model.unanswered.toLocaleString("fa-IR")}`}
          icon={Timer}
          tone="cyan"
        />
        <StatCard
          label="میانگین واکنش"
          value={model.avgResponseLabel}
          hint="از اقدام دشمن تا پاسخ"
          icon={Timer}
        />
        <StatCard
          label="روزهای بحرانی"
          value={model.criticalDays.toLocaleString("fa-IR")}
          hint={`${model.verifiedShare.toLocaleString("fa-IR")}٪ تأیید/انتشار`}
          icon={Activity}
          tone="enemy"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="m-0 text-sm font-bold text-[var(--text-primary)]">
                تقویم ماهانه
              </h3>
              <p className="m-0 mt-0.5 text-[11px] text-[var(--text-muted)]">
                روی هر روز کلیک کنید تا نمای روزانه باز شود
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
                onClick={() => {
                  const next = shiftPersianMonth(cursorYear, cursorMonth, -1);
                  setCursorYear(next.year);
                  setCursorMonth(next.month);
                }}
                aria-label="ماه قبل"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <p className="m-0 min-w-[120px] text-center text-sm font-semibold text-[var(--text-primary)]">
                {monthLabel(cursorYear, cursorMonth)}
              </p>
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
                onClick={() => {
                  const next = shiftPersianMonth(cursorYear, cursorMonth, 1);
                  setCursorYear(next.year);
                  setCursorMonth(next.month);
                }}
                aria-label="ماه بعد"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] text-[var(--text-muted)]">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell) => {
              if (!cell.inMonth || !cell.date || cell.day == null) {
                return <span key={cell.key} className="aspect-square" />;
              }

              const day = byDate.get(cell.date);
              const hasData = !!day && day.totalEvents > 0;
              const isToday = cell.date === today;
              const isActive = cell.date === activeDate;
              const tone = day ? intensityColor(day.intensity) : undefined;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => openDay(cell.date!)}
                  title={
                    day
                      ? `${day.persianDate} — ${day.totalEvents} رویداد`
                      : cell.date
                  }
                  className={clsx(
                    "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-[12px] font-semibold transition",
                    isActive
                      ? "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-600/25"
                      : hasData
                        ? "border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-primary)] hover:border-[var(--primary)]/40"
                        : "border-transparent text-[var(--text-muted)] hover:bg-[var(--hover)]",
                    isToday && !isActive && "ring-1 ring-[var(--primary)]/50",
                  )}
                >
                  <span className="tabular-nums">
                    {cell.day.toLocaleString("fa-IR")}
                  </span>
                  {hasData && !isActive ? (
                    <span
                      className="mt-0.5 h-1.5 w-1.5 rounded-full"
                      style={{ background: tone }}
                    />
                  ) : null}
                  {hasData && isActive ? (
                    <span className="mt-0.5 text-[9px] font-medium opacity-90">
                      {day!.totalEvents.toLocaleString("fa-IR")}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5">
            <h3 className="m-0 text-sm font-bold text-[var(--text-primary)]">
              روز انتخاب‌شده
            </h3>
            {activeDay ? (
              <div className="mt-3 space-y-3">
                <p className="m-0 text-base font-semibold text-[var(--text-primary)]">
                  {activeDay.weekday}، {activeDay.persianDate}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <MiniMetric
                    label="رویداد"
                    value={activeDay.totalEvents.toLocaleString("fa-IR")}
                  />
                  <MiniMetric
                    label="دشمن"
                    value={activeDay.enemyActionsCount.toLocaleString("fa-IR")}
                    tone="enemy"
                  />
                  <MiniMetric
                    label="دولت"
                    value={activeDay.governmentActionsCount.toLocaleString(
                      "fa-IR",
                    )}
                    tone="gov"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2">
                  <span className="text-xs text-[var(--text-secondary)]">
                    شدت روز
                  </span>
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-bold text-white"
                    style={{ background: intensityColor(activeDay.intensity) }}
                  >
                    {intensityLabel(activeDay.intensity)} ·{" "}
                    {activeDay.intensity.toLocaleString("fa-IR")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openDay(activeDay.date)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  باز کردن نمای روزانه
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="mt-3 mb-0 text-sm text-[var(--text-secondary)]">
                روزی از تقویم انتخاب نشده است.
              </p>
            )}
          </article>

          <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5">
            <h3 className="m-0 text-sm font-bold text-[var(--text-primary)]">
              روزهای پرشدت
            </h3>
            <ul className="mt-3 space-y-2">
              {model.topCriticalDays.slice(0, 5).map((row) => (
                <li key={row.date}>
                  <button
                    type="button"
                    onClick={() => openDay(row.date)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-right transition hover:border-[var(--primary)]/35"
                  >
                    <div className="min-w-0">
                      <p className="m-0 truncate text-xs font-semibold text-[var(--text-primary)]">
                        {row.persianDate}
                      </p>
                      <p className="m-0 mt-0.5 text-[10px] text-[var(--text-muted)]">
                        {row.totalEvents.toLocaleString("fa-IR")} رویداد
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: intensityColor(row.intensity) }}
                    >
                      {row.intensity.toLocaleString("fa-IR")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 sm:p-4">
        <div className="mb-3 px-1">
          <h3 className="m-0 text-sm font-bold text-[var(--text-primary)]">
            شدت رویدادها
          </h3>
          <p className="m-0 mt-0.5 text-[11px] text-[var(--text-muted)]">
            روی هر میله بزنید تا همان روز باز شود
          </p>
        </div>
        <EventIntensityPanel
          days={days}
          activeDate={activeDate}
          onSelectDay={openDay}
          className="border-0 bg-transparent px-0"
        />
      </article>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Activity;
  tone?: "enemy" | "gov" | "cyan";
}) {
  const toneClass =
    tone === "enemy"
      ? "border-[var(--enemy-border)] bg-[var(--enemy-soft)]"
      : tone === "gov"
        ? "border-[var(--government-border)] bg-[var(--government-soft)]"
        : tone === "cyan"
          ? "border-cyan-500/25 bg-cyan-500/5"
          : "border-[var(--border)] bg-[var(--panel)]";

  return (
    <div className={clsx("rounded-2xl border p-4", toneClass)}>
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 text-xs text-[var(--text-secondary)]">{label}</p>
        <Icon className="h-4 w-4 text-[var(--text-muted)]" />
      </div>
      <p className="mt-2 mb-0 text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1 mb-0 text-[11px] text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "enemy" | "gov";
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-2 py-2 text-center">
      <p className="m-0 text-[10px] text-[var(--text-muted)]">{label}</p>
      <p
        className={clsx(
          "mt-1 mb-0 text-sm font-bold tabular-nums",
          tone === "enemy"
            ? "text-[var(--enemy)]"
            : tone === "gov"
              ? "text-[var(--government)]"
              : "text-[var(--text-primary)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
