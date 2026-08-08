"use client";
import {
  isTaghvimPublicPath,
  stripTaghvimBase,
  taghvimPath,
} from "@taghvim/lib/paths";

import { canViewAdminViews, getCurrentUser } from "@taghvim/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isPublic = isTaghvimPublicPath(pathname);
    const user = getCurrentUser();

    if (!user && !isPublic) {
      router.replace(taghvimPath("/login"));
      return;
    }

    if (user && isPublic) {
      router.replace(
        canViewAdminViews(user) ? taghvimPath("/timeline") : taghvimPath("/my-content")
      );
      return;
    }

    if (
      user &&
      !canViewAdminViews(user) &&
      (stripTaghvimBase(pathname).startsWith("/timeline") ||
        stripTaghvimBase(pathname).startsWith("/overview") ||
        stripTaghvimBase(pathname) === "/")
    ) {
      router.replace(taghvimPath("/my-content"));
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready && !isTaghvimPublicPath(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--text-secondary)]">
        در حال بررسی دسترسی...
      </div>
    );
  }

  return <>{children}</>;
}
