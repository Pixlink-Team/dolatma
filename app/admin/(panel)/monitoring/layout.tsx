import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { requireContributorAccess } from "@/lib/auth/require-contributor-access";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Gate all monitoring routes by the `monitoring` contributor permission.
 * Campaign comes from ?campaign= (forwarded by middleware as x-admin-campaign).
 */
export default async function MonitoringLayout({ children }: LayoutProps) {
  const headerList = await headers();
  const campaignParam = headerList.get("x-admin-campaign") ?? undefined;
  const { campaignId } = await resolveAdminCampaignId(campaignParam);
  if (!campaignId) redirect("/admin");
  await requireContributorAccess(campaignId, "monitoring");
  return children;
}
