import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getLoginPageSettingsAction } from "@/lib/actions/login-page-settings-actions";

export default async function AdminLoginPage() {
  const settings = await getLoginPageSettingsAction();

  return (
    <Suspense fallback={null}>
      <AdminLoginForm settings={settings} />
    </Suspense>
  );
}
