"use client";
import { taghvimPath, stripTaghvimBase, TAGHVIM_BASE } from "@taghvim/lib/paths";

import { getCurrentUser, logoutRequest, refreshCurrentUser } from "@taghvim/lib/auth";
import {
  ROLE_LABELS,
  canViewAdminViews,
  userHasPermission,
  type AdminUser,
  type Permission,
} from "@taghvim/types/auth";
import clsx from "clsx";
import {
  Archive,
  FormInput,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Shield,
  Building2,
  Users,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AdminMobileTabBar } from "@taghvim/components/admin/AdminMobileTabBar";
import { IranEmblem } from "@taghvim/components/brand/IranEmblem";
import { SiteMottoBanner } from "@taghvim/components/brand/SiteMottoBanner";
import { CreateEventForm } from "@taghvim/components/forms/CreateEventForm";
import { ThemeToggle } from "@taghvim/components/theme/ThemeToggle";
import { getSiteBranding } from "@taghvim/lib/branding";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  permission?: Permission;
};

const NAV: NavItem[] = [
  { href: taghvimPath("/admin"), label: "داشبورد ادمین", icon: LayoutDashboard, exact: true },
  { href: taghvimPath("/admin/agencies"), label: "وزارتخانه‌ها", icon: Building2, permission: "manage_agencies" },
  { href: taghvimPath("/admin/users"), label: "کاربران و دسترسی‌ها", icon: Users, permission: "manage_users" },
  { href: taghvimPath("/my-subusers"), label: "زیردستان من", icon: UserPlus, permission: "manage_subusers" },
  { href: taghvimPath("/admin/form-builder"), label: "فرم‌ساز", icon: FormInput, permission: "manage_form_schema" },
  { href: taghvimPath("/admin/archive"), label: "آرشیو", icon: Archive, permission: "view_archive" },
  { href: taghvimPath("/admin/backup"), label: "بکاپ", icon: HardDrive, permission: "run_backup" },
  { href: taghvimPath("/admin/settings"), label: "تنظیمات داشبورد", icon: Settings, permission: "manage_settings" },
  { href: taghvimPath("/timeline"), label: "بازگشت به تقویم", icon: Shield },
];

export function RequireAuth({
  children,
  requireManageUsers,
  requireManageSettings,
  requireManageAgencies,
  requirePermission,
}: {
  children: ReactNode;
  requireManageUsers?: boolean;
  requireManageSettings?: boolean;
  requireManageAgencies?: boolean;
  requirePermission?: Permission;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const current = (await refreshCurrentUser()) ?? getCurrentUser();
      if (cancelled) return;
      if (!current) {
        // Dolatma SSO — never show a separate login; bounce to module root to re-bridge.
        router.replace(taghvimPath("/"));
        return;
      }

      if (requireManageUsers && !userHasPermission(current, "manage_users")) {
        router.replace(taghvimPath("/admin"));
        return;
      }
      if (requireManageSettings && !userHasPermission(current, "manage_settings")) {
        router.replace(taghvimPath("/admin"));
        return;
      }
      if (requireManageAgencies && !userHasPermission(current, "manage_agencies")) {
        router.replace(taghvimPath("/admin"));
        return;
      }
      if (requirePermission && !userHasPermission(current, requirePermission)) {
        router.replace(canViewAdminViews(current) ? taghvimPath("/admin") : taghvimPath("/my-content"));
        return;
      }

      setUser(current);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    router,
    requireManageUsers,
    requireManageSettings,
    requireManageAgencies,
    requirePermission,
  ]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--text-secondary)]">
        در حال بررسی دسترسی...
      </div>
    );
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}

function AdminShell({
  user,
  children,
}: {
  user: AdminUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const canContent = userHasPermission(user, "manage_content");
  const [createOpen, setCreateOpen] = useState(false);
  const [branding, setBranding] = useState(() => getSiteBranding());

  useEffect(() => {
    setBranding(getSiteBranding());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  async function onLogout() {
    await logoutRequest();
    // Return to dolatma panel — calendar uses dolatma SSO, not a separate login.
    window.location.href = "/admin";
  }

  function visibleNav() {
    return NAV.filter((item) => {
      if (!item.permission) return true;
      return userHasPermission(user, item.permission);
    });
  }

  return (
    <div
      className="min-h-dvh bg-[var(--background)] text-[var(--text-primary)] safe-top"
      style={{ direction: "rtl" }}
    >
      <div className="mx-auto flex min-h-dvh max-w-6xl gap-4 p-3 pb-[var(--app-content-pad-bottom)] sm:p-4 lg:pb-4">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)] lg:flex">
          <div className="border-b border-[var(--border)] p-4">
            <div className="mb-2 flex items-center gap-2">
              <IranEmblem className="h-7 w-7 text-[var(--logo)]" />
              <div>
                <p className="text-xs text-[var(--text-secondary)]">پنل مدیریت</p>
                <h1 className="text-lg font-bold text-[var(--text-primary)]">
                  {branding.siteTitle}
                </h1>
                <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
                  {branding.siteTagline}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-2">
            {visibleNav().map((item) => {
              const active = item.exact
                ? pathname === item.href
                : item.href === taghvimPath("/timeline")
                  ? stripTaghvimBase(pathname).startsWith("/timeline")
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-blue-500/15 text-[var(--primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--hover)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-[var(--border)] p-3">
            {canContent ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                ثبت رویداد جدید
              </button>
            ) : null}
            <ThemeToggle className="w-full justify-center" />
            <div className="rounded-xl bg-[var(--panel-2)] p-3 text-xs">
              <p className="font-semibold text-[var(--text-primary)]">{user.name}</p>
              <p className="mt-1 text-[var(--text-secondary)]">
                {user.username || user.email || "—"}
              </p>
              <p className="mt-1 text-[var(--primary)]">{ROLE_LABELS[user.role]}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover)]"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-4">
          <SiteMottoBanner compact />

          <div className="sticky top-0 z-20 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/95 px-3 py-3 backdrop-blur-xl lg:static lg:hidden">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{ROLE_LABELS[user.role]}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canContent ? (
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="touch-target rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white"
                >
                  ثبت رویداد
                </button>
              ) : null}
              <ThemeToggle />
              <button
                type="button"
                onClick={onLogout}
                className="touch-target rounded-xl border border-[var(--border)] px-3 text-xs"
              >
                خروج
              </button>
            </div>
          </div>

          {children}
        </main>
      </div>

      <AdminMobileTabBar user={user} />

      {canContent ? (
        <CreateEventForm open={createOpen} onClose={() => setCreateOpen(false)} />
      ) : null}
    </div>
  );
}
