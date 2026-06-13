"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatPersianDate, getStatusLabel } from "@/lib/utils";

interface LightboxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
  versionNumber?: number;
  date?: string;
  notes?: string | null;
  status?: string;
  isFinal?: boolean;
}

export function LightboxModal({
  open,
  onOpenChange,
  imageUrl,
  title,
  versionNumber,
  date,
  notes,
  status,
  isFinal,
}: LightboxModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {title}
            {versionNumber && (
              <span className="text-sm font-normal text-muted-foreground">
                — نسخه {versionNumber}
              </span>
            )}
            {isFinal && <Badge status="final">نسخه نهایی</Badge>}
            {status && <Badge status={status}>{getStatusLabel(status)}</Badge>}
          </DialogTitle>
        </DialogHeader>
        <div className="relative aspect-[3/4] max-h-[70vh] w-full bg-muted">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
        {(date || notes) && (
          <div className="p-4 space-y-2 border-t">
            {date && (
              <p className="text-sm text-muted-foreground">{formatPersianDate(date)}</p>
            )}
            {notes && <p className="text-sm">{notes}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
