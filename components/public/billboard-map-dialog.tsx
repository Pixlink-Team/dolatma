"use client";

import { Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BillboardMap } from "@/components/public/billboard-map";
import type { Billboard } from "@/lib/types";

interface BillboardMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billboards: Billboard[];
  onSelect: (billboard: Billboard) => void;
}

export function BillboardMapDialog({
  open,
  onOpenChange,
  billboards,
  onSelect,
}: BillboardMapDialogProps) {
  const handleSelect = (billboard: Billboard) => {
    // Close the map dialog first so its overlay does not flash under the detail card.
    onOpenChange(false);
    window.setTimeout(() => onSelect(billboard), 180);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="border-b px-6 py-4 text-right">
          <DialogTitle>نقشه بیلبوردها</DialogTitle>
          <DialogDescription>
            با اسکرول ماوس زوم کنید. برای دیدن جزئیات، روی هر نقطه کلیک کنید.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 p-4">
          <BillboardMap
            billboards={billboards}
            onSelect={handleSelect}
            containerClassName="h-full min-h-[60vh]"
            scrollWheelZoom
            active={open}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BillboardMapExpandButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function BillboardMapExpandButton({ onClick, disabled }: BillboardMapExpandButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      data-export-hide
    >
      <Maximize2 className="h-4 w-4" />
      نقشه بزرگ
    </button>
  );
}
