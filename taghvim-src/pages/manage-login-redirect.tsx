"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { taghvimPath } from "@taghvim/lib/paths";

/** Legacy admin login URL — calendar uses dolatma SSO. */
export default function ManageLoginRedirectPage() {
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
