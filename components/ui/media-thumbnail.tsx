"use client";

import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import {
  isLocalUploadedMediaUrl,
  OptimizedMediaImage,
} from "@/components/ui/optimized-media-image";
import { CARD_THUMB_WIDTH, toCardThumbnailUrl } from "@/lib/card-thumbnail-url";
import { cn } from "@/lib/utils";

interface MediaThumbnailProps {
  src?: string | null;
  alt: string;
  kind?: "image" | "video" | "poster" | "billboard";
  fill?: boolean;
  className?: string;
  sizes?: string;
  objectFit?: "cover" | "contain";
  /** Max pixel width for local /api/files thumbnails. */
  thumbWidth?: number;
}

function shouldUsePlainImg(url: string): boolean {
  return (
    isLocalUploadedMediaUrl(url) ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  );
}

export function MediaThumbnail({
  src,
  alt,
  kind = "image",
  fill = true,
  className,
  sizes = "400px",
  objectFit = "cover",
  thumbWidth = CARD_THUMB_WIDTH,
}: MediaThumbnailProps) {
  if (!src) {
    return <MediaPlaceholder kind={kind} className={className} />;
  }

  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";
  const displaySrc = toCardThumbnailUrl(src, { width: thumbWidth });

  if (shouldUsePlainImg(src) || kind === "billboard") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displaySrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          fill ? "absolute inset-0 h-full w-full" : "h-full w-full",
          fitClass,
          className
        )}
      />
    );
  }

  return (
    <OptimizedMediaImage
      src={displaySrc}
      alt={alt}
      fill={fill}
      loading="lazy"
      decoding="async"
      quality={65}
      className={cn(fitClass, className)}
      sizes={sizes}
    />
  );
}
