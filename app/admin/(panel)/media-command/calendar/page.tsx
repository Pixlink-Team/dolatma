import { loadMediaCommandContext } from "@/lib/media-command/load-context";
import { MediaCalendarAdmin } from "@/components/admin/media-command/media-calendar-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function MediaCalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId, bundle } = await loadMediaCommandContext(params.campaign);
  return (
    <MediaCalendarAdmin
      campaignId={campaignId}
      contents={bundle.contents}
      accounts={bundle.accounts}
    />
  );
}
