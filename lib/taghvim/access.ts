import {
  hasAnyCampaignPermission,
  isClientUser,
} from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import type { AuthSession } from "@/lib/types";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function sessionHasDefenseCalendarAccess(
  session: AuthSession
): Promise<boolean> {
  return (
    isFullAdmin(session) ||
    isClientUser(session) ||
    session.role === "reis" ||
    (await hasAnyCampaignPermission(session, "defenseCalendar"))
  );
}

export async function assertDefenseCalendarAccess(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  if (!(await sessionHasDefenseCalendarAccess(session))) {
    redirect("/admin");
  }
  return session;
}

/** API variant — returns JSON errors instead of redirects. */
export async function requireTaghvimApiSession(): Promise<
  | { ok: true; session: AuthSession }
  | { ok: false; response: NextResponse }
> {
  const session = await getAuthSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthenticated" }, { status: 401 }),
    };
  }
  if (!(await sessionHasDefenseCalendarAccess(session))) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}
