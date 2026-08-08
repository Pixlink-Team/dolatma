import { redirect } from "next/navigation";
import { ReisMonitoringAdmin } from "@/components/admin/reis/reis-monitoring-admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { requireContributorAccess } from "@/lib/auth/require-contributor-access";
import { REIS_HOME_PATH } from "@/lib/reis/sections";
import { isReisRole } from "@/lib/user-roles";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReisMonitoringPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect(REIS_HOME_PATH);

  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  if (
    !isReisRole(session.role) &&
    !isFullAdmin(session) &&
    session.role !== "client"
  ) {
    redirect(REIS_HOME_PATH);
  }

  await requireContributorAccess(campaignId, "monitoring");

  return <ReisMonitoringAdmin campaignId={campaignId} />;
}
