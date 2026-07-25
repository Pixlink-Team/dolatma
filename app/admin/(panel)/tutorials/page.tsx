import { redirect } from "next/navigation";
import { hasAnyCampaignPermission } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { TutorialsAdmin } from "@/components/admin/tutorials-admin";

export default async function TutorialsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const allowed =
    isFullAdmin(session) ||
    (await hasAnyCampaignPermission(session, "sectionTutorials"));
  if (!allowed) redirect("/admin");

  return <TutorialsAdmin canEdit={isFullAdmin(session)} />;
}
