"use client";

import { RequireAuth } from "@taghvim/components/admin/RequireAuth";
import { PersianDatePicker } from "@taghvim/components/shared/PersianDatePicker";
import {
  getDashboardSettings,
  saveDashboardSettings,
} from "@taghvim/lib/admin-store";
import type { DashboardSettings } from "@taghvim/types/settings";
import { Save } from "lucide-react";
import { useState } from "react";

export default function AdminSettingsPage() {
  return (
    <RequireAuth requireManageSettings>
      <SettingsForm />
    </RequireAuth>
  );
}

function SettingsForm() {
  const [settings, setSettings] = useState<DashboardSettings>(() =>
    getDashboardSettings(),
  );
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveDashboardSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">تنظیمات داشبورد</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          بازه روزها برای نمودار شدت و Timeline از اینجا تنظیم می‌شود.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm">
            <span className="text-[var(--text-secondary)]">عنوان سامانه</span>
            <input
              value={settings.siteTitle}
              onChange={(e) =>
                setSettings((s) => ({ ...s, siteTitle: e.target.value }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="text-[var(--text-secondary)]">تگ‌لاین</span>
            <input
              value={settings.siteTagline}
              onChange={(e) =>
                setSettings((s) => ({ ...s, siteTagline: e.target.value }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="text-[var(--text-secondary)]">شعار بالای سایت</span>
            <input
              value={settings.siteSlogan}
              onChange={(e) =>
                setSettings((s) => ({ ...s, siteSlogan: e.target.value }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="دولت پای کار مردم"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-[var(--text-secondary)]">نمای پیش‌فرض</span>
            <select
              value={settings.defaultView}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  defaultView: e.target.value as DashboardSettings["defaultView"],
                }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="timeline">خط زمانی</option>
              <option value="week">هفتگی</option>
              <option value="month">ماهانه</option>
            </select>
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-[var(--text-secondary)]">روز اول بازه</span>
            <PersianDatePicker
              value={settings.rangeStart}
              onChange={(rangeStart) =>
                setSettings((s) => ({ ...s, rangeStart }))
              }
              placeholder="انتخاب روز اول"
              ariaLabel="روز اول بازه"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-[var(--text-secondary)]">روز آخر بازه</span>
            <PersianDatePicker
              value={settings.rangeEnd}
              onChange={(rangeEnd) => setSettings((s) => ({ ...s, rangeEnd }))}
              placeholder="انتخاب روز آخر"
              ariaLabel="روز آخر بازه"
            />
          </label>

          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="text-[var(--text-secondary)]">منطقه زمانی</span>
            <input
              value={settings.timezoneLabel}
              onChange={(e) =>
                setSettings((s) => ({ ...s, timezoneLabel: e.target.value }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.liveEnabled}
              onChange={(e) =>
                setSettings((s) => ({ ...s, liveEnabled: e.target.checked }))
              }
            />
            حالت Live فعال باشد
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.showEnemySection}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  showEnemySection: e.target.checked,
                }))
              }
            />
            نمایش اقدامات دشمن
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.showGovernmentSection}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  showGovernmentSection: e.target.checked,
                }))
              }
            />
            نمایش اقدامات دولت
          </label>
        </div>

        <div className="settings-range-hint rounded-xl px-3 py-2.5 text-xs leading-6">
          <p className="settings-range-hint__title font-semibold">
            راهنمای بازه تاریخ
          </p>
          <p className="mt-1">
            اگر روز اول/آخر خالی باشد، همه روزهای موجود در Timeline نمایش داده
            می‌شود. با تنظیم بازه، نمودار شدت و لیست روزها محدود می‌شوند.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <Save className="h-4 w-4" />
            ذخیره تنظیمات
          </button>
          {saved ? (
            <span className="text-sm font-medium text-[var(--success)]">
              ذخیره شد.
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
