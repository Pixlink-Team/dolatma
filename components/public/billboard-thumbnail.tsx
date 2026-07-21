"use client";

import { useState } from "react";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { getBillboardDisplayImage, hasBillboardDisplayImage } from "@/lib/billboard-media";
import { CARD_THUMB_WIDTH, toCardThumbnailUrl } from "@/lib/card-thumbnail-url";
import type { Billboard } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BillboardThumbnailProps {
  billboard: Billboard;
  alt: string;
  sizes: string;
  className?: string;
  imageClassName?: string;
  thumbWidth?: number;
}

/**
 * Use a plain img for billboards: next/image optimization often fails for
 * signed /api/files URLs and for remote image hosts the server cannot reach.
 * Local uploads are served as small WebP thumbs via ?w=&q=.
 */
export function BillboardThumbnail({
  billboard,
  alt,
  sizes: _sizes,
  className,
  imageClassName,
  thumbWidth = CARD_THUMB_WIDTH,
}: BillboardThumbnailProps) {
  void _sizes;
  const [imageFailed, setImageFailed] = useState(false);
  const [useFullSrc, setUseFullSrc] = useState(false);
  const hasImage = hasBillboardDisplayImage(billboard) && !imageFailed;

  if (!hasImage) {
    return (
      <MediaPlaceholder
        kind="billboard"
        className={cn("absolute inset-0", className)}
      />
    );
  }

  const fullSrc = getBillboardDisplayImage(billboard);
  const thumbSrc = toCardThumbnailUrl(fullSrc, { width: thumbWidth });
  const previewSrc = useFullSrc || thumbSrc === fullSrc ? fullSrc : thumbSrc;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={previewSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("absolute inset-0 h-full w-full object-cover", imageClassName, className)}
      onError={() => {
        if (!useFullSrc && previewSrc !== fullSrc) {
          setUseFullSrc(true);
          return;
        }
        setImageFailed(true);
      }}
    />
  );
}
