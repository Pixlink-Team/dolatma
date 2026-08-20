import { redirect } from "next/navigation";
import { CompanySupervisionAdmin } from "@/components/admin/company-supervision-admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { canScoreContent } from "@/lib/auth/access";
import { getAuthSession } from "@/lib/auth/get-session";
import { loadCompanySupervisionPage } from "@/lib/company-supervision-page";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    campaign?: string;
    date?: string;
    from?: string;
    to?: string;
    category?: string;
    province?: string;
    city?: string;
    companyType?: string;
    region?: string;
    topics?: string;
    sort?: string;
  }>;
}

export default async function MyPerformancePage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session) redirect("/admin");

  if (!session.userId) {
    if (canScoreContent(session)) redirect("/admin/performance");
    redirect("/admin");
  }

  const query = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(query.campaign);
  if (!campaignId) redirect("/admin");

  const result = await loadCompanySupervisionPage({
    campaignId,
    userKey: session.userId,
    session,
    query,
    viewMode: "self",
  });

  if (!result.ok) {
    redirect("/admin");
  }

  return <CompanySupervisionAdmin {...result.props} />;
}
