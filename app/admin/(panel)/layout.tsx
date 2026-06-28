import { getAllCampaigns } from "@/lib/data-access/admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgGetUserById } from "@/lib/db/repository-extended";
import AdminPanelShell from "@/components/admin/admin-panel-shell";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  const allCampaigns = await getAllCampaigns();

  let campaigns = allCampaigns;
  if (session && !isFullAdmin(session) && session.userId && isPostgresConfigured()) {
    const user = await pgGetUserById(session.userId);
    const allowed = new Set(user?.campaignIds ?? []);
    campaigns = allCampaigns.filter((campaign) => allowed.has(campaign.id));
  }

  return <AdminPanelShell campaigns={campaigns}>{children}</AdminPanelShell>;
}
