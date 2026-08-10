"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  main: ReactNode;
  detail?: ReactNode;
  detailOpen?: boolean;
  mobileNav?: ReactNode;
};

/**
 * Embedded layout inside dolatma admin main:
 * Secondary nav (top) | Main + optional detail panel
 */
export function AppShell({
  sidebar,
  main,
  detail,
  detailOpen = false,
  mobileNav,
}: AppShellProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 1023px)").matches) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname]);

  return (
    <div
      className="flex w-full flex-col gap-3 text-[var(--text-primary)]"
      style={{ direction: "rtl" }}
    >
      {sidebar}

      <div className="flex min-h-0 w-full flex-col gap-3 xl:flex-row">
        <div className="min-w-0 flex-1">{main}</div>

        <aside
          className={clsx(
            "hidden shrink-0 transition-all duration-200 xl:block",
            detailOpen ? "w-[400px]" : "w-0 overflow-hidden",
          )}
        >
          {detailOpen ? (
            <div className="sticky top-4 h-[min(80vh,720px)] min-h-0 w-full">
              {detail}
            </div>
          ) : null}
        </aside>
      </div>

      {mobileNav}
    </div>
  );
}
