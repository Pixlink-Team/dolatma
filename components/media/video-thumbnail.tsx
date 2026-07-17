"use client";

import Image from "next/image";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { resolveVideoThumbnail } from "@/lib/media-utils";
import { cn } from "@/lib/utils";

interface VideoThumbnailProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
}

/**
 * Lightweight video cover only — never loads the video file.
 * Without a cover image, shows a placeholder (user must open the player to stream).
 */
export function VideoThumbnail({
  videoUrl,
  thumbnailUrl,
  alt,
  className = "object-cover",
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px",
}: VideoThumbnailProps) {
  const coverUrl = resolveVideoThumbnail(videoUrl, thumbnailUrl);

  if (coverUrl) {
    return (
      <Image
        src={coverUrl}
        alt={alt}
        fill
        loading="lazy"
        decoding="async"
        quality={60}
        sizes={sizes}
        className={cn("object-cover", className)}
      />
    );
  }

  return <MediaPlaceholder kind="video" className={cn("absolute inset-0 h-full w-full", className)} />;
}
