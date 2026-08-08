"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listPreRegistrationsAction } from "@/lib/actions/pre-registration-actions";
import { formatPersianDateTime, formatPersianNumber } from "@/lib/utils";
import type { PreRegistrationPublic } from "@/lib/db/pre-registration";

export function PreRegistrationsAdmin() {
  const [items, setItems] = useState<PreRegistrationPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await listPreRegistrationsAction();
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
        setItems([]);
      } else {
        setError(null);
        setItems(result.items);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <UserPlus className="h-6 w-6" />
          پیش‌ثبت‌نام‌ها
          {!loading ? (
            <span className="text-sm font-medium text-muted-foreground">
              ({formatPersianNumber(items.length)})
            </span>
          ) : null}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          درخواست‌هایی که از صفحه ورود با تأیید پیامکی ثبت شده‌اند.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">لیست درخواست‌ها</CardTitle>
          <CardDescription>پس از بررسی، می‌توانید برای این افراد حساب کاربری بسازید.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز درخواستی ثبت نشده است.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b text-right text-muted-foreground">
                    <th className="px-2 py-2 font-medium">نام</th>
                    <th className="px-2 py-2 font-medium">موبایل</th>
                    <th className="px-2 py-2 font-medium">سازمان</th>
                    <th className="px-2 py-2 font-medium">وزارتخانه</th>
                    <th className="px-2 py-2 font-medium">سمت</th>
                    <th className="px-2 py-2 font-medium">استان</th>
                    <th className="px-2 py-2 font-medium">شهر</th>
                    <th className="px-2 py-2 font-medium">توضیحات</th>
                    <th className="px-2 py-2 font-medium">زمان ثبت</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-2 py-3 font-medium">{item.fullName || "—"}</td>
                      <td className="px-2 py-3" dir="ltr">
                        {item.phone}
                      </td>
                      <td className="px-2 py-3">{item.organization || "—"}</td>
                      <td className="px-2 py-3">{item.ministry || "—"}</td>
                      <td className="px-2 py-3">{item.positionTitle || "—"}</td>
                      <td className="px-2 py-3">{item.province || "—"}</td>
                      <td className="px-2 py-3">{item.city || "—"}</td>
                      <td className="max-w-[220px] truncate px-2 py-3 text-muted-foreground">
                        {item.note || "—"}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                        {item.submittedAt ? formatPersianDateTime(item.submittedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
