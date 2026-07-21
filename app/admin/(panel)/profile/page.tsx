import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileSettingsForm } from "@/components/admin/profile-settings-form";
import { UserPassportCapacities } from "@/components/admin/user-passport-capacities";
import { getAuthSession } from "@/lib/auth/get-session";
import { pgGetUserById } from "@/lib/db/repository-extended";
import { pgListUserCapacities } from "@/lib/db/repository-user-capacities";
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
  const capacities = await pgListUserCapacities(session.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">پروفایل من</h1>
        <p className="text-sm text-muted-foreground">
          نام، مسئول اکانت، تماس جایگزین و شناسنامه ظرفیت شما در سامانه استفاده می‌شود.
        </p>
      </div>

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
            initialRegion={user.region}
            email={user.email}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">شناسنامه ظرفیت</CardTitle>
        </CardHeader>
        <CardContent>
          <UserPassportCapacities initialCapacities={capacities} />
        </CardContent>
      </Card>
    </div>
  );
}
