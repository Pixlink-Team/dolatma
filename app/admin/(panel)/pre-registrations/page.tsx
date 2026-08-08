import { redirect } from "next/navigation";
import { PreRegistrationsAdmin } from "@/components/admin/pre-registrations-admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

export default async function PreRegistrationsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session)) redirect("/admin");

  return <PreRegistrationsAdmin />;
}
