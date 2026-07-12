import { redirect } from "next/navigation";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { adminHref } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

/** Legacy route — bulk edit now lives inside each content section. */
export default async function GroupEditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin/campaigns");
  redirect(adminHref("/admin", campaignId));
}
