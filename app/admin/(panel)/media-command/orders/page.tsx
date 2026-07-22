import { loadMediaCommandContext } from "@/lib/media-command/load-context";
import { MediaOrdersAdmin } from "@/components/admin/media-command/media-orders-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MediaOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId, bundle } = await loadMediaCommandContext(params.campaign);
  return (
    <MediaOrdersAdmin
      campaignId={campaignId}
      orders={bundle.orders}
      accounts={bundle.accounts}
    />
  );
}
