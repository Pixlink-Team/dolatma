import { redirect } from "next/navigation";
import { ReadyProductionsAdmin } from "@/components/admin/ready-productions-admin";
import { listPublishableProductionsAction } from "@/lib/actions/production-source-actions";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { getAuthSession } from "@/lib/auth/get-session";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReadyProductionsPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");

  const result = await listPublishableProductionsAction(campaignId, {
    onlyDirectiveAssets: true,
  });
  if (!result.success) redirect("/admin");

  return <ReadyProductionsAdmin campaignId={campaignId} items={result.items} />;
}
