import { redirect } from "next/navigation";
import { DirectiveWorkspaceAdmin } from "@/components/admin/directive-workspace-admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { canManageDirectives, canViewDirectives } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgGetDirectiveWorkspaceBundle,
  pgListReplacementAlertsForDirective,
  pgListReplacementAlertsForUser,
} from "@/lib/db/repository-directive-workspace";
import {
  pgGetDirectiveById,
  pgListCampaignUsersForDirectives,
  pgListDirectivesForUserInbox,
} from "@/lib/db/repository-directives";
import { pgGetUserPermissionsForCampaign } from "@/lib/db/repository-extended";
import { pgListMinistries } from "@/lib/db/repository-ministries";
import { isPostgresConfigured } from "@/lib/utils";
import { withFileAccessTokensDeep } from "@/lib/uploads";

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

  const canManage = canManageDirectives(session);

  if (!canManage && session.userId) {
    const inbox = await pgListDirectivesForUserInbox(campaignId, session.userId);
    if (!inbox.some((item) => item.id === id)) {
      redirect(`/admin/directives?campaign=${campaignId}`);
    }
  }

  const [bundle, alerts, campaignUsers, ministries] = await Promise.all([
    pgGetDirectiveWorkspaceBundle(id, {
      pendingAlertsForUserId: canManage ? null : session.userId,
    }),
    canManage
      ? pgListReplacementAlertsForDirective(id)
      : session.userId
        ? pgListReplacementAlertsForUser(session.userId, { directiveId: id })
        : Promise.resolve([]),
    canManage ? pgListCampaignUsersForDirectives(campaignId) : Promise.resolve([]),
    pgListMinistries({ includeOrganizations: true }),
  ]);

  if (!bundle) {
    redirect(`/admin/directives?campaign=${campaignId}`);
  }

  return (
    <DirectiveWorkspaceAdmin
      campaignId={campaignId}
      canManage={canManage}
      initialBundle={withFileAccessTokensDeep(bundle)}
      initialAlerts={withFileAccessTokensDeep(alerts)}
      campaignUsers={campaignUsers}
      ministries={ministries}
    />
  );
}
