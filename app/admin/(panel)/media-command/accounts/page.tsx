import { loadMediaCommandContext } from "@/lib/media-command/load-context";
import { MediaAccountsAdmin } from "@/components/admin/media-command/media-accounts-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MediaAccountsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId, bundle } = await loadMediaCommandContext(params.campaign);
  return <MediaAccountsAdmin campaignId={campaignId} accounts={bundle.accounts} />;
}
