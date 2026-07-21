import { redirect } from "next/navigation";
import { getAdminData } from "@/lib/data-access/admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { requireContributorAccess } from "@/lib/auth/require-contributor-access";
import { CompanyWebsitesAdmin } from "@/components/admin/company-websites-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function CompanyWebsitesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");
  await requireContributorAccess(campaignId, "analytics");
  const data = await getAdminData(campaignId, ["analytics"]);
  return (
    <CompanyWebsitesAdmin
      campaignId={campaignId}
      initialItems={data.companyWebsites ?? []}
    />
  );
}
