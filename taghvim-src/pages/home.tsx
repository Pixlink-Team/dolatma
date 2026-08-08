"use client";
import { canViewAdminViews, getCurrentUser } from "@taghvim/lib/auth";
import { taghvimPath } from "@taghvim/lib/paths";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    router.replace(
      canViewAdminViews(user) ? taghvimPath("/timeline") : taghvimPath("/my-content")
    );
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">
      در حال هدایت...
    </div>
  );
}
