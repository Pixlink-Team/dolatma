"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAdminAction } from "@/lib/actions/auth-actions";
import { REIS_HOME_PATH } from "@/lib/reis/sections";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/utils";

type ReisShellProps = {
  children: React.ReactNode;
  /** When true, show a link back to the full admin panel (for admin/client preview). */
  showAdminReturn?: boolean;
  userName?: string | null;
};

export function ReisShell({ children, showAdminReturn = false, userName }: ReisShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHub = pathname === REIS_HOME_PATH;

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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
              <p className="truncate text-sm font-semibold">دسترسی رییس</p>
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
      </header>
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
