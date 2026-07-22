import { loadMediaCommandContext } from "@/lib/media-command/load-context";
import { MediaAnalyticsAdmin } from "@/components/admin/media-command/media-analytics-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MediaAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId, bundle } = await loadMediaCommandContext(params.campaign);
  return <MediaAnalyticsAdmin campaignId={campaignId} bundle={bundle} />;
}
