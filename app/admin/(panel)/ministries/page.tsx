import { redirect } from "next/navigation";
import { MinistriesAdmin } from "@/components/admin/ministries-admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgEnsureDefaultMinistries, pgListMinistries } from "@/lib/db/repository-ministries";
import { isPostgresConfigured } from "@/lib/utils";

export default async function MinistriesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session)) redirect("/admin");

  let ministries: Awaited<ReturnType<typeof pgListMinistries>> = [];
  if (isPostgresConfigured()) {
    await pgEnsureDefaultMinistries();
    ministries = await pgListMinistries({ includeOrganizations: true });
  }

  return <MinistriesAdmin initialMinistries={ministries} />;
}
