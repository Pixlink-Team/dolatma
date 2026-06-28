"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCampaignExportMode } from "@/lib/context/campaign-export-context";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  id?: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  lazyMount?: boolean;
  children: React.ReactNode;
  controls?: React.ReactNode;
}

export function CollapsibleSection({
  id,
  title,
  description,
  defaultOpen = true,
  lazyMount = false,
  children,
  controls,
}: CollapsibleSectionProps) {
  const exportMode = useCampaignExportMode();
  const [open, setOpen] = useState(defaultOpen || exportMode);
  const [hasMounted, setHasMounted] = useState(defaultOpen || !lazyMount || exportMode);

  useEffect(() => {
    if (exportMode) {
      setOpen(true);
      setHasMounted(true);
    }
  }, [exportMode]);

  useEffect(() => {
    if (open && lazyMount) {
      setHasMounted(true);
    }
  }, [open, lazyMount]);

  const shouldRenderChildren = lazyMount ? hasMounted && open : open;
  const isOpen = exportMode || open;

  return (
    <section id={id} className="rounded-xl border bg-card/40">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-start gap-3 text-right">
          {!exportMode ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-expanded={open}
            aria-label={open ? "بستن بخش" : "باز کردن بخش"}
          >
            {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          ) : (
            <span className="mt-0.5 shrink-0 w-5" aria-hidden />
          )}

          {exportMode ? (
            <div className="min-w-0 flex-1 space-y-1 text-right">
              <h2 className="text-xl font-bold tracking-tight">{title}</h2>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          ) : (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="min-w-0 flex-1 space-y-1 text-right"
          >
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </button>
          )}
        </div>

        {controls && <div className="flex flex-wrap items-center gap-2" data-export-hide>{controls}</div>}
      </div>

      <div className={cn("p-4 transition-all", isOpen ? "block" : "hidden")}>
        {shouldRenderChildren ? children : null}
      </div>
    </section>
  );
}
