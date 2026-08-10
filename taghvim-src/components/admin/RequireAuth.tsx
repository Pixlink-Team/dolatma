"use client";
import { taghvimPath, stripTaghvimBase } from "@taghvim/lib/paths";

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
import { CreateEventForm } from "@taghvim/components/forms/CreateEventForm";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  permission?: Permission;
};

const NAV: NavItem[] = [
  { href: taghvimPath("/admin"), label: "داشبورد", icon: LayoutDashboard, exact: true },
  { href: taghvimPath("/admin/agencies"), label: "وزارتخانه‌ها", icon: Building2, permission: "manage_agencies" },
  { href: taghvimPath("/admin/users"), label: "کاربران", icon: Users, permission: "manage_users" },
  { href: taghvimPath("/my-subusers"), label: "زیردستان من", icon: UserPlus, permission: "manage_subusers" },
  { href: taghvimPath("/admin/form-builder"), label: "فرم‌ساز", icon: FormInput, permission: "manage_form_schema" },
  { href: taghvimPath("/admin/archive"), label: "آرشیو", icon: Archive, permission: "view_archive" },
  { href: taghvimPath("/admin/backup"), label: "بکاپ", icon: HardDrive, permission: "run_backup" },
  { href: taghvimPath("/admin/settings"), label: "تنظیمات", icon: Settings, permission: "manage_settings" },
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
        router.replace(
          canViewAdminViews(current)
            ? taghvimPath("/admin")
            : taghvimPath("/my-content"),
        );
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
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
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
  const canContent = userHasPermission(user, "manage_content");
  const [createOpen, setCreateOpen] = useState(false);
  const isDolatmaLinked = user.username?.startsWith("dm_") ?? false;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  async function onLogout() {
    await logoutRequest();
    window.location.href = "/admin";
  }

  function visibleNav() {
    return NAV.filter((item) => {
      if (!item.permission) return true;
      return userHasPermission(user, item.permission);
    });
  }

  return (
    <div className="w-full text-foreground" style={{ direction: "rtl" }}>
      <header className="mb-4 rounded-xl border border-border/70 bg-card/80 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5 sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">مدیریت تقویم دفاع</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user.name}
              {" · "}
              {ROLE_LABELS[user.role]}
              {isDolatmaLinked ? " · متصل به دولتما" : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canContent ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                ثبت رویداد
              </button>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent"
              title="بازگشت به پنل دولتما"
            >
              <LogOut className="h-3.5 w-3.5" />
              بازگشت به پنل
            </button>
          </div>
        </div>

        <nav
          aria-label="بخش‌های مدیریت تقویم"
          className="hidden items-center gap-1 overflow-x-auto px-3 py-2 lg:flex sm:px-4"
        >
          {visibleNav().map((item) => {
            const active = item.exact
              ? pathname === item.href
              : item.href === taghvimPath("/timeline")
                ? stripTaghvimBase(pathname).startsWith("/timeline")
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
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
          })}
        </nav>
      </header>

      <main className="min-w-0 space-y-4 pb-20 lg:pb-4">{children}</main>

      <AdminMobileTabBar user={user} />

      {canContent ? (
        <CreateEventForm
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
    </div>
  );
}
