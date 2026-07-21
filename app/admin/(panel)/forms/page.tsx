import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { requireContributorAccess } from "@/lib/auth/require-contributor-access";
import { getAuthSession } from "@/lib/auth/get-session";
import { canManageForms } from "@/lib/auth/access";
import { FormsAdmin } from "@/components/admin/forms-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function FormsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin/campaigns");

  await requireContributorAccess(campaignId, "forms");

  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  return (
    <FormsAdmin campaignId={campaignId} canManage={canManageForms(session)} />
  );
}
