"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPersianDate, getStatusLabel } from "@/lib/utils";
import type { VersionStatus } from "@/lib/types";

export interface MediaVersionItem {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  isFinal: boolean;
  date: string;
}

interface MediaVersionPickerProps<T extends MediaVersionItem> {
  versions: T[];
  activeId: string;
  onSelect: (id: string) => void;
  renderThumb: (version: T, isActive: boolean) => React.ReactNode;
}

export function MediaVersionPicker<T extends MediaVersionItem>({
  versions,
  activeId,
  onSelect,
  renderThumb,
}: MediaVersionPickerProps<T>) {
  if (versions.length <= 1) return null;

  const sorted = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
  const activeIndex = sorted.findIndex((version) => version.id === activeId);
  const safeIndex = activeIndex >= 0 ? activeIndex : sorted.length - 1;

  const goTo = (index: number) => {
    const next = sorted[index];
    if (next) onSelect(next.id);
  };

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">نسخه‌ها</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={safeIndex <= 0}
            onClick={() => goTo(safeIndex - 1)}
            aria-label="نسخه قبلی"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={safeIndex >= sorted.length - 1}
            onClick={() => goTo(safeIndex + 1)}
            aria-label="نسخه بعدی"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {sorted.map((version) => {
          const isActive = version.id === activeId;

          return (
            <button
              key={version.id}
              type="button"
              onClick={() => onSelect(version.id)}
              className={cn(
                "flex shrink-0 flex-col gap-1.5 rounded-lg border p-1.5 text-right transition-colors",
                isActive
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-muted/30 hover:bg-muted/60"
              )}
            >
              <div className="relative h-14 w-12 overflow-hidden rounded bg-muted">
                {renderThumb(version, isActive)}
              </div>
              <div className="min-w-[3.5rem] space-y-0.5 px-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-medium">v{version.versionNumber}</span>
                  {version.isFinal && (
                    <Badge status="final" className="px-1 py-0 text-[9px]">
                      نهایی
                    </Badge>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground">{formatPersianDate(version.date)}</p>
                <Badge status={version.status} className="w-full justify-center px-1 py-0 text-[9px]">
                  {getStatusLabel(version.status)}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
