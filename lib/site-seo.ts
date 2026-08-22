import type { Metadata } from "next";
import {
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
} from "@/lib/campaign-branding";

/** Google Search Console HTML meta-tag verification token (also add DNS TXT at the registrar). */
export const GOOGLE_SITE_VERIFICATION =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  "QmN5mEFbaWhVGE8QYVsWbwdi2BoIvem3SKOrsCAIa2o";

export const DEFAULT_SITE_KEYWORDS = [
  "راستا",
  "گزارش زنده",
  "سامانه راستا",
  "مدیریت گزارش",
  "پویش رسانه‌ای",
  "گزارش زنده راستا",
  "rassta",
] as const;

export const PUBLIC_INDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export const PRIVATE_NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

export function buildGoogleVerificationMetadata(): Pick<Metadata, "verification"> | undefined {
  if (!GOOGLE_SITE_VERIFICATION) return undefined;
  return {
    verification: {
      google: GOOGLE_SITE_VERIFICATION,
    },
  };
}

export function buildPublicPageMetadata(options: {
  title?: string;
  description?: string;
  path: string;
  baseUrl: string;
  keywords?: readonly string[];
}): Pick<
  Metadata,
  "title" | "description" | "keywords" | "robots" | "alternates" | "verification"
> {
  const title = options.title?.trim() || DEFAULT_SITE_TITLE;
  const description = options.description?.trim() || DEFAULT_SITE_DESCRIPTION;
  const canonicalPath = options.path.startsWith("/") ? options.path : `/${options.path}`;
  const canonicalUrl = `${options.baseUrl}${canonicalPath}`;

  return {
    title,
    description,
    keywords: [...(options.keywords ?? DEFAULT_SITE_KEYWORDS)],
    robots: PUBLIC_INDEX_ROBOTS,
    alternates: {
      canonical: canonicalUrl,
    },
    ...buildGoogleVerificationMetadata(),
  };
}

export function buildWebsiteJsonLd(options: {
  baseUrl: string;
  title: string;
  description: string;
  path?: string;
}) {
  const pagePath = options.path?.startsWith("/") ? options.path : options.path ? `/${options.path}` : "";
  const pageUrl = `${options.baseUrl}${pagePath || ""}`;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: options.title,
    description: options.description,
    url: pageUrl,
    inLanguage: "fa-IR",
  };
}

export function buildWebApplicationJsonLd(options: {
  baseUrl: string;
  title: string;
  description: string;
  path: string;
}) {
  const pagePath = options.path.startsWith("/") ? options.path : `/${options.path}`;

  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: options.title,
    description: options.description,
    url: `${options.baseUrl}${pagePath}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "fa-IR",
  };
}
