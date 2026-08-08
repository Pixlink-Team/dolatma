import { redirect } from "next/navigation";
import { getAllCampaigns } from "@/lib/data-access/admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgGetUserById } from "@/lib/db/repository-extended";
import AdminPanelShell from "@/components/admin/admin-panel-shell";
import { isReisAllowedPath, REIS_HOME_PATH } from "@/lib/reis/sections";
import { isReisRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  // Signed cookie can still pass middleware after session revocation — kick out silently.
  if (!session) {
    redirect("/api/auth/clear-session");
  }

  if (isReisRole(session.role)) {
    const headerStore = await headers();
    const pathname = headerStore.get("x-pathname") ?? "";
    if (pathname && !isReisAllowedPath(pathname)) {
      redirect(REIS_HOME_PATH);
    }
  }

  const allCampaigns = await getAllCampaigns();

  let campaigns = allCampaigns;
  if (session && !isFullAdmin(session) && session.userId && isPostgresConfigured()) {
    try {
      const user = await pgGetUserById(session.userId);
      const allowed = new Set(user?.campaignIds ?? []);
      campaigns = allCampaigns.filter((campaign) => allowed.has(campaign.id));
    } catch (error) {
      console.error("[admin-layout] failed to load user campaign access", error);
    }
  }

  return <AdminPanelShell campaigns={campaigns}>{children}</AdminPanelShell>;
}
