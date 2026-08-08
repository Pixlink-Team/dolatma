"use client";
import { taghvimPath, stripTaghvimBase, TAGHVIM_BASE } from "@taghvim/lib/paths";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(taghvimPath("/login"));
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">
      در حال هدایت به صفحه ورود...
    </div>
  );
}
