import { redirect } from "next/navigation";
import { ReisStrategicAdmin } from "@/components/admin/reis/reis-strategic-admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import {
  canManageDirectives,
  canManageDirectivesGlobally,
  canViewDirectives,
} from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { requireContributorAccess } from "@/lib/auth/require-contributor-access";
import { listRejectedSubmissionsForOwner } from "@/lib/data-access/admin";
import { pgGetUserPermissionsForCampaign } from "@/lib/db/repository-extended";
import {
  pgListArchivedDirectivesForCampaign,
  pgListCampaignUsersForDirectives,
  pgListDirectivesForCampaign,
  pgListDirectivesForUserInbox,
} from "@/lib/db/repository-directives";
import { pgListMinistries } from "@/lib/db/repository-ministries";
import { pgListStrategicUpwardRequestsForCampaign } from "@/lib/db/repository-strategic-requests";
import { REIS_HOME_PATH } from "@/lib/reis/sections";
import { isReisRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";
import { withFileAccessTokensDeep } from "@/lib/uploads";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function ReisStrategicPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect(REIS_HOME_PATH);

  const session = await getAuthSession();
  if (!session || !canViewDirectives(session)) redirect("/admin/login");

  // Admin/client may preview; reis is the primary audience.
  if (
    !isReisRole(session.role) &&
    !isFullAdmin(session) &&
    session.role !== "client"
  ) {
    redirect(REIS_HOME_PATH);
  }

  await requireContributorAccess(campaignId, "directives");

  const campaignPermissions =
    session.userId &&
    isPostgresConfigured() &&
    !isFullAdmin(session) &&
    session.role !== "client" &&
    !isReisRole(session.role)
      ? await pgGetUserPermissionsForCampaign(session.userId, campaignId)
      : null;

  const canManage = canManageDirectives(session, campaignPermissions);
  if (!canManage || !canManageDirectivesGlobally(session)) {
    // Reis/client/admin should always manage globally; fail closed otherwise.
    redirect(REIS_HOME_PATH);
  }

  if (!isPostgresConfigured()) {
    return (
      <ReisStrategicAdmin
        campaignId={campaignId}
        currentUserId={session.userId ?? null}
        initialDirectives={[]}
        archivedDirectives={[]}
        inboxDirectives={[]}
        rejectedSubmissions={[]}
        campaignUsers={[]}
        ministries={[]}
        upwardRequests={[]}
        canCreateUpwardRequest={false}
      />
    );
  }

  const [
    manageDirectives,
    archivedDirectives,
    inboxDirectives,
    rejectedSubmissions,
    campaignUsers,
    ministries,
    upwardRequests,
  ] = await Promise.all([
    pgListDirectivesForCampaign(campaignId),
    pgListArchivedDirectivesForCampaign(campaignId),
    session.userId
      ? pgListDirectivesForUserInbox(campaignId, session.userId)
      : Promise.resolve([]),
    session.userId
      ? listRejectedSubmissionsForOwner(campaignId, session.userId)
      : Promise.resolve([]),
    pgListCampaignUsersForDirectives(campaignId),
    pgListMinistries({ includeOrganizations: true }),
    pgListStrategicUpwardRequestsForCampaign(campaignId),
  ]);

  return (
    <ReisStrategicAdmin
      campaignId={campaignId}
      currentUserId={session.userId ?? null}
      initialDirectives={withFileAccessTokensDeep(manageDirectives)}
      archivedDirectives={withFileAccessTokensDeep(archivedDirectives)}
      inboxDirectives={withFileAccessTokensDeep(inboxDirectives)}
      rejectedSubmissions={rejectedSubmissions}
      campaignUsers={campaignUsers}
      ministries={ministries}
      upwardRequests={upwardRequests}
      canCreateUpwardRequest={false}
    />
  );
}
