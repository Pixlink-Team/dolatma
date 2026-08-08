"use client";
import { taghvimPath, stripTaghvimBase, TAGHVIM_BASE } from "@taghvim/lib/paths";

import clsx from "clsx";
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Map,
  Menu,
  Plus,
  Shield,
  Sun,
  Swords,
  UserCheck,
  UserRound,
  Users,
  X,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreateEventForm } from "@taghvim/components/forms/CreateEventForm";
import { ThemeToggle } from "@taghvim/components/theme/ThemeToggle";
import { IranEmblem } from "@taghvim/components/brand/IranEmblem";
import { IranFlag } from "@taghvim/components/brand/IranFlag";
import { getAgenciesByIds } from "@taghvim/lib/agency-store";
import { getSiteBranding } from "@taghvim/lib/branding";
import { getCurrentUser, refreshCurrentUser } from "@taghvim/lib/auth";
import {
  canViewAdminViews,
  ROLE_LABELS,
  userHasPermission,
  type AdminUser,
} from "@taghvim/types/auth";

const MENU = [
  { href: taghvimPath("/overview"), label: "نمای کلی", icon: LayoutDashboard, match: "overview" },
  { href: taghvimPath("/timeline?view=timeline"), label: "خط زمانی", icon: CalendarRange, match: "timeline" },
  { href: taghvimPath("/timeline?view=day"), label: "نمای روزانه", icon: Sun, match: "day" },
  { href: taghvimPath("/timeline?view=week"), label: "نمای هفتگی", icon: CalendarDays, match: "week" },
  { href: taghvimPath("/timeline?view=month"), label: "نمای ماهانه", icon: CalendarDays, match: "month" },
  { href: taghvimPath("/timeline?view=map"), label: "نقشه رویدادها", icon: Map, match: "map" },
  { href: taghvimPath("/timeline?view=analytics"), label: "آمار و نمودارها", icon: BarChart3, match: "analytics" },
] as const;

type AppSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  stats: {
    totalEvents: number;
    enemy: number;
    government: number;
    activeUsers: number;
  };
};

export function AppSidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  stats,
}: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "timeline";
  const [branding, setBranding] = useState(() => getSiteBranding());
  const [showAdminViews, setShowAdminViews] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [canManageSubusers, setCanManageSubusers] = useState(false);
  const [canCreateEvent, setCanCreateEvent] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setBranding(getSiteBranding());
    void (async () => {
      const current = (await refreshCurrentUser()) ?? getCurrentUser();
      setUser(current);
      setShowAdminViews(canViewAdminViews(current));
      setShowAdminPanel(
        userHasPermission(current, "manage_users") ||
          userHasPermission(current, "manage_subusers") ||
          current?.role === "super_admin",
      );
      setCanManageSubusers(userHasPermission(current, "manage_subusers"));
      setCanCreateEvent(userHasPermission(current, "manage_content"));
    })();
  }, []);

  useEffect(() => {
    onCloseMobile();
    // Close on route/view change only — not when onCloseMobile identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, view]);

  const agencyLabel = useMemo(() => {
    if (!user) return null;
    if (user.role === "super_admin" && (user.agencyIds?.length ?? 0) === 0) {
      return "همه وزارتخانه‌ها";
    }
    const agencies = getAgenciesByIds(user.agencyIds ?? []);
    if (agencies.length === 0) return null;
    return agencies.map((a) => a.shortName).join(" · ");
  }, [user]);

  const content = (
    <div
      className={clsx(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]",
        collapsed ? "w-[72px]" : "w-[240px]",
      )}
    >
      <div
        className={clsx(
          "border-b border-[var(--border)] px-3 py-4",
          collapsed
            ? "flex flex-col items-center gap-2"
            : "flex items-start justify-between gap-2",
        )}
      >
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--hover)]">
                <IranEmblem className="h-6 w-6 text-[var(--logo)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {branding.siteTitle}
                </p>
                <p className="text-[10px] leading-4 text-[var(--text-secondary)]">
                  {branding.siteTagline}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--panel-2)] px-2 py-1.5">
              <IranFlag className="h-4 w-6 shrink-0" />
              <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                {branding.siteSlogan || "دولت پای کار مردم"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--hover)]">
            <IranEmblem className="h-7 w-7 text-[var(--logo)]" />
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] lg:inline-flex"
          aria-label={collapsed ? "باز کردن منو" : "جمع کردن منو"}
        >
          {collapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="inline-flex rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] lg:hidden"
          aria-label="بستن منو"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
        {showAdminViews
          ? MENU.map((item) => {
              const active =
                item.match === "overview"
                  ? stripTaghvimBase(pathname).startsWith("/overview")
                  : item.match === "timeline"
                    ? stripTaghvimBase(pathname).startsWith("/timeline") && view === "timeline"
                    : stripTaghvimBase(pathname).startsWith("/timeline") && view === item.match;
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  scroll={false}
                  replace={
                    stripTaghvimBase(pathname).startsWith("/timeline") &&
                    item.href.startsWith(taghvimPath("/timeline"))
                  }
                  className={clsx(
                    "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] transition",
                    active
                      ? "bg-blue-500/15 font-medium text-[var(--primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]",
                    collapsed && "justify-center px-2",
                  )}
                  title={item.label}
                >
                  {active ? (
                    <span className="absolute inset-y-2 right-0 w-[3px] rounded-full bg-[var(--primary)]" />
                  ) : null}
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })
          : null}

        <Link
          href={taghvimPath("/my-content")}
          className={clsx(
            "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] transition",
            stripTaghvimBase(pathname).startsWith("/my-content")
              ? "bg-blue-500/15 font-medium text-[var(--primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--hover)]",
            collapsed && "justify-center px-2",
          )}
        >
          <FileText className="h-4 w-4 shrink-0" />
          {!collapsed ? <span>محتوای من</span> : null}
        </Link>

        {canManageSubusers ? (
          <Link
            href={taghvimPath("/my-subusers")}
            className={clsx(
              "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] transition",
              stripTaghvimBase(pathname).startsWith("/my-subusers")
                ? "bg-blue-500/15 font-medium text-[var(--primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--hover)]",
              collapsed && "justify-center px-2",
            )}
            title="زیردستان من"
          >
            <Users className="h-4 w-4 shrink-0" />
            {!collapsed ? <span>زیردستان من</span> : null}
          </Link>
        ) : null}

        {showAdminPanel ? (
          <Link
            href={taghvimPath("/admin")}
            className={clsx(
              "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--hover)]",
              collapsed && "justify-center px-2",
            )}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed ? <span>پنل ادمین</span> : null}
          </Link>
        ) : null}
      </nav>

      <div className="mt-auto shrink-0 space-y-3 border-t border-[var(--border)] p-3">
        {canCreateEvent ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={clsx(
              "flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white shadow-sm transition hover:bg-blue-500",
              collapsed ? "h-11 px-0" : "px-3 py-2.5 text-sm",
            )}
            aria-label="ثبت رویداد"
            title="ثبت رویداد"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed ? <span>ثبت رویداد</span> : null}
          </button>
        ) : null}

        <ThemeToggle className="w-full justify-center" compact={collapsed} />

        {!collapsed ? (
          <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
            <StatRow
              icon={<Activity className="h-3.5 w-3.5" />}
              label="کل رویدادها"
              value={stats.totalEvents}
              color="var(--text-primary)"
            />
            <StatRow
              icon={<Swords className="h-3.5 w-3.5" />}
              label="اقدامات دشمن"
              value={stats.enemy}
              color="#EF4444"
            />
            <StatRow
              icon={<Shield className="h-3.5 w-3.5" />}
              label="اقدامات دولت"
              value={stats.government}
              color="#3B82F6"
            />
            <StatRow
              icon={<UserCheck className="h-3.5 w-3.5" />}
              label="کاربران فعال"
              value={stats.activeUsers}
              color="#22C55E"
            />
          </div>
        ) : null}

        <Link
          href={user ? taghvimPath("/admin") : taghvimPath("/")}
          className={clsx(
            "flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] transition hover:bg-[var(--hover)]",
            collapsed ? "justify-center p-2" : "px-2.5 py-2",
          )}
          aria-label={user ? "رفتن به داشبورد" : "ورود به داشبورد"}
          title={
            user
              ? [user.name, ROLE_LABELS[user.role], agencyLabel]
                  .filter(Boolean)
                  .join(" — ")
              : "ورود"
          }
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
            {user?.name?.trim().charAt(0) || "ک"}
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1 text-xs">
              <p className="truncate font-semibold text-[var(--text-primary)]">
                {user?.name ?? "ورود"}
              </p>
              <p className="truncate text-[var(--text-secondary)]">
                {user ? ROLE_LABELS[user.role] : "داشبورد"}
              </p>
              {agencyLabel ? (
                <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
                  {agencyLabel}
                </p>
              ) : null}
            </div>
          ) : null}
          {!collapsed ? (
            <UserRound className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
          ) : null}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-full shrink-0 lg:block">{content}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay)]"
            aria-label="بستن پس‌زمینه منو"
            onClick={onCloseMobile}
          />
          <div className="absolute inset-y-3 right-3 w-[min(280px,calc(100vw-1.5rem))] shadow-2xl">
            {content}
          </div>
        </div>
      ) : null}

      {canCreateEvent ? (
        <CreateEventForm
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
    </>
  );
}

function StatRow({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
        <span style={{ color }}>{icon}</span>
        {label}
      </span>
      <span className="font-bold tabular-nums" style={{ color }}>
        {value.toLocaleString("fa-IR")}
      </span>
    </div>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-target inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-2.5 text-[var(--text-primary)] lg:hidden"
      aria-label="باز کردن منو"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
