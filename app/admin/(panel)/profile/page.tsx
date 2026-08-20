import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileSettingsForm } from "@/components/admin/profile-settings-form";
import { getLoginUsernameFromEmail } from "@/lib/auth/user-login";
import {
  canAccessDevicesPage,
  getSessionHomeDeviceId,
} from "@/lib/auth/device-access";
import { getAuthSession } from "@/lib/auth/get-session";
import { pgGetDeviceById } from "@/lib/db/repository-devices";
import { pgGetUserById } from "@/lib/db/repository-extended";
import { isPostgresConfigured } from "@/lib/utils";

export default async function ProfilePage() {
  const session = await getAuthSession();
  if (!session?.userId) redirect("/admin/login");
  if (!isPostgresConfigured()) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          ویرایش پروفایل فقط با اتصال به پایگاه داده فعال است.
        </CardContent>
      </Card>
    );
  }

  const user = await pgGetUserById(session.userId);
  if (!user) redirect("/admin/login");

  let homeDevice: { id: string; name: string } | null = null;
  if (canAccessDevicesPage(session)) {
    const homeDeviceId = await getSessionHomeDeviceId(session);
    if (homeDeviceId) {
      const device = await pgGetDeviceById(homeDeviceId);
      if (device) {
        homeDevice = { id: device.id, name: device.name };
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">پروفایل من</h1>
        <p className="text-sm text-muted-foreground">
          نام، مسئول اکانت و تماس جایگزین شما در سامانه استفاده می‌شود.
        </p>
      </div>

      {homeDevice ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">شناسنامه دستگاه</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              اطلاعات سازمانی، مسئولان، کارکنان و دارایی‌های «{homeDevice.name}» را در شناسنامه دستگاه تکمیل کنید.
              دارایی‌های شخصی‌تان هم از همین مسیر و نقشه دارایی‌های دیجیتال قابل گزارش‌گیری است.
            </p>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href={`/admin/devices/${homeDevice.id}`}>
                  <Building2 className="size-4" />
                  تکمیل شناسنامه
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/capacity-map">مشاهده دارایی‌های دیجیتال</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اطلاعات حساب</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileSettingsForm
            initialName={user.name}
            initialProvince={user.province}
            initialCity={user.city}
            initialAccountManagerName={user.accountManagerName}
            initialPhone={user.phone}
            initialAlternateContactName={user.alternateContactName}
            initialAlternateContactPhone={user.alternateContactPhone}
            email={getLoginUsernameFromEmail(user.email)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
