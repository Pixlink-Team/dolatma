"use client";

import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import {
  isLocalUploadedMediaUrl,
  OptimizedMediaImage,
} from "@/components/ui/optimized-media-image";
import { cn } from "@/lib/utils";

interface MediaThumbnailProps {
  src?: string | null;
  alt: string;
  kind?: "image" | "video" | "poster" | "billboard";
  fill?: boolean;
  className?: string;
  sizes?: string;
  objectFit?: "cover" | "contain";
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
}: MediaThumbnailProps) {
  if (!src) {
    return <MediaPlaceholder kind={kind} className={className} />;
  }

  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";

  if (shouldUsePlainImg(src) || kind === "billboard") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
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
      src={src}
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
