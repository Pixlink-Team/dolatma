import { redirect } from "next/navigation";
import { getAllCampaigns, getAllUsers } from "@/lib/data-access/admin";
import { isClientUser } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { UsersAdmin } from "@/components/admin/users-admin";
import { pgGetSubUsersForParent } from "@/lib/db/repository-extended";
import { pgListMinistries } from "@/lib/db/repository-ministries";
import { isMinistryParentRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";

export default async function UsersPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const isAdmin = isFullAdmin(session);
  const isClient = isClientUser(session);
  const isParent = isMinistryParentRole(session.role);
  if (!isAdmin && !isClient && !isParent) redirect("/admin");

  const [campaigns, ministries] = await Promise.all([
    getAllCampaigns(),
    isPostgresConfigured() ? pgListMinistries() : Promise.resolve([]),
  ]);

  if (isParent && session.userId) {
    const subUsers = await pgGetSubUsersForParent(session.userId);
    return (
      <UsersAdmin
        initialUsers={subUsers}
        campaigns={campaigns}
        ministries={ministries}
        mode="sub_users"
        parentUserId={session.userId}
      />
    );
  }

  const users = await getAllUsers();
  return (
    <UsersAdmin
      initialUsers={users}
      campaigns={campaigns}
      ministries={ministries}
      mode={isAdmin ? "full" : "region"}
    />
  );
}
