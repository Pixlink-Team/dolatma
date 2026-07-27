import { redirect } from "next/navigation";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import * as pg from "@/lib/db/repository";
import { listAllStoredCampaignBackups } from "@/lib/services/campaign-backup";
import { BackupsAdmin } from "@/components/admin/backups-admin";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session)) redirect("/admin");

  if (!isPostgresConfigured()) {
    return (
      <BackupsAdmin campaigns={[]} initialBackups={[]} databaseReady={false} />
    );
  }

  const [campaigns, backups] = await Promise.all([
    pg.pgGetAllCampaigns(),
    listAllStoredCampaignBackups(),
  ]);

  const campaignOptions = campaigns.map((campaign) => ({
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
  }));

  return (
    <BackupsAdmin campaigns={campaignOptions} initialBackups={backups} databaseReady />
  );
}
