import { getAllUsers } from "@/lib/data-access/admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import type { AdminUser } from "@/lib/types";

export async function getAdminBulkEditProps(): Promise<{
  isFullAdmin: boolean;
  users: AdminUser[];
}> {
  const session = await getAuthSession();
  const fullAdmin = Boolean(session && isFullAdmin(session));
  return {
    isFullAdmin: fullAdmin,
    users: fullAdmin ? await getAllUsers() : [],
  };
}
