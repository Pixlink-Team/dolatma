"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  id?: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  controls?: React.ReactNode;
}

export function CollapsibleSection({
  id,
  title,
  description,
  defaultOpen = true,
  children,
  controls,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="rounded-xl border bg-card/40">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex flex-1 items-start justify-between gap-3 text-right"
        >
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {open ? (
            <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          )}
        </button>
        {controls && <div className="flex flex-wrap items-center gap-2">{controls}</div>}
      </div>

      <div className={cn("p-4 transition-all", open ? "block" : "hidden")}>{children}</div>
    </section>
  );
}
