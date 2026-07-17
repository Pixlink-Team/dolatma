import { redirect } from "next/navigation";
import { MinistriesAdmin } from "@/components/admin/ministries-admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgListMinistries } from "@/lib/db/repository-ministries";
import { isPostgresConfigured } from "@/lib/utils";

export default async function MinistriesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session)) redirect("/admin");

  const ministries = isPostgresConfigured() ? await pgListMinistries() : [];
  return <MinistriesAdmin initialMinistries={ministries} />;
}
