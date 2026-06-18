"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from "@/lib/hooks/use-in-view";

interface DeferredSectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}

export function DeferredSection({
  children,
  fallback,
  minHeight = 240,
  rootMargin = "240px",
}: DeferredSectionProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin, triggerOnce: true });

  return (
    <div ref={ref} style={{ minHeight: inView ? undefined : minHeight }}>
      {inView
        ? children
        : fallback ?? (
            <div className="space-y-3 rounded-xl border bg-card/40 p-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}
    </div>
  );
}
