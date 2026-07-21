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
import { pgGetUserPermissionsForCampaign } from "@/lib/db/repository-extended";
import {
  pgListArchivedDirectivesForCampaign,
  pgListCampaignUsersForDirectives,
  pgListDirectivesForCampaign,
  pgListDirectivesForUserInbox,
} from "@/lib/db/repository-directives";
import { pgListMinistries } from "@/lib/db/repository-ministries";
import { isPostgresConfigured } from "@/lib/utils";
import { withFileAccessTokensDeep } from "@/lib/uploads";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function DirectivesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin/campaigns");

  const session = await getAuthSession();
  if (!session || !canViewDirectives(session)) redirect("/admin/login");

  if (!isFullAdmin(session)) {
    if (!session.userId || !isPostgresConfigured()) redirect("/admin");
    const membership = await pgGetUserPermissionsForCampaign(session.userId, campaignId);
    if (!membership) redirect("/admin");
  }

  const canManage = canManageDirectives(session);
  const audienceScope = canManageDirectivesGlobally(session)
    ? "global"
    : isScopedDirectiveIssuer(session)
      ? "subordinates"
      : "global";
  const createdByFilter =
    isScopedDirectiveIssuer(session) && session.userId
      ? { createdByUserId: session.userId }
      : undefined;

  if (!isPostgresConfigured()) {
    return (
      <DirectivesAdmin
        campaignId={campaignId}
        canManage={canManage}
        audienceScope={audienceScope}
        initialDirectives={[]}
        archivedDirectives={[]}
        inboxDirectives={[]}
        campaignUsers={[]}
        ministries={[]}
      />
    );
  }

  const [manageDirectives, archivedDirectives, inboxDirectives, campaignUsers, ministries] =
    await Promise.all([
      canManage
        ? pgListDirectivesForCampaign(campaignId, createdByFilter)
        : Promise.resolve([]),
      canManage
        ? pgListArchivedDirectivesForCampaign(campaignId, createdByFilter)
        : Promise.resolve([]),
      session.userId
        ? pgListDirectivesForUserInbox(campaignId, session.userId)
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
    ]);

  const initialDirectives = canManage ? manageDirectives : inboxDirectives;

  return (
    <DirectivesAdmin
      campaignId={campaignId}
      canManage={canManage}
      audienceScope={audienceScope}
      initialDirectives={withFileAccessTokensDeep(initialDirectives)}
      archivedDirectives={withFileAccessTokensDeep(archivedDirectives)}
      inboxDirectives={withFileAccessTokensDeep(inboxDirectives)}
      campaignUsers={campaignUsers}
      ministries={ministries}
    />
  );
}
