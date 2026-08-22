import type { MetadataRoute } from "next";
import { resolveSiteBaseUrl } from "@/lib/campaign-metadata";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await resolveSiteBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/admin/login", "/campaign/"],
        disallow: ["/admin/", "/api/", "/device/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl.replace(/^https?:\/\//, ""),
  };
}
