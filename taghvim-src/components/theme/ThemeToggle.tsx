"use client";

import { useTheme } from "@taghvim/components/theme/ThemeProvider";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeToggleProps = {
  className?: string;
  compact?: boolean;
};

export function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isLight = theme === "light";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-2.5 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] ${className}`}
      aria-label={isLight ? "فعال‌سازی تم تیره" : "فعال‌سازی تم روشن"}
      title={isLight ? "تم تیره" : "تم روشن"}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {!compact ? (
        <span className="hidden sm:inline" suppressHydrationWarning>
          {mounted ? (isLight ? "تیره" : "روشن") : "تم"}
        </span>
      ) : null}
    </button>
  );
}
