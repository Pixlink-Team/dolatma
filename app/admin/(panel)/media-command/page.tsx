import { loadMediaCommandContext } from "@/lib/media-command/load-context";
import { MediaCommandDashboardAdmin } from "@/components/admin/media-command/media-command-dashboard-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MediaCommandDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId, bundle } = await loadMediaCommandContext(params.campaign);
  return <MediaCommandDashboardAdmin campaignId={campaignId} bundle={bundle} />;
}
