import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/get-session";
import { REIS_HOME_PATH } from "@/lib/reis/sections";
import { isReisRole } from "@/lib/user-roles";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/admin/login");
  }
  redirect(isReisRole(session.role) ? REIS_HOME_PATH : "/admin");
}
