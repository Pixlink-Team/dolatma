import { RawMediaAdmin } from "@/components/admin/raw-media-admin";
import { getAdminData } from "@/lib/data-access/admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import type { RawMediaUpload } from "@/lib/types";
import { redirect } from "next/navigation";

interface RawMediaPageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function RawMediaPage({ searchParams }: RawMediaPageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);

  if (!campaignId) redirect("/admin/campaigns");

  const data = await getAdminData(campaignId);
  if (!data.settings) redirect("/admin/campaigns");

  return (
    <RawMediaAdmin
      campaignId={campaignId}
      initialItems={(data.rawMedia ?? []) as RawMediaUpload[]}
      contentPlans={data.settings?.contentPlans ?? []}
    />
  );
}
