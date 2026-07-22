import { loadMediaCommandContext } from "@/lib/media-command/load-context";
import { MediaPublishStudioAdmin } from "@/components/admin/media-command/media-publish-studio-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string; edit?: string }>;
}

export default async function MediaPublishPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId, bundle } = await loadMediaCommandContext(params.campaign);
  return (
    <MediaPublishStudioAdmin
      campaignId={campaignId}
      accounts={bundle.accounts}
      contents={bundle.contents}
      editId={params.edit ?? null}
    />
  );
}
