"use client";

import {
  canViewAdminViews,
  refreshCurrentUser,
} from "@taghvim/lib/auth";
import { clearSession } from "@taghvim/lib/admin-store";
import {
  isTaghvimPublicPath,
  stripTaghvimBase,
  taghvimPath,
} from "@taghvim/lib/paths";
import type { AdminUser } from "@taghvim/types/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Loads the defense-calendar actor from the dolatma session via /auth/me.
 * No separate taghvim login or Laravel SSO bridge.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setBooting(true);
      setError(null);
      const me = await refreshCurrentUser();
      if (cancelled) return;
      if (!me) {
        clearSession();
        setUser(null);
        setError("نشست دولتما یافت نشد یا به تقویم دفاع دسترسی ندارید.");
        setBooting(false);
        return;
      }
      setUser(me);
      setBooting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (booting || error || !user) return;

    if (isTaghvimPublicPath(pathname)) {
      router.replace(
        canViewAdminViews(user)
          ? taghvimPath("/timeline")
          : taghvimPath("/my-content")
      );
      return;
    }

    if (
      !canViewAdminViews(user) &&
      (stripTaghvimBase(pathname).startsWith("/timeline") ||
        stripTaghvimBase(pathname).startsWith("/overview") ||
        stripTaghvimBase(pathname) === "/")
    ) {
      router.replace(taghvimPath("/my-content"));
    }
  }, [booting, error, user, pathname, router]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-base font-medium text-foreground">
          دسترسی به تقویم دفاع برقرار نشد
        </p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => {
              clearSession();
              setError(null);
              setBooting(true);
              setUser(null);
              void refreshCurrentUser().then((me) => {
                if (!me) {
                  setError(
                    "نشست دولتما یافت نشد یا به تقویم دفاع دسترسی ندارید."
                  );
                  setBooting(false);
                  return;
                }
                setUser(me);
                setBooting(false);
              });
            }}
          >
            تلاش دوباره
          </button>
          <a
            href="/admin"
            className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground"
          >
            بازگشت به پنل
          </a>
        </div>
      </div>
    );
  }

  if (booting || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        در حال ورود با حساب دولتما...
      </div>
    );
  }

  return <>{children}</>;
}
