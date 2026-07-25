import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { getAuthSession } from "@/lib/auth/get-session";
import { canManageFormsForCampaign } from "@/lib/auth/access";
import { FormsAdmin } from "@/components/admin/forms-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function FormsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");

  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!(await canManageFormsForCampaign(session, campaignId))) redirect("/admin");

  return <FormsAdmin campaignId={campaignId} canManage />;
}
