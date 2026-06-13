"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatPersianDate, getStatusLabel, isValidUrl } from "@/lib/utils";

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  title: string;
  versionNumber?: number;
  date?: string;
  notes?: string | null;
  status?: string;
  isFinal?: boolean;
  duration?: string | null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export function VideoModal({
  open,
  onOpenChange,
  videoUrl,
  title,
  versionNumber,
  date,
  notes,
  status,
  isFinal,
  duration,
}: VideoModalProps) {
  const validUrl = isValidUrl(videoUrl);

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
            {duration && (
              <span className="text-sm font-normal text-muted-foreground">({duration})</span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video w-full bg-black">
          {validUrl ? (
            isDirectVideo(videoUrl) ? (
              <video
                src={videoUrl}
                controls
                className="h-full w-full"
                playsInline
              />
            ) : (
              <iframe
                src={videoUrl}
                title={title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-white">
              لینک ویدیو نامعتبر است
            </div>
          )}
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
