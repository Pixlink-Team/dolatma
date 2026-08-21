import { redirect } from "next/navigation";
import { CampaignDashboard } from "@/components/public/campaign-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import {
  canScoreContent,
  canViewSubtreeLiveReport,
  isBroadPanelUser,
} from "@/lib/auth/access";
import { resolveCampaignAuthViewer } from "@/lib/auth/campaign-viewer";
import {
  getAuthSession,
  getSubordinatesOwnerFilter,
  isFullAdmin,
} from "@/lib/auth/get-session";
import { getAdminData } from "@/lib/data-access/admin";
import { getPublicCampaignDataForOwners } from "@/lib/data-access/campaign";
import { isOrgUserRole } from "@/lib/user-roles";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function SubordinatesLiveReportPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session || !canViewSubtreeLiveReport(session)) {
    redirect("/admin");
  }

  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");

  // Admin / client / reis already have the public campaign report.
  if (isFullAdmin(session) || isBroadPanelUser(session)) {
    const adminData = await getAdminData(campaignId, ["settings"]);
    const slug = adminData.settings?.slug;
    if (slug) redirect(`/campaign/${encodeURIComponent(slug)}`);
    redirect("/admin");
  }

  if (!isOrgUserRole(session.role)) {
    redirect("/admin");
  }

  const ownerScope = await getSubordinatesOwnerFilter(session);
  if (ownerScope === null || (Array.isArray(ownerScope) && ownerScope.length === 0)) {
    return (
      <Card dir="rtl">
        <CardContent className="space-y-2 p-8 text-right">
          <h1 className="text-xl font-bold">گزارش زنده زیردستان</h1>
          <p className="text-sm text-muted-foreground">
            هنوز کاربری در زیرمجموعه شما ثبت نشده است. پس از افزودن زیردستان، گزارش زنده محتوای آن‌ها
            اینجا نمایش داده می‌شود.
          </p>
        </CardContent>
      </Card>
    );
  }

  const adminData = await getAdminData(campaignId, ["settings"]);
  const slug = adminData.settings?.slug;
  if (!slug) redirect("/admin");

  const data = await getPublicCampaignDataForOwners(slug, ownerScope);
  if (!data) redirect("/admin");

  const authViewer = await resolveCampaignAuthViewer(session);
  const canScore = canScoreContent(session);
  const dataUrl = `/api/admin/subordinates-campaign?campaign=${encodeURIComponent(slug)}`;

  const banner = (
    <div>
      <p className="text-xs text-muted-foreground">گزارش زنده محدود به زیردستان</p>
      <p className="font-semibold">فقط محتوای کاربران زیرمجموعه شما</p>
    </div>
  );

  return (
    <div className="min-w-0">
      <CampaignDashboard
        initialData={data}
        slug={slug}
        canScore={canScore}
        authViewer={authViewer}
        dataUrl={dataUrl}
        returnPath="/admin/subordinates-live-report"
        hideCitiesLink
        banner={banner}
        embedded
      />
    </div>
  );
}
