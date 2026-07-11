"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminViewMode = "grid" | "list";

interface AdminViewModeToggleProps {
  value: AdminViewMode;
  onChange: (mode: AdminViewMode) => void;
  className?: string;
}

export function AdminViewModeToggle({ value, onChange, className }: AdminViewModeToggleProps) {
  return (
    <div className={cn("inline-flex items-center rounded-lg border p-0.5", className)}>
      <Button
        type="button"
        size="sm"
        variant={value === "grid" ? "default" : "ghost"}
        className="h-8 gap-1.5 px-2.5"
        onClick={() => onChange("grid")}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        کارت
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "list" ? "default" : "ghost"}
        className="h-8 gap-1.5 px-2.5"
        onClick={() => onChange("list")}
      >
        <List className="h-3.5 w-3.5" />
        لیست
      </Button>
    </div>
  );
}
