"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminCompactAddCardProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  aspectClass?: string;
}

export const ADMIN_CONTENT_GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

export function AdminEmptyCreateState({
  message,
  children,
}: {
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground">
        {message}
      </div>
      {children ? <div className={ADMIN_CONTENT_GRID_CLASS}>{children}</div> : null}
    </div>
  );
}

export function AdminCompactAddCard({
  onClick,
  disabled,
  label = "ثبت جدید",
  aspectClass = "aspect-[4/3]",
}: AdminCompactAddCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "apple-press group w-full overflow-hidden rounded-xl border-2 border-dashed bg-muted/30 text-muted-foreground",
        "hover:border-primary hover:bg-primary/5 hover:text-primary hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50"
      )}
    >
      <div className={cn("flex flex-col items-center justify-center gap-2 p-4", aspectClass)}>
        <span className="text-3xl leading-none">+</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
    </button>
  );
}
