import type { Metadata } from "next";
import { headers } from "next/headers";
import type { CampaignSettings } from "@/lib/types";
import { withFileAccessToken } from "@/lib/uploads";

export const DEFAULT_SITE_TITLE = "گزارش زنده اقدام";
export const DEFAULT_SITE_DESCRIPTION = "گزارش زنده پیشرفت اقدام تبلیغاتی";
/** Site branding favicon (WebP source of truth). */
export const DEFAULT_FAVICON_URL = "/images/dolat.webp";
/** PNG twin for browsers that do not support WebP tab icons (e.g. Safari). */
export const DEFAULT_FAVICON_PNG_URL = "/images/dolat-icon.png";

export async function resolveSiteBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  try {
    const requestHeaders = await headers();
    const host = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "")
      .split(",")[0]
      ?.trim();
    if (host) {
      const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
      const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
      const proto = forwardedProto || (isLocal ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // headers() is unavailable outside a request (e.g. build-time).
  }

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function absolutizeMediaUrl(
  url: string | null | undefined,
  baseUrl: string
): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${baseUrl}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

/** Signed absolute URL so crawlers/browsers can load /api/files media in <meta>. */
function publicMediaUrl(
  url: string | null | undefined,
  baseUrl: string
): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  return absolutizeMediaUrl(withFileAccessToken(trimmed), baseUrl);
}

/**
 * Same-origin icon path (signed when needed). Prefer path-only URLs so
 * metadataBase (from the request Host / NEXT_PUBLIC_APP_URL) can absolutize
 * them correctly — never bake in a build-time localhost fallback.
 */
function publicIconUrl(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  const signed = withFileAccessToken(trimmed);
  if (/^https?:\/\//i.test(signed)) return signed;
  return signed.startsWith("/") ? signed : `/${signed}`;
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

export async function buildCampaignMetadata(
  settings?: CampaignMetadataSource | null,
  options?: { path?: string }
): Promise<Metadata> {
  const baseUrl = await resolveSiteBaseUrl();
  const title = settings?.title?.trim() || DEFAULT_SITE_TITLE;
  const description =
    settings?.tagline?.trim() ||
    settings?.description?.trim() ||
    DEFAULT_SITE_DESCRIPTION;
  const customFavicon = publicIconUrl(settings?.faviconUrl);
  const faviconUrl = customFavicon || publicIconUrl(DEFAULT_FAVICON_URL)!;
  const faviconType = iconMimeType(faviconUrl);
  const usesDefaultWebp = !customFavicon;
  // Prefer PNG first when using the default WebP brand mark — Safari/etc. ignore WebP favicons.
  const iconEntries = [
    ...(usesDefaultWebp
      ? [{ url: DEFAULT_FAVICON_PNG_URL, type: "image/png" as const }]
      : []),
    { url: faviconUrl, ...(faviconType ? { type: faviconType } : {}) },
  ];
  const ogImage = publicMediaUrl(settings?.coverImageUrl, baseUrl);
  const pagePath = options?.path ?? (settings?.slug ? `/campaign/${settings.slug}` : "/");
  const pageUrl = `${baseUrl}${pagePath.startsWith("/") ? pagePath : `/${pagePath}`}`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    icons: {
      icon: iconEntries,
      apple: usesDefaultWebp
        ? [{ url: DEFAULT_FAVICON_PNG_URL, type: "image/png" }]
        : [{ url: faviconUrl, ...(faviconType ? { type: faviconType } : {}) }],
      shortcut: [usesDefaultWebp ? DEFAULT_FAVICON_PNG_URL : faviconUrl],
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
