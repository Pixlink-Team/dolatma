import { redirect } from "next/navigation";
import {
  hasAnyCampaignPermission,
  isClientUser,
} from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { getSiteUpdates } from "@/lib/site-updates";
import { SiteUpdatesAdmin } from "@/components/admin/site-updates-admin";

export default async function SiteUpdatesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const allowed =
    isFullAdmin(session) ||
    isClientUser(session) ||
    (await hasAnyCampaignPermission(session, "siteUpdates"));
  if (!allowed) redirect("/admin");

  return <SiteUpdatesAdmin entries={getSiteUpdates()} />;
}
