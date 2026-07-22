import { loadMediaCommandContext } from "@/lib/media-command/load-context";
import { MediaContentsAdmin } from "@/components/admin/media-command/media-contents-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MediaContentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId, bundle } = await loadMediaCommandContext(params.campaign);
  return <MediaContentsAdmin campaignId={campaignId} contents={bundle.contents} />;
}
