import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-2">
        <AdminLoginForm />
        <p className="text-xs text-muted-foreground text-center">
          ورود با حساب مدیریت تنظیم‌شده در سرور
        </p>
      </div>
    </div>
  );
}
