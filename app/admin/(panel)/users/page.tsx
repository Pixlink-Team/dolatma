import { redirect } from "next/navigation";
import { getAllCampaigns, getAllUsers } from "@/lib/data-access/admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { UsersAdmin } from "@/components/admin/users-admin";

export default async function UsersPage() {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) redirect("/admin");

  const [users, campaigns] = await Promise.all([getAllUsers(), getAllCampaigns()]);
  return <UsersAdmin initialUsers={users} campaigns={campaigns} />;
}
