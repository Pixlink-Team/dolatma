"use client";

import { bridgeTaghvimSessionAction } from "@/lib/actions/taghvim-bridge-actions";
import {
  canViewAdminViews,
  normalizeBridgedUser,
} from "@taghvim/lib/auth";
import type { AdminUser } from "@taghvim/types/auth";
import { setSession, clearSession } from "@taghvim/lib/admin-store";
import {
  isTaghvimPublicPath,
  stripTaghvimBase,
  taghvimPath,
} from "@taghvim/lib/paths";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Ensures the defense calendar uses the current dolatma user via Laravel bridge.
 * No separate taghvim username/password login.
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

      const result = await bridgeTaghvimSessionAction();
      if (cancelled) return;

      if (!result.success) {
        clearSession();
        setUser(null);
        setError(result.error);
        setBooting(false);
        return;
      }

      const bridged = normalizeBridgedUser(result.user);
      setSession(result.token, bridged);
      setUser(bridged);
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
        <p className="text-base font-medium text-[var(--text-primary)]">
          ورود به تقویم دفاع ممکن نشد
        </p>
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => {
              clearSession();
              setError(null);
              setBooting(true);
              setUser(null);
              void bridgeTaghvimSessionAction().then((result) => {
                if (!result.success) {
                  setError(result.error);
                  setBooting(false);
                  return;
                }
                const bridged = normalizeBridgedUser(result.user);
                setSession(result.token, bridged);
                setUser(bridged);
                setBooting(false);
              });
            }}
          >
            تلاش دوباره
          </button>
          <a
            href="/admin"
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
          >
            بازگشت به پنل
          </a>
        </div>
      </div>
    );
  }

  if (booting || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--text-secondary)]">
        در حال ورود با حساب دولتما...
      </div>
    );
  }

  return <>{children}</>;
}
