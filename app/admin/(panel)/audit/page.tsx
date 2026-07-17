import { redirect } from "next/navigation";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { getAuditDashboardData } from "@/lib/audit/dashboard";
import { AuditAdmin } from "@/components/admin/audit-admin";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session)) redirect("/admin");

  const databaseReady = isPostgresConfigured();
  const data = databaseReady ? await getAuditDashboardData() : null;

  return <AuditAdmin data={data} databaseReady={databaseReady} />;
}
