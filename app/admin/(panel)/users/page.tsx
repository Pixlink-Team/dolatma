import { redirect } from "next/navigation";
import { getAllCampaigns, getAllUsers } from "@/lib/data-access/admin";
import { canManageSubtreeUsers, isClientUser } from "@/lib/auth/access";
import { listAccessibleDevices } from "@/lib/auth/device-access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { scopeMinistriesForOrgUser } from "@/lib/auth/scope-ministries-for-org-user";
import { UsersAdmin } from "@/components/admin/users-admin";
import { pgGetSubUsersForParent, pgGetUserById } from "@/lib/db/repository-extended";
import { pgEnsureDefaultMinistries, pgListMinistries } from "@/lib/db/repository-ministries";
import { isOrgUserRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";

export default async function UsersPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const isAdmin = isFullAdmin(session);
  const isClient = isClientUser(session);
  const isOrgUser = isOrgUserRole(session.role);

  const canManageSubtree = canManageSubtreeUsers(session);

  // Org users keep structure visibility even when manageSubtreeUsers is revoked.
  if (!isAdmin && !isClient && !isOrgUser) redirect("/admin");

  if (isPostgresConfigured()) {
    await pgEnsureDefaultMinistries();
  }

  const [campaigns, ministries] = await Promise.all([
    getAllCampaigns(),
    isPostgresConfigured() ? pgListMinistries({ includeOrganizations: true }) : Promise.resolve([]),
  ]);

  if (isOrgUser && !isAdmin && session.userId) {
    const [subUsers, parentUser, accessibleDevices] = await Promise.all([
      pgGetSubUsersForParent(session.userId),
      pgGetUserById(session.userId),
      listAccessibleDevices(session),
    ]);
    const scopedMinistries = parentUser
      ? scopeMinistriesForOrgUser(ministries, parentUser, accessibleDevices)
      : [];
    return (
      <UsersAdmin
        initialUsers={subUsers}
        campaigns={campaigns}
        ministries={scopedMinistries}
        mode={canManageSubtree ? "sub_users" : "view_subtree"}
        parentUserId={session.userId}
        parentMinistryId={parentUser?.ministryId ?? null}
        parentOrganizationId={parentUser?.organizationId ?? null}
      />
    );
  }

  const users = await getAllUsers();
  return (
    <UsersAdmin
      initialUsers={users}
      campaigns={campaigns}
      ministries={ministries}
      mode={isAdmin ? "full" : "ministry"}
    />
  );
}
