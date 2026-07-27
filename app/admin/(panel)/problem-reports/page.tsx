import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAuthSession } from "@/lib/auth/get-session";
import { pgCountMyUnreadProblemReplies } from "@/lib/db/problem-reports-repository";
import { isPostgresConfigured } from "@/lib/utils";
import { ProblemReportsPanel } from "@/components/admin/problem-reports-panel";

export const dynamic = "force-dynamic";

export default async function ProblemReportsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  let unreadCount = 0;
  if (isPostgresConfigured()) {
    unreadCount = await pgCountMyUnreadProblemReplies({
      reporterUserId: session.userId,
      reporterType: session.type === "env_admin" ? "env_admin" : null,
    });
  }

  return (
    <Suspense fallback={null}>
      <ProblemReportsPanel initialTab={unreadCount > 0 ? "mine" : "new"} />
    </Suspense>
  );
}
