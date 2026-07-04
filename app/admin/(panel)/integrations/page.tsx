import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapBilboardIntegrationForm } from "@/components/admin/map-bilboard-integration-form";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { isPostgresConfigured } from "@/lib/utils";

export default async function IntegrationsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session)) redirect("/admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">اتصال Map-Bilboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          برای ثبت بیلبورد جدید، نام کاربری و رمز ادمین{" "}
          <Link href="https://billboard.pixlink.ir" target="_blank" className="text-primary hover:underline">
            billboard.pixlink.ir
          </Link>{" "}
          را اینجا وارد کنید.
        </p>
      </div>

      {!isPostgresConfigured() ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            ذخیره تنظیمات فقط با PostgreSQL فعال است. در env سرور متغیرهای BILLBOARD_API_EMAIL و
            BILLBOARD_API_PASSWORD را قرار دهید.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">اعتبارنامه API</CardTitle>
          </CardHeader>
          <CardContent>
            <MapBilboardIntegrationForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
