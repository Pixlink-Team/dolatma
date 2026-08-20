import { redirect } from "next/navigation";
import { CapacityMapAdmin } from "@/components/admin/capacity-map-admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgListNationalCapacityMap } from "@/lib/db/repository-user-capacities";
import { pgListDevices } from "@/lib/db/repository-devices";
import { buildAssetsReport } from "@/lib/assets-report";
import { isPostgresConfigured } from "@/lib/utils";

export default async function CapacityMapPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session) && session.role !== "client") redirect("/admin");

  if (!isPostgresConfigured()) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        نقشه ملی ظرفیت فقط با اتصال به پایگاه داده فعال است.
      </div>
    );
  }

  const [items, devices] = await Promise.all([
    pgListNationalCapacityMap(),
    pgListDevices(),
  ]);
  const initialReport = buildAssetsReport(items, { page: 1, pageSize: 50, sortBy: "updatedAt", sortOrder: "desc" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">دارایی‌ها و نقشه ظرفیت</h1>
        <p className="text-sm text-muted-foreground">
          دارایی‌های رسانه‌ای و میدانی دستگاه‌ها و کاربران؛ منبع واحد برای گزارش‌گیری و صدور دستور.
        </p>
      </div>
      <CapacityMapAdmin
        initialItems={initialReport.items}
        initialTotalCount={initialReport.totalCount}
        initialPage={initialReport.page}
        initialPageSize={initialReport.pageSize}
        initialTotalPages={initialReport.totalPages}
        devices={devices.map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  );
}
