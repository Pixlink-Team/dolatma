"use client";

import type { AutoSaveStatus } from "@/lib/hooks/use-auto-save";
import { cn } from "@/lib/utils";

interface AutoSaveStatusProps {
  status: AutoSaveStatus;
  className?: string;
}

export function AutoSaveStatusIndicator({ status, className }: AutoSaveStatusProps) {
  if (status === "idle") return null;

  const label =
    status === "pending"
      ? "در حال ذخیره..."
      : status === "saved"
        ? "ذخیره شد"
        : "خطا در ذخیره";

  return (
    <span
      className={cn(
        "text-xs",
        status === "error" ? "text-destructive" : "text-muted-foreground",
        className
      )}
      aria-live="polite"
    >
      {label}
    </span>
  );
}
