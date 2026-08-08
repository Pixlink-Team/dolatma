"use client";

import { RequireAuth } from "@taghvim/components/admin/RequireAuth";
import { apiFetch } from "@taghvim/lib/auth";
import { userHasPermission, type AdminUser } from "@taghvim/types/auth";
import { getCurrentUser } from "@taghvim/lib/auth";
import { RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type ArchiveItem = {
  type: string;
  id: number;
  title: string | null;
  deleted_at: string | null;
  created_by: number | null;
};

export default function ArchivePage() {
  return (
    <RequireAuth requirePermission="view_archive">
      <ArchiveManager />
    </RequireAuth>
  );
}

function ArchiveManager() {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/archive");
      if (!res.ok) throw new Error("بارگذاری آرشیو ناموفق بود");
      const payload = await res.json();
      setItems(payload.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "اتصال به سرور برقرار نشد",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setUser(getCurrentUser());
    void load();
  }, []);

  async function restore(item: ArchiveItem) {
    const res = await apiFetch(`/archive/${item.type}/${item.id}/restore`, {
      method: "POST",
    });
    if (!res.ok) {
      setError("بازیابی ناموفق بود");
      return;
    }
    await load();
  }

  async function forceDelete(item: ArchiveItem) {
    if (!confirm("حذف دائم؟ این عمل قابل بازگشت نیست.")) return;
    const res = await apiFetch(`/archive/${item.type}/${item.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("حذف دائم ناموفق بود");
      return;
    }
    await load();
  }

  const canForce = userHasPermission(user, "force_delete");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">آرشیو</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          موارد حذف‌شده را بازیابی یا برای همیشه پاک کنید.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">در حال بارگذاری...</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
          <table className="min-w-full text-sm">
            <thead className="border-b border-[var(--border)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-4 py-3 text-right font-medium">نوع</th>
                <th className="px-4 py-3 text-right font-medium">عنوان</th>
                <th className="px-4 py-3 text-right font-medium">حذف شده</th>
                <th className="px-4 py-3 text-right font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                    آرشیو خالی است
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="border-b border-[var(--border)]">
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{item.type}</td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{item.title ?? `#${item.id}`}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {item.deleted_at ? new Date(item.deleted_at).toLocaleString("fa-IR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void restore(item)}
                          className="rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--hover)]"
                          title="بازیابی"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        {canForce ? (
                          <button
                            type="button"
                            onClick={() => void forceDelete(item)}
                            className="rounded-lg border border-red-500/30 p-2 text-red-400 hover:bg-red-500/10"
                            title="حذف دائم"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
