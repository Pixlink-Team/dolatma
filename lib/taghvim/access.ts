import {
  hasAnyCampaignPermission,
  isClientUser,
} from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import type { AuthSession } from "@/lib/types";
import { redirect } from "next/navigation";

export async function assertDefenseCalendarAccess(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const allowed =
    isFullAdmin(session) ||
    isClientUser(session) ||
    session.role === "reis" ||
    (await hasAnyCampaignPermission(session, "defenseCalendar"));

  if (!allowed) redirect("/admin");
  return session;
}
