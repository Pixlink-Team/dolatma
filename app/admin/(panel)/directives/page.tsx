import { redirect } from "next/navigation";
import { DirectivesAdmin } from "@/components/admin/directives-admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import {
  canManageDirectives,
  canManageDirectivesGlobally,
  canViewDirectives,
  isScopedDirectiveIssuer,
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
import {
  pgListStrategicUpwardRequestsByRequester,
  pgListStrategicUpwardRequestsForTarget,
} from "@/lib/db/repository-strategic-requests";
import { isPostgresConfigured } from "@/lib/utils";
import { withFileAccessTokensDeep } from "@/lib/uploads";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function DirectivesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");

  const session = await getAuthSession();
  if (!session || !canViewDirectives(session)) redirect("/admin/login");
  await requireContributorAccess(campaignId, "directives");

  const campaignPermissions =
    session.userId &&
    isPostgresConfigured() &&
    !isFullAdmin(session) &&
    session.role !== "client" &&
    session.role !== "reis"
      ? await pgGetUserPermissionsForCampaign(session.userId, campaignId)
      : null;
  const canManage = canManageDirectives(session, campaignPermissions);
  const audienceScope = canManageDirectivesGlobally(session)
    ? "global"
    : isScopedDirectiveIssuer(session)
      ? "subordinates"
      : "global";
  const createdByFilter =
    isScopedDirectiveIssuer(session) && session.userId
      ? { createdByUserId: session.userId }
      : undefined;

  const canCreateUpwardRequest =
    Boolean(session.userId) && !canManageDirectivesGlobally(session);
  const canRespondUpwardRequest =
    canManage && !canManageDirectivesGlobally(session);

  if (!isPostgresConfigured()) {
    return (
      <DirectivesAdmin
        campaignId={campaignId}
        canManage={canManage}
        audienceScope={audienceScope}
        initialDirectives={[]}
        archivedDirectives={[]}
        inboxDirectives={[]}
        rejectedSubmissions={[]}
        campaignUsers={[]}
        ministries={[]}
        upwardRequests={[]}
        canCreateUpwardRequest={canCreateUpwardRequest}
        canRespondUpwardRequest={canRespondUpwardRequest}
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
    incomingRequests,
    myRequests,
  ] = await Promise.all([
    canManage
      ? pgListDirectivesForCampaign(campaignId, createdByFilter)
      : Promise.resolve([]),
    canManage
      ? pgListArchivedDirectivesForCampaign(campaignId, createdByFilter)
      : Promise.resolve([]),
    session.userId
      ? pgListDirectivesForUserInbox(campaignId, session.userId)
      : Promise.resolve([]),
    session.userId
      ? listRejectedSubmissionsForOwner(campaignId, session.userId)
      : Promise.resolve([]),
    canManage
      ? pgListCampaignUsersForDirectives(campaignId, {
          parentUserId:
            audienceScope === "subordinates" ? session.userId ?? undefined : undefined,
        })
      : Promise.resolve([]),
    canManage && audienceScope === "global"
      ? pgListMinistries({ includeOrganizations: true })
      : Promise.resolve([]),
    session.userId && (canCreateUpwardRequest || canRespondUpwardRequest)
      ? pgListStrategicUpwardRequestsForTarget(campaignId, session.userId)
      : Promise.resolve([]),
    session.userId && canCreateUpwardRequest
      ? pgListStrategicUpwardRequestsByRequester(campaignId, session.userId)
      : Promise.resolve([]),
  ]);

  const initialDirectives = canManage ? manageDirectives : inboxDirectives;
  const upwardById = new Map(
    [...incomingRequests, ...myRequests].map((row) => [row.id, row])
  );

  return (
    <DirectivesAdmin
      campaignId={campaignId}
      canManage={canManage}
      audienceScope={audienceScope}
      isFullAdmin={isFullAdmin(session)}
      initialDirectives={withFileAccessTokensDeep(initialDirectives)}
      archivedDirectives={withFileAccessTokensDeep(archivedDirectives)}
      inboxDirectives={withFileAccessTokensDeep(inboxDirectives)}
      rejectedSubmissions={rejectedSubmissions}
      campaignUsers={campaignUsers}
      ministries={ministries}
      upwardRequests={Array.from(upwardById.values())}
      canCreateUpwardRequest={canCreateUpwardRequest}
      canRespondUpwardRequest={canRespondUpwardRequest}
    />
  );
}
