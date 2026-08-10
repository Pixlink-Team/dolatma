"use client";
import { taghvimPath, stripTaghvimBase } from "@taghvim/lib/paths";

import clsx from "clsx";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CalendarRange,
  FileText,
  LayoutDashboard,
  Map,
  Menu,
  Plus,
  Shield,
  Sun,
  Swords,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreateEventForm } from "@taghvim/components/forms/CreateEventForm";
import { getAgenciesByIds } from "@taghvim/lib/agency-store";
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
  { href: taghvimPath("/timeline?view=day"), label: "روزانه", icon: Sun, match: "day" },
  { href: taghvimPath("/timeline?view=week"), label: "هفتگی", icon: CalendarDays, match: "week" },
  { href: taghvimPath("/timeline?view=month"), label: "ماهانه", icon: CalendarDays, match: "month" },
  { href: taghvimPath("/timeline?view=map"), label: "نقشه", icon: Map, match: "map" },
  { href: taghvimPath("/timeline?view=analytics"), label: "آمار", icon: BarChart3, match: "analytics" },
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

function isMenuActive(
  match: (typeof MENU)[number]["match"],
  pathname: string,
  view: string,
) {
  if (match === "overview") {
    return stripTaghvimBase(pathname).startsWith("/overview");
  }
  if (match === "timeline") {
    return (
      stripTaghvimBase(pathname).startsWith("/timeline") && view === "timeline"
    );
  }
  return (
    stripTaghvimBase(pathname).startsWith("/timeline") && view === match
  );
}

export function AppSidebar({
  collapsed: _collapsed,
  mobileOpen,
  onToggleCollapse: _onToggleCollapse,
  onCloseMobile,
  stats,
}: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "timeline";
  const [showAdminViews, setShowAdminViews] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [canManageSubusers, setCanManageSubusers] = useState(false);
  const [canCreateEvent, setCanCreateEvent] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
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

  const navLinks = (
    <>
      {showAdminViews
        ? MENU.map((item) => {
            const active = isMenuActive(item.match, pathname, view);
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
                onClick={onCloseMobile}
                className={clsx(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })
        : null}

      <Link
        href={taghvimPath("/my-content")}
        onClick={onCloseMobile}
        className={clsx(
          "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          stripTaghvimBase(pathname).startsWith("/my-content")
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <FileText className="h-3.5 w-3.5" />
        محتوای من
      </Link>

      {canManageSubusers ? (
        <Link
          href={taghvimPath("/my-subusers")}
          onClick={onCloseMobile}
          className={clsx(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            stripTaghvimBase(pathname).startsWith("/my-subusers")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Users className="h-3.5 w-3.5" />
          زیردستان من
        </Link>
      ) : null}

      {showAdminPanel ? (
        <Link
          href={taghvimPath("/admin")}
          onClick={onCloseMobile}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          مدیریت تقویم
        </Link>
      ) : null}
    </>
  );

  return (
    <>
      <header className="rounded-xl border border-border/70 bg-card/80 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5 sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              تقویم دفاع و سازندگی
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {[user?.name, user ? ROLE_LABELS[user.role] : null, agencyLabel]
                .filter(Boolean)
                .join(" · ") || "ورود با حساب دولتما"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canCreateEvent ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                ثبت رویداد
              </button>
            ) : null}
          </div>
        </div>

        <nav
          aria-label="بخش‌های تقویم دفاع"
          className="hidden items-center gap-1 overflow-x-auto px-3 py-2 lg:flex sm:px-4"
        >
          {navLinks}
        </nav>

        <div className="hidden flex-wrap gap-3 border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground lg:flex sm:px-4">
          <StatChip
            icon={<Activity className="h-3 w-3" />}
            label="کل"
            value={stats.totalEvents}
          />
          <StatChip
            icon={<Swords className="h-3 w-3 text-red-500" />}
            label="دشمن"
            value={stats.enemy}
          />
          <StatChip
            icon={<Shield className="h-3 w-3 text-primary" />}
            label="دولت"
            value={stats.government}
          />
          <StatChip
            icon={<UserCheck className="h-3 w-3 text-emerald-500" />}
            label="فعال"
            value={stats.activeUsers}
          />
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="بستن پس‌زمینه منو"
            onClick={onCloseMobile}
          />
          <div className="absolute inset-x-3 top-16 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">منوی تقویم</p>
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                aria-label="بستن منو"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">{navLinks}</nav>
            <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
              <StatChip
                icon={<Activity className="h-3 w-3" />}
                label="کل"
                value={stats.totalEvents}
              />
              <StatChip
                icon={<Swords className="h-3 w-3 text-red-500" />}
                label="دشمن"
                value={stats.enemy}
              />
              <StatChip
                icon={<Shield className="h-3 w-3 text-primary" />}
                label="دولت"
                value={stats.government}
              />
              <StatChip
                icon={<UserCheck className="h-3 w-3 text-emerald-500" />}
                label="فعال"
                value={stats.activeUsers}
              />
            </div>
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

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      {icon}
      {label}: {value.toLocaleString("fa-IR")}
    </span>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-target inline-flex items-center justify-center rounded-xl border border-border bg-card p-2.5 text-foreground lg:hidden"
      aria-label="باز کردن منو"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
