"use client";
import { taghvimPath, stripTaghvimBase, TAGHVIM_BASE } from "@taghvim/lib/paths";

import { RequireAuth } from "@taghvim/components/admin/RequireAuth";
import { getCurrentUser, refreshCurrentUser } from "@taghvim/lib/auth";
import {
  clearDemoDataOnServer,
  fetchDemoDataStats,
  restoreDemoDataOnServer,
  type DemoDataStats,
} from "@taghvim/lib/demo-data";
import {
  clearAllDemoData,
  resetLocalTimelineCache,
} from "@taghvim/lib/timeline-store";
import { ROLE_LABELS, userHasPermission } from "@taghvim/types/auth";
import { Eraser, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const EMPTY_STATS: DemoDataStats = { days: 0, events: 0, cleared: true };

export default function AdminHomePage() {
  return (
    <RequireAuth>
      <AdminHomeContent />
    </RequireAuth>
  );
}

function AdminHomeContent() {
  const [name, setName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [canUsers, setCanUsers] = useState(false);
  const [canSubusers, setCanSubusers] = useState(false);
  const [canSettings, setCanSettings] = useState(false);
  const [canContent, setCanContent] = useState(false);
  const [canArchive, setCanArchive] = useState(false);
  const [canBackup, setCanBackup] = useState(false);
  const [canForm, setCanForm] = useState(false);
  const [stats, setStats] = useState<DemoDataStats>(EMPTY_STATS);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const next = await fetchDemoDataStats();
      setStats(next);
    } catch {
      setStats(EMPTY_STATS);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const user = (await refreshCurrentUser()) ?? getCurrentUser();
      if (!user) return;
      setName(user.name);
      setRoleLabel(ROLE_LABELS[user.role]);
      setCanUsers(userHasPermission(user, "manage_users"));
      setCanSubusers(userHasPermission(user, "manage_subusers"));
      setCanSettings(userHasPermission(user, "manage_settings"));
      setCanContent(userHasPermission(user, "manage_content"));
      setCanArchive(userHasPermission(user, "view_archive"));
      setCanBackup(userHasPermission(user, "run_backup"));
      setCanForm(userHasPermission(user, "manage_form_schema"));
      await refreshStats();
    })();
  }, [refreshStats]);

  async function handleClear() {
    if (
      !window.confirm(
        "همه رویدادهای خبری نمونه از سرور و حافظه محلی مرورگر پاک می‌شود. ادامه می‌دهید؟",
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await clearDemoDataOnServer();
      clearAllDemoData();
      resetLocalTimelineCache();
      await refreshStats();
      setMessage(
        `پاک شد: ${result.days.toLocaleString("fa-IR")} روز، ${result.events.toLocaleString("fa-IR")} رویداد و ${result.media.toLocaleString("fa-IR")} فایل رسانه‌ای از سرور.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "پاک کردن ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (
      !window.confirm(
        "داده نمونه جنگ ۲۰۲۶ با تصاویر جدید از سرور دوباره بارگذاری شود؟",
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await restoreDemoDataOnServer();
      resetLocalTimelineCache();
      await refreshStats();
      setMessage(
        `بازیابی شد: ${result.days.toLocaleString("fa-IR")} روز، ${result.events.toLocaleString("fa-IR")} رویداد و ${result.media_attached.toLocaleString("fa-IR")} تصویر جدید.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "بازیابی ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">سلام، {name}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          نقش شما: {roleLabel}. از این بخش کاربران و تنظیمات داشبورد را مدیریت
          کنید.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {canUsers ? (
          <Link
            href={taghvimPath("/admin/users")}
            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:border-blue-500/30"
          >
            <h3 className="font-semibold text-[var(--text-primary)]">کاربران و دسترسی‌ها</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              سلسله‌مراتب کاربران و تفویض مجوزها
            </p>
          </Link>
        ) : null}

        {canSubusers ? (
          <Link
            href={taghvimPath("/my-subusers")}
            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:border-blue-500/30"
          >
            <h3 className="font-semibold text-[var(--text-primary)]">مدیریت زیردستان</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              افزودن و مدیریت کاربرانی که زیر نظر شما هستند
            </p>
          </Link>
        ) : null}

        {canUsers ? (
          <Link
            href={taghvimPath("/admin/agencies")}
            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:border-blue-500/30"
          >
            <h3 className="font-semibold text-[var(--text-primary)]">وزارتخانه‌ها</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              تعریف بخش‌های دولت مثل بهداشت، دفاع، امور خارجه برای ثبت داده جداگانه
            </p>
          </Link>
        ) : null}

        {canForm ? (
          <Link
            href={taghvimPath("/admin/form-builder")}
            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:border-blue-500/30"
          >
            <h3 className="font-semibold text-[var(--text-primary)]">فرم‌ساز رویداد</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              افزودن و مدیریت فیلدهای فرم ثبت رویداد
            </p>
          </Link>
        ) : null}

        {canArchive ? (
          <Link
            href={taghvimPath("/admin/archive")}
            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:border-blue-500/30"
          >
            <h3 className="font-semibold text-[var(--text-primary)]">آرشیو</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              بازیابی یا حذف دائم موارد soft-delete شده
            </p>
          </Link>
        ) : null}

        {canBackup ? (
          <Link
            href={taghvimPath("/admin/backup")}
            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:border-blue-500/30"
          >
            <h3 className="font-semibold text-[var(--text-primary)]">بکاپ پایگاه داده</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              تهیه و دانلود نسخه پشتیبان PostgreSQL
            </p>
          </Link>
        ) : null}

        {canSettings ? (
          <Link
            href={taghvimPath("/admin/settings")}
            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:border-blue-500/30"
          >
            <h3 className="font-semibold text-[var(--text-primary)]">تنظیمات داشبورد</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              بازه روز اول تا روز آخر، عنوان سایت، نمای پیش‌فرض
            </p>
          </Link>
        ) : null}

        <Link
          href={taghvimPath("/timeline")}
          className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:border-blue-500/30 sm:col-span-2"
        >
          <h3 className="font-semibold text-[var(--text-primary)]">مشاهده خط زمانی</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            بازگشت به صفحه گزارش زنده
          </p>
        </Link>
      </div>

      {canContent ? (
        <section className="rounded-2xl border border-red-500/25 bg-[var(--panel)] p-5">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            داده نمونه و آماده‌سازی محصول
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            رویدادهای نمونه هفت روز اخیر از سرور بارگذاری می‌شوند. با «بازیابی»،
            رویدادها و تصاویر جدید از پوشه seed سرور وصل می‌شوند. قبل از
            بهره‌برداری واقعی می‌توانید همه را پاک کنید.
          </p>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            وضعیت سرور:{" "}
            {stats.cleared
              ? "خالی / آماده استفاده"
              : `${stats.days.toLocaleString("fa-IR")} روز · ${stats.events.toLocaleString("fa-IR")} رویداد`}
          </p>

          {message ? (
            <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-[var(--text-primary)]">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || stats.cleared}
              onClick={() => void handleClear()}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eraser className="h-4 w-4" />
              پاک کردن همه داده‌های نمونه
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRestore()}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              بازیابی داده خبری نمونه
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
