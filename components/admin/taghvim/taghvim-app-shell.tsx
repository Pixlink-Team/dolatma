"use client";

import { AuthGate } from "@taghvim/components/auth/AuthGate";
import type { ReactNode } from "react";

/** Thin shell: dolatma chrome owns sidebar/theme; calendar only needs SSO gate. */
export function TaghvimAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="taghvim-root w-full text-[var(--text-primary)]">
      <AuthGate>{children}</AuthGate>
    </div>
  );
}
