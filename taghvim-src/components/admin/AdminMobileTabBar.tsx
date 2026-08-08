"use client";
import { taghvimPath, stripTaghvimBase, TAGHVIM_BASE } from "@taghvim/lib/paths";

import type { Permission } from "@taghvim/types/auth";
import { userHasPermission, type AdminUser } from "@taghvim/types/auth";
import clsx from "clsx";
import {
  Archive,
  Building2,
  FormInput,
  HardDrive,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type TabItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  exact?: boolean;
};

const PRIMARY_TABS: TabItem[] = [
  { href: taghvimPath("/admin"), label: "داشبورد", icon: LayoutDashboard, exact: true },
  { href: taghvimPath("/timeline"), label: "تقویم", icon: Shield },
  { href: taghvimPath("/admin/users"), label: "کاربران", icon: Users, permission: "manage_users" },
  { href: taghvimPath("/admin/settings"), label: "تنظیمات", icon: Settings, permission: "manage_settings" },
];

const MORE_TABS: TabItem[] = [
  { href: taghvimPath("/admin/agencies"), label: "وزارتخانه‌ها", icon: Building2, permission: "manage_agencies" },
  { href: taghvimPath("/admin/form-builder"), label: "فرم‌ساز", icon: FormInput, permission: "manage_form_schema" },
  { href: taghvimPath("/my-subusers"), label: "زیردستان", icon: UserPlus, permission: "manage_subusers" },
  { href: taghvimPath("/admin/archive"), label: "آرشیو", icon: Archive, permission: "view_archive" },
  { href: taghvimPath("/admin/backup"), label: "بکاپ", icon: HardDrive, permission: "run_backup" },
];

type AdminMobileTabBarProps = {
  user: AdminUser;
};

function isActive(pathname: string, item: TabItem) {
  if (item.exact) return pathname === item.href;
  if (item.href === taghvimPath("/timeline")) {
    return stripTaghvimBase(pathname).startsWith("/timeline");
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminMobileTabBar({ user }: AdminMobileTabBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = useMemo(
    () =>
      PRIMARY_TABS.filter(
        (item) => !item.permission || userHasPermission(user, item.permission),
      ),
    [user],
  );

  const moreItems = useMemo(
    () =>
      MORE_TABS.filter(
        (item) => !item.permission || userHasPermission(user, item.permission),
      ),
    [user],
  );

  if (tabs.length === 0) return null;

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          aria-label="بستن منو"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      {moreOpen && moreItems.length > 0 ? (
        <div className="fixed inset-x-3 bottom-[calc(var(--app-content-pad-bottom)+0.25rem)] z-50 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/95 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={clsx(
                    "flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm",
                    active
                      ? "bg-blue-500/15 text-[var(--primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--hover)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface-1)]/92 backdrop-blur-xl safe-bottom lg:hidden">
        <div className="mobile-nav-snap mx-auto flex max-w-lg items-stretch gap-1 overflow-x-auto px-2 py-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex min-h-11 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium",
                  active
                    ? "bg-blue-500/15 text-[var(--primary)]"
                    : "text-[var(--text-secondary)]",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {moreItems.length > 0 ? (
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className={clsx(
                "flex min-h-11 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium",
                moreOpen
                  ? "bg-blue-500/15 text-[var(--primary)]"
                  : "text-[var(--text-secondary)]",
              )}
            >
              <MoreHorizontal className="h-5 w-5 shrink-0" />
              <span>بیشتر</span>
            </button>
          ) : null}
        </div>
      </nav>
    </>
  );
}
