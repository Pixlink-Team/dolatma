"use client";

import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ImageZoomProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  /** Show zoom affordance overlay on hover */
  showHint?: boolean;
}

export function ImageZoom({
  src,
  alt = "",
  className,
  imgClassName,
  showHint = true,
}: ImageZoomProps) {
  const [open, setOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "group relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        aria-label="بزرگ‌نمایی تصویر"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={cn("h-full w-full object-cover", imgClassName)} />
        {showHint && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/25 group-hover:opacity-100">
            <ZoomIn className="h-6 w-6 text-white drop-shadow" />
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[95vh] max-w-[95vw] border-none bg-black/95 p-2 sm:p-4">
          <DialogTitle className="sr-only">{alt || "تصویر"}</DialogTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute left-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex max-h-[90vh] items-center justify-center overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-[90vh] max-w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
