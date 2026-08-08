import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { getAuthSession } from "@/lib/auth/get-session";
import { requireContributorAccess } from "@/lib/auth/require-contributor-access";
import { REIS_MONITORING_BASE } from "@/lib/reis/monitoring-nav";
import { isReisRole } from "@/lib/user-roles";
import { adminHref } from "@/lib/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
}

function mapMonitoringPathToReis(pathname: string): string | null {
  if (pathname === "/admin/monitoring" || pathname === "/admin/monitoring/dashboard") {
    return `${REIS_MONITORING_BASE}/dashboard`;
  }
  if (pathname.startsWith("/admin/monitoring/")) {
    return `${REIS_MONITORING_BASE}${pathname.slice("/admin/monitoring".length)}`;
  }
  return null;
}

/**
 * Gate all monitoring routes by the `monitoring` contributor permission.
 * Campaign comes from ?campaign= (forwarded by middleware as x-admin-campaign).
 * Reis users are redirected into the dedicated /admin/reis/monitoring tree.
 */
export default async function MonitoringLayout({ children }: LayoutProps) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const campaignParam = headerList.get("x-admin-campaign") ?? undefined;
  const { campaignId } = await resolveAdminCampaignId(campaignParam);
  if (!campaignId) redirect("/admin");

  const session = await getAuthSession();
  if (session && isReisRole(session.role)) {
    const target = mapMonitoringPathToReis(pathname);
    if (target) {
      redirect(adminHref(target, campaignId));
    }
  }

  await requireContributorAccess(campaignId, "monitoring");
  return children;
}
