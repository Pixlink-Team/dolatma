import type { Metadata } from "next";
import type { CampaignSettings } from "@/lib/types";

export const DEFAULT_SITE_TITLE = "گزارش زنده کمپین";
export const DEFAULT_SITE_DESCRIPTION = "گزارش زنده پیشرفت کمپین تبلیغاتی";
export const DEFAULT_FAVICON_URL = "/images/dolat.webp";

function resolveSiteBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function absolutizeMediaUrl(
  url: string | null | undefined,
  baseUrl = resolveSiteBaseUrl()
): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${baseUrl}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function iconMimeType(url: string): string | undefined {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  return undefined;
}

export type CampaignMetadataSource = Pick<
  CampaignSettings,
  "title" | "tagline" | "description" | "coverImageUrl" | "faviconUrl" | "slug"
>;

export function buildCampaignMetadata(
  settings?: CampaignMetadataSource | null,
  options?: { path?: string }
): Metadata {
  const baseUrl = resolveSiteBaseUrl();
  const title = settings?.title?.trim() || DEFAULT_SITE_TITLE;
  const description =
    settings?.tagline?.trim() ||
    settings?.description?.trim() ||
    DEFAULT_SITE_DESCRIPTION;
  const faviconUrl =
    absolutizeMediaUrl(settings?.faviconUrl, baseUrl) ||
    absolutizeMediaUrl(DEFAULT_FAVICON_URL, baseUrl)!;
  const ogImage = absolutizeMediaUrl(settings?.coverImageUrl, baseUrl);
  const pagePath = options?.path ?? (settings?.slug ? `/campaign/${settings.slug}` : "/");
  const pageUrl = `${baseUrl}${pagePath.startsWith("/") ? pagePath : `/${pagePath}`}`;
  const faviconType = iconMimeType(faviconUrl);

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    icons: {
      icon: [{ url: faviconUrl, ...(faviconType ? { type: faviconType } : {}) }],
      apple: [{ url: faviconUrl, ...(faviconType ? { type: faviconType } : {}) }],
      shortcut: [faviconUrl],
    },
    openGraph: {
      type: "website",
      locale: "fa_IR",
      url: pageUrl,
      title,
      description,
      siteName: title,
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,
                alt: title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}
