"use client";

interface VideoThumbnailProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  alt: string;
  className?: string;
}

export function VideoThumbnail({ videoUrl, thumbnailUrl, alt, className = "object-cover" }: VideoThumbnailProps) {
  const hasCover = Boolean(thumbnailUrl && thumbnailUrl !== videoUrl);

  if (hasCover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={thumbnailUrl!} alt={alt} className={`h-full w-full ${className}`} />
    );
  }

  return (
    <video
      src={videoUrl}
      className={`h-full w-full ${className}`}
      muted
      playsInline
      preload="metadata"
      aria-label={alt}
    />
  );
}
