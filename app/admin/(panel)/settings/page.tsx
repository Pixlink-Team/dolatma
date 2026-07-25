import { redirect } from "next/navigation";
import { getAdminData } from "@/lib/data-access/admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { SettingsAdmin } from "@/components/admin/settings-admin";
import { canAccessCampaignSettingsForCampaign } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");

  if (!(await canAccessCampaignSettingsForCampaign(session, campaignId))) {
    redirect("/admin");
  }

  const data = await getAdminData(campaignId, ["settings", "campaigns"]);
  if (!data.settings) redirect("/admin");

  return (
    <SettingsAdmin
      initialSettings={data.settings}
      canEditFullSettings={isFullAdmin(session)}
      hasPagePassword={Boolean(data.settings.pageViewPasswordHash)}
    />
  );
}
