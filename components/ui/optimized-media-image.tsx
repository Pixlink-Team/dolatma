import Image, { type ImageProps } from "next/image";

/** Uploaded files use signed ?exp=&sig= query params that break next/image optimization. */
export function isLocalUploadedMediaUrl(url?: string | null): boolean {
  return Boolean(url?.startsWith("/api/files/"));
}

function shouldSkipOptimization(url?: string | null): boolean {
  if (!url) return false;
  if (isLocalUploadedMediaUrl(url)) return true;
  // Browser-direct load for remote hosts the app server may not reach (e.g. pixlink).
  return url.startsWith("http://") || url.startsWith("https://");
}

export function OptimizedMediaImage({ src, unoptimized, alt = "", ...props }: ImageProps) {
  const srcValue = typeof src === "string" ? src : "";
  const useUnoptimized = unoptimized ?? shouldSkipOptimization(srcValue);

  return <Image {...props} src={src} alt={alt} unoptimized={useUnoptimized} />;
}
