import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CompanySupervisionAdmin } from "@/components/admin/company-supervision-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import {
  canScoreContent,
  canViewSubtreePerformance,
  isBroadPanelUser,
} from "@/lib/auth/access";
import {
  getAuthSession,
  getSubordinatesOwnerFilter,
  isFullAdmin,
} from "@/lib/auth/get-session";
import { ownerMatchesScope } from "@/lib/auth/owner-scope";
import { loadCompanySupervisionPage } from "@/lib/company-supervision-page";
import { isOrgUserRole } from "@/lib/user-roles";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ userKey: string }>;
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

export default async function CompanySupervisionPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getAuthSession();
  if (!session) redirect("/admin");

  const { userKey: rawUserKey } = await params;
  const userKey = decodeURIComponent(rawUserKey || "").trim();
  if (!userKey) notFound();

  const isSelf = Boolean(session.userId && session.userId === userKey);
  const canScore = canScoreContent(session);
  let canViewAsSubtreeManager = false;

  if (
    !canScore &&
    !isSelf &&
    isOrgUserRole(session.role) &&
    canViewSubtreePerformance(session)
  ) {
    const subordinateScope = await getSubordinatesOwnerFilter(session);
    canViewAsSubtreeManager = ownerMatchesScope(userKey, subordinateScope);
  }

  if (!canScore && !isSelf && !canViewAsSubtreeManager) {
    redirect("/admin");
  }

  const query = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(query.campaign);
  if (!campaignId) redirect("/admin");

  const result = await loadCompanySupervisionPage({
    campaignId,
    userKey,
    session,
    query,
    viewMode: isSelf ? "self" : "admin",
  });

  if (!result.ok) {
    if (result.reason === "no_campaign") redirect("/admin");
    const backHref =
      canViewAsSubtreeManager && !isFullAdmin(session) && !isBroadPanelUser(session)
        ? `/admin/subordinates-performance?campaign=${encodeURIComponent(campaignId)}`
        : `/admin/performance?campaign=${encodeURIComponent(campaignId)}`;
    return (
      <Card dir="rtl">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center text-right">
          <p className="text-muted-foreground">
            کاربر یا شرکتی با این شناسه در کمپین فعلی یافت نشد.
          </p>
          {!isSelf && (
            <Button asChild>
              <Link href={backHref}>بازگشت به مشاهده عملکرد</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return <CompanySupervisionAdmin {...result.props} />;
}
