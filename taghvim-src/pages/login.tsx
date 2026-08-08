"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { taghvimPath } from "@taghvim/lib/paths";

/** Login is handled by dolatma SSO bridge — redirect into the calendar. */
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(taghvimPath("/"));
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-[var(--text-secondary)]">
      در حال ورود با حساب دولتما...
    </div>
  );
}
