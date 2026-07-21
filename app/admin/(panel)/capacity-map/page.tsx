import { redirect } from "next/navigation";
import { CapacityMapAdmin } from "@/components/admin/capacity-map-admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgListNationalCapacityMap } from "@/lib/db/repository-user-capacities";
import { pgListDevices } from "@/lib/db/repository-devices";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">نقشه ملی ظرفیت</h1>
        <p className="text-sm text-muted-foreground">
          ظرفیت رسانه‌ای و میدانی دستگاه‌ها و کاربران قبل از صدور دستور.
        </p>
      </div>
      <CapacityMapAdmin
        initialItems={items}
        devices={devices.map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  );
}
