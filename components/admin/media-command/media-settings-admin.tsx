"use client";

import { MediaCommandShell } from "@/components/admin/media-command/media-command-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  campaignId: string;
  roleLabel: string;
}

const ROLE_MATRIX = [
  {
    role: "مدیر سامانه",
    items: [
      "مشاهده و مدیریت همه حساب‌ها",
      "انتشار مرکزی",
      "تعریف سیاست‌ها",
      "مشاهده همه تحلیل‌ها",
      "مدیریت دسترسی‌ها",
    ],
  },
  {
    role: "کارفرما / مدیر کمپین",
    items: [
      "ساخت دستور انتشار",
      "انتخاب دستگاه‌ها",
      "ارسال بسته محتوا",
      "تأیید محتوای کمپین",
      "توقف انتشار",
    ],
  },
  {
    role: "یوزر مادر وزارتخانه",
    items: [
      "مدیریت حساب‌های زیرمجموعه",
      "مشاهده عملکرد زیرمجموعه‌ها",
      "تأیید محتوا",
      "ارسال مأموریت به زیرمجموعه",
    ],
  },
  {
    role: "کاربر روابط عمومی",
    items: [
      "ساخت محتوا",
      "مدیریت حساب‌های مجاز",
      "زمان‌بندی و انتشار",
      "پاسخ به کامنت",
      "انجام دستورهای دریافتی",
    ],
  },
  {
    role: "کاربر زیرمجموعه",
    items: [
      "مشاهده و مدیریت محتوای خودش",
      "انجام مأموریت‌های تخصیص‌داده‌شده",
      "ارسال محتوا برای تأیید",
    ],
  },
];

export function MediaSettingsAdmin({ campaignId, roleLabel }: Props) {
  return (
    <MediaCommandShell
      campaignId={campaignId}
      title="تنظیمات و دسترسی‌ها"
      description="سیاست‌های دسترسی میز فرمان رسانه‌ای بر اساس نقش‌های راستا"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">نقش فعلی شما</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge>{roleLabel}</Badge>
          <p className="mt-3 text-sm text-muted-foreground">
            عملیات حساس مانند اتصال حساب، انتشار مرکزی، حذف محتوا، توقف انتشار و تغییر دسترسی در
            رصد کاربران (Audit Log) ثبت می‌شوند.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {ROLE_MATRIX.map((row) => (
          <Card key={row.role}>
            <CardHeader>
              <CardTitle className="text-base">{row.role}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
                {row.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اعلان‌های ماژول</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>اعلان‌های داخلی برای دستور جدید، تأیید/رد محتوا، نزدیک‌شدن زمان انتشار، قطع حساب، کامنت حساس و سررسید مأموریت فعال است.</p>
          <p>ارسال پیامک یا کانال‌های اعلان موجود راستا براساس تنظیمات اعلان‌های سامانه انجام می‌شود.</p>
        </CardContent>
      </Card>
    </MediaCommandShell>
  );
}
