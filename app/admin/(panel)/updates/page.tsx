import { redirect } from "next/navigation";
import { canAccessNotifications } from "@/lib/auth/access";
import { getAuthSession } from "@/lib/auth/get-session";
import { getSiteUpdates } from "@/lib/site-updates";
import { SiteUpdatesAdmin } from "@/components/admin/site-updates-admin";

export default async function SiteUpdatesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  // Same access rule as notifications: admin and client (کارفرما) only.
  if (!canAccessNotifications(session)) redirect("/admin");

  return <SiteUpdatesAdmin entries={getSiteUpdates()} />;
}
