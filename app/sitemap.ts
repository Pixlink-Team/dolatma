import type { MetadataRoute } from "next";
import { resolveSiteBaseUrl } from "@/lib/campaign-metadata";
import { pgGetAllCampaigns } from "@/lib/db/repository";
import { isPostgresConfigured } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await resolveSiteBaseUrl();
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/admin/login`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  if (isPostgresConfigured()) {
    try {
      const campaigns = await pgGetAllCampaigns();
      for (const campaign of campaigns) {
        if (!campaign.published) continue;

        const campaignUrl = `${baseUrl}/campaign/${encodeURIComponent(campaign.slug)}`;
        entries.push({
          url: campaignUrl,
          lastModified,
          changeFrequency: "daily",
          priority: 0.8,
        });
        entries.push({
          url: `${campaignUrl}/cities`,
          lastModified,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    } catch {
      // Sitemap should still publish core routes when the database is temporarily unavailable.
    }
  }

  return entries;
}
