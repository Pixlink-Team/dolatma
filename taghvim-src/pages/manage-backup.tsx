"use client";

import { RequireAuth } from "@taghvim/components/admin/RequireAuth";
import { apiFetch } from "@taghvim/lib/auth";
import { getApiBase } from "@taghvim/lib/api";
import { Download, HardDrive, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type BackupItem = {
  filename: string;
  size: number;
  modified_at?: string;
  created_at?: string;
};

export default function BackupPage() {
  return (
    <RequireAuth requirePermission="run_backup">
      <BackupManager />
    </RequireAuth>
  );
}

function BackupManager() {
  const [items, setItems] = useState<BackupItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    try {
      const res = await apiFetch("/backups");
      if (!res.ok) throw new Error("بارگذاری بکاپ‌ها ناموفق بود");
      const payload = await res.json();
      setItems(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createBackup() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/backups", { method: "POST" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message ?? "ایجاد بکاپ ناموفق بود");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  function download(filename: string) {
    const url = `${getApiBase()}/backups/${encodeURIComponent(filename)}/download`;
    const a = document.createElement("a");
    void (async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        setError("دانلود ناموفق بود");
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    })();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">بکاپ پایگاه داده</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            تهیه نسخه پشتیبان PostgreSQL و دانلود فایل‌ها.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createBackup()}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          بکاپ جدید
        </button>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 text-center text-sm text-[var(--text-secondary)]">
            <HardDrive className="mx-auto mb-2 h-8 w-8 opacity-50" />
            هنوز بکاپی ثبت نشده است
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.filename}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{item.filename}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {(item.size / 1024).toFixed(1)} KB ·{" "}
                  {new Date(
                    item.modified_at || item.created_at || Date.now()
                  ).toLocaleString("fa-IR")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => download(item.filename)}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--hover)]"
              >
                <Download className="h-3.5 w-3.5" />
                دانلود
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
