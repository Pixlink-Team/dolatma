"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAdminAction } from "@/lib/actions/auth-actions";
import { REIS_MONITORING_BASE, REIS_MONITORING_NAV } from "@/lib/reis/monitoring";
import { REIS_HOME_PATH } from "@/lib/reis/sections";
import { createClient } from "@/lib/supabase/client";
import { adminHref, cn, isSupabaseConfigured } from "@/lib/utils";

function isMonitoringSurface(pathname: string) {
  return (
    pathname === REIS_MONITORING_BASE ||
    pathname.startsWith(`${REIS_MONITORING_BASE}/`) ||
    pathname.startsWith("/admin/monitoring") ||
    pathname.startsWith("/admin/rapid-response")
  );
}

function isWideReisSurface(pathname: string) {
  return (
    isMonitoringSurface(pathname) ||
    pathname === `${REIS_HOME_PATH}/strategic` ||
    pathname.startsWith(`${REIS_HOME_PATH}/strategic/`)
  );
}

type ReisShellProps = {
  children: React.ReactNode;
  /** When true, show a link back to the full admin panel (for admin/client preview). */
  showAdminReturn?: boolean;
  userName?: string | null;
};

export function ReisShell({ children, showAdminReturn = false, userName }: ReisShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { campaignId } = useAdminCampaign();
  const isHub = pathname === REIS_HOME_PATH;
  const showMonitoringNav = isMonitoringSurface(pathname);
  const wideLayout = isWideReisSurface(pathname);

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) await supabase.auth.signOut();
    } else {
      await logoutAdminAction();
    }
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.08),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(14,165,233,0.06),_transparent_45%)]"
      />
      <header className="relative z-10 border-b border-border/70 bg-background/80 backdrop-blur">
        <div
          className={cn(
            "mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6",
            wideLayout ? "max-w-7xl" : "max-w-6xl"
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            {!isHub ? (
              <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1.5">
                <Link href={REIS_HOME_PATH}>
                  <ArrowRight className="h-4 w-4" />
                  بخش‌ها
                </Link>
              </Button>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {showMonitoringNav ? "رصد و واکنش سریع" : "دسترسی رییس"}
              </p>
              {userName ? (
                <p className="truncate text-xs text-muted-foreground">{userName}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showAdminReturn ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">بازگشت به پنل</Link>
              </Button>
            ) : null}
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </div>
        </div>
        {showMonitoringNav ? (
          <div className="border-t border-border/60">
            <nav
              aria-label="بخش‌های رصد و واکنش سریع"
              className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6"
            >
              {REIS_MONITORING_NAV.map((item) => {
                const href = adminHref(item.href, campaignId);
                const isActive =
                  "exact" in item && item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </header>
      <main
        className={cn(
          "relative z-10 mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
          wideLayout ? "max-w-7xl" : "max-w-6xl"
        )}
      >
        {children}
      </main>
    </div>
  );
}
