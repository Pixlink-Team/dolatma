import { redirect } from "next/navigation";
import { DirectiveOpsPanels } from "@/components/admin/directive-ops-panels";
import { DirectiveWorkspaceAdmin } from "@/components/admin/directive-workspace-admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import {
  canManageDirectiveRecord,
  canManageDirectivesGlobally,
  canViewDirectives,
  isScopedDirectiveIssuer,
} from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgListDirectiveBlockers } from "@/lib/db/repository-blockers";
import {
  pgGetDirectiveWorkspaceBundle,
  pgListReplacementAlertsForDirective,
  pgListReplacementAlertsForUser,
} from "@/lib/db/repository-directive-workspace";
import {
  pgGetDirectiveById,
  pgListCampaignUsersForDirectives,
  pgListDirectiveRecipients,
  pgListDirectivesForUserInbox,
} from "@/lib/db/repository-directives";
import { pgGetUserPermissionsForCampaign } from "@/lib/db/repository-extended";
import { pgListMinistries } from "@/lib/db/repository-ministries";
import { isPostgresConfigured } from "@/lib/utils";
import { withFileAccessTokensDeep } from "@/lib/uploads";
import { processCrisisEscalationAction } from "@/lib/actions/directive-actions";
import { pgGetMediaOpsSnapshot } from "@/lib/db/repository-media-command";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaign?: string }>;
}

export default async function DirectiveWorkspacePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(query.campaign);
  if (!campaignId) redirect("/admin/campaigns");

  const session = await getAuthSession();
  if (!session || !canViewDirectives(session)) redirect("/admin/login");

  if (!isFullAdmin(session)) {
    if (!session.userId || !isPostgresConfigured()) redirect("/admin");
    const membership = await pgGetUserPermissionsForCampaign(session.userId, campaignId);
    if (!membership) redirect("/admin");
  }

  if (!isPostgresConfigured()) {
    redirect(`/admin/directives?campaign=${campaignId}`);
  }

  const directive = await pgGetDirectiveById(id);
  if (!directive || directive.campaignId !== campaignId) {
    redirect(`/admin/directives?campaign=${campaignId}`);
  }

  const canManage = canManageDirectiveRecord(session, directive);

  if (!canManage && session.userId) {
    const inbox = await pgListDirectivesForUserInbox(campaignId, session.userId);
    if (!inbox.some((item) => item.id === id)) {
      redirect(`/admin/directives?campaign=${campaignId}`);
    }
  } else if (!canManage) {
    redirect(`/admin/directives?campaign=${campaignId}`);
  }

  const audienceScope = canManageDirectivesGlobally(session)
    ? "global"
    : isScopedDirectiveIssuer(session)
      ? "subordinates"
      : "global";

  const [bundle, alerts, campaignUsers, ministries, recipients, blockers, mediaSnapshot] =
    await Promise.all([
      pgGetDirectiveWorkspaceBundle(id, {
        pendingAlertsForUserId: canManage ? null : session.userId,
      }),
      canManage
        ? pgListReplacementAlertsForDirective(id)
        : session.userId
          ? pgListReplacementAlertsForUser(session.userId, { directiveId: id })
          : Promise.resolve([]),
      canManage
        ? pgListCampaignUsersForDirectives(campaignId, {
            parentUserId:
              audienceScope === "subordinates" ? session.userId ?? undefined : undefined,
          })
        : Promise.resolve([]),
      pgListMinistries({ includeOrganizations: true }),
      pgListDirectiveRecipients(id),
      pgListDirectiveBlockers(id),
      pgGetMediaOpsSnapshot(campaignId, id).catch(() => null),
    ]);

  if (!bundle) {
    redirect(`/admin/directives?campaign=${campaignId}`);
  }

  if (directive.crisisMode && canManage) {
    void processCrisisEscalationAction(id, campaignId);
  }

  return (
    <div className="space-y-6">
      <DirectiveOpsPanels
        directive={directive}
        recipients={recipients}
        blockers={blockers}
        canManage={canManage}
        currentUserId={session.userId}
      />
      <DirectiveWorkspaceAdmin
        campaignId={campaignId}
        canManage={canManage}
        initialBundle={withFileAccessTokensDeep(bundle)}
        initialAlerts={withFileAccessTokensDeep(alerts)}
        campaignUsers={campaignUsers}
        ministries={ministries}
        mediaSnapshot={mediaSnapshot}
      />
    </div>
  );
}
