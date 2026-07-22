import { loadMediaCommandContext } from "@/lib/media-command/load-context";
import { MediaLibraryAdmin } from "@/components/admin/media-command/media-library-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MediaLibraryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId, bundle } = await loadMediaCommandContext(params.campaign);
  return <MediaLibraryAdmin campaignId={campaignId} items={bundle.library} />;
}
