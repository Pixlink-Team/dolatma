import { loadMediaCommandContext } from "@/lib/media-command/load-context";
import { MediaInboxAdmin } from "@/components/admin/media-command/media-inbox-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MediaInboxPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId, bundle } = await loadMediaCommandContext(params.campaign);
  return (
    <MediaInboxAdmin campaignId={campaignId} interactions={bundle.interactions} />
  );
}
