import { redirect } from "next/navigation";
import { getAllCampaigns, getAllUsers } from "@/lib/data-access/admin";
import { canManageSubtreeUsers, isClientUser } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
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

  const actor =
    session.userId && isOrgUserRole(session.role) && isPostgresConfigured()
      ? await pgGetUserById(session.userId)
      : null;
  const actorPermissions =
    actor?.campaignIds[0] != null
      ? actor.campaignPermissions[actor.campaignIds[0]]
      : null;
  const canManageSubtree = canManageSubtreeUsers(session, actorPermissions);

  if (!isAdmin && !isClient && !canManageSubtree) redirect("/admin");

  if (isPostgresConfigured()) {
    await pgEnsureDefaultMinistries();
  }

  const [campaigns, ministries] = await Promise.all([
    getAllCampaigns(),
    isPostgresConfigured() ? pgListMinistries({ includeOrganizations: true }) : Promise.resolve([]),
  ]);

  if (canManageSubtree && !isAdmin && session.userId) {
    const [subUsers, parentUser] = await Promise.all([
      pgGetSubUsersForParent(session.userId),
      pgGetUserById(session.userId),
    ]);
    return (
      <UsersAdmin
        initialUsers={subUsers}
        campaigns={campaigns}
        ministries={ministries}
        mode="sub_users"
        parentUserId={session.userId}
        parentMinistryId={parentUser?.ministryId ?? null}
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
