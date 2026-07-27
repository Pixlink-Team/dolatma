import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { AuditProblemsPanel } from "@/components/admin/audit-problems-panel";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgGetProblemReportStats,
  pgListProblemReports,
} from "@/lib/db/problem-reports-repository";
import { formatPersianNumber, isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportedProblemsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session)) redirect("/admin");

  if (!isPostgresConfigured()) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            مشکلات ثبت‌شده
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            رسیدگی به گزارش‌های مشکل کاربران.
          </p>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            این بخش فقط با اتصال به پایگاه داده فعال است.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [reports, stats] = await Promise.all([
    pgListProblemReports({ limit: 200 }),
    pgGetProblemReportStats(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          مشکلات ثبت‌شده
          {stats.open > 0 && (
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              ({formatPersianNumber(stats.open)} باز)
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          گزارش‌های مشکل کاربران را ببینید، پاسخ بدهید و وضعیت را به‌روز کنید — شامل تیکت‌هایی که
          پاسخ داده شده‌اند.
        </p>
      </div>

      <AuditProblemsPanel reports={reports} stats={stats} />
    </div>
  );
}
