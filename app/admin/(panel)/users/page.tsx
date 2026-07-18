import { redirect } from "next/navigation";
import { getAllCampaigns, getAllUsers } from "@/lib/data-access/admin";
import { isClientUser } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { UsersAdmin } from "@/components/admin/users-admin";
import { pgGetSubUsersForParent, pgGetUserById } from "@/lib/db/repository-extended";
import { pgEnsureDefaultMinistries, pgListMinistries } from "@/lib/db/repository-ministries";
import { isMinistryParentRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";

export default async function UsersPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const isAdmin = isFullAdmin(session);
  const isClient = isClientUser(session);
  const isParent = isMinistryParentRole(session.role);
  if (!isAdmin && !isClient && !isParent) redirect("/admin");

  if (isPostgresConfigured()) {
    await pgEnsureDefaultMinistries();
  }

  const [campaigns, ministries] = await Promise.all([
    getAllCampaigns(),
    isPostgresConfigured() ? pgListMinistries({ includeOrganizations: true }) : Promise.resolve([]),
  ]);

  if (isParent && session.userId) {
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
