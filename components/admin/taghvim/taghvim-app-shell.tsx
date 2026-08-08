"use client";

import { AuthGate } from "@taghvim/components/auth/AuthGate";
import { ThemeProvider } from "@taghvim/components/theme/ThemeProvider";
import type { ReactNode } from "react";

export function TaghvimAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="taghvim-root min-h-[calc(100vh-2rem)] -mx-1 text-[var(--text-primary)]" data-theme="light">
      <ThemeProvider>
        <AuthGate>{children}</AuthGate>
      </ThemeProvider>
    </div>
  );
}
