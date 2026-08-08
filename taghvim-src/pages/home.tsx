"use client";
import { taghvimPath, stripTaghvimBase, TAGHVIM_BASE } from "@taghvim/lib/paths";

import { canViewAdminViews, getCurrentUser } from "@taghvim/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace(taghvimPath("/login"));
      return;
    }
    router.replace(canViewAdminViews(user) ? taghvimPath("/timeline") : taghvimPath("/my-content"));
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">
      در حال هدایت...
    </div>
  );
}
