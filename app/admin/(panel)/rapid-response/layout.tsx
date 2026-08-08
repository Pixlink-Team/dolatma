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

function mapRapidResponsePathToReis(pathname: string): string | null {
  if (pathname === "/admin/rapid-response/cases") {
    return `${REIS_MONITORING_BASE}/cases`;
  }
  if (pathname.startsWith("/admin/rapid-response/cases/")) {
    const id = pathname.slice("/admin/rapid-response/cases/".length);
    if (id) return `${REIS_MONITORING_BASE}/cases/${id}`;
  }
  return null;
}

/** Rapid response is part of the monitoring product surface. */
export default async function RapidResponseLayout({ children }: LayoutProps) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const campaignParam = headerList.get("x-admin-campaign") ?? undefined;
  const { campaignId } = await resolveAdminCampaignId(campaignParam);
  if (!campaignId) redirect("/admin");

  const session = await getAuthSession();
  if (session && isReisRole(session.role)) {
    const target = mapRapidResponsePathToReis(pathname);
    if (target) {
      redirect(adminHref(target, campaignId));
    }
  }

  await requireContributorAccess(campaignId, "monitoring");
  return children;
}
