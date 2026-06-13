import { getAllCampaigns } from "@/lib/data-access/admin";
import AdminPanelShell from "@/components/admin/admin-panel-shell";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const campaigns = await getAllCampaigns();
  return <AdminPanelShell campaigns={campaigns}>{children}</AdminPanelShell>;
}
