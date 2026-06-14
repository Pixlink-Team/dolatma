import Image, { type ImageProps } from "next/image";

export function isLocalUploadedMediaUrl(url?: string | null): boolean {
  return Boolean(url?.startsWith("/api/files/"));
}

export function OptimizedMediaImage({ src, unoptimized, ...props }: ImageProps) {
  const srcValue = typeof src === "string" ? src : "";
  const useUnoptimized = unoptimized ?? isLocalUploadedMediaUrl(srcValue);

  return <Image {...props} src={src} unoptimized={useUnoptimized} />;
}
