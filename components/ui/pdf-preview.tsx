"use client";

import { buildPdfPreviewUrl } from "@/lib/media-utils";
import { cn } from "@/lib/utils";

interface PdfPreviewProps {
  src: string;
  title?: string;
  className?: string;
  /** When false, the iframe ignores pointer events (useful for card covers). */
  interactive?: boolean;
  page?: number;
}

export function PdfPreview({
  src,
  title = "PDF preview",
  className,
  interactive = true,
  page = 1,
}: PdfPreviewProps) {
  const previewUrl = buildPdfPreviewUrl(src, page);

  return (
    <iframe
      src={previewUrl}
      title={title}
      className={cn(
        "h-full w-full border-0 bg-white",
        !interactive && "pointer-events-none",
        className
      )}
    />
  );
}
