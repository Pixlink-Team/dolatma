"use client";
import { taghvimPath, stripTaghvimBase, TAGHVIM_BASE } from "@taghvim/lib/paths";

import { apiFetch } from "@taghvim/lib/auth";
import { formatPersianDateLabel } from "@taghvim/lib/persian-date";
import type {
  AppNotification,
  NotificationCategoryFilter,
  NotificationStatusFilter,
} from "@taghvim/types/notification";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificationBellProps = {
  className?: string;
};

export function NotificationBell({ className = "" }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<NotificationStatusFilter>("all");
  const [category, setCategory] =
    useState<NotificationCategoryFilter>("all");
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("category", category);
      params.set("per_page", "40");
      const res = await apiFetch(`/notifications?${params.toString()}`);
      if (!res.ok) throw new Error("بارگذاری اعلان‌ها ناموفق بود");
      const payload = await res.json();
      setItems((payload.data ?? []) as AppNotification[]);
      setUnreadCount(Number(payload.meta?.unread_count ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [status, category]);

  const refreshCount = useCallback(async () => {
    try {
      const res = await apiFetch("/notifications/unread-count");
      if (!res.ok) return;
      const payload = await res.json();
      setUnreadCount(Number(payload.data?.unread_count ?? 0));
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const timer = window.setInterval(() => void refreshCount(), 45000);
    return () => window.clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markOne(id: string) {
    const res = await apiFetch(`/notifications/${id}/read`, { method: "POST" });
    if (!res.ok) return;
    setItems((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n,
      ),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAll() {
    const res = await apiFetch("/notifications/read-all", { method: "POST" });
    if (!res.ok) return;
    setItems((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex shrink-0 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2.5 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
        aria-label="اعلان‌ها"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99
              ? "۹۹+"
              : unreadCount.toLocaleString("fa-IR")}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                اعلان‌ها
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                محتوای جدید زیردستان و کل سیستم (برای مدیر)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 hover:bg-[var(--hover)]"
              aria-label="بستن"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 border-b border-[var(--border)] px-3 py-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "همه"],
                  ["unread", "خوانده‌نشده"],
                  ["read", "خوانده‌شده"],
                ] as const
              ).map(([key, label]) => (
                <FilterChip
                  key={key}
                  active={status === key}
                  label={label}
                  onClick={() => setStatus(key)}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "همه دسته‌ها"],
                  ["enemy_action", "اقدام دشمن"],
                  ["government_action", "اقدام دولت"],
                ] as const
              ).map(([key, label]) => (
                <FilterChip
                  key={key}
                  active={category === key}
                  label={label}
                  onClick={() => setCategory(key)}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Link
                href={taghvimPath("/my-content")}
                onClick={() => setOpen(false)}
                className="text-[11px] text-[var(--primary)] hover:underline"
              >
                رفتن به محتوای من
              </Link>
              <button
                type="button"
                onClick={() => void markAll()}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--hover)] disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                خواندن همه
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-[var(--text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال بارگذاری...
              </div>
            ) : error ? (
              <p className="px-3 py-6 text-center text-sm text-red-500">
                {error}
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]">
                اعلانی نیست.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.is_read) void markOne(item.id);
                      }}
                      className={`w-full px-3 py-3 text-right transition-colors hover:bg-[var(--hover)] ${
                        item.is_read ? "opacity-75" : "bg-blue-500/5"
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            background:
                              item.kind === "enemy"
                                ? "rgba(220, 38, 38, 0.15)"
                                : "rgba(37, 99, 235, 0.15)",
                            color:
                              item.kind === "enemy"
                                ? "var(--enemy)"
                                : "var(--government)",
                          }}
                        >
                          {item.kind === "enemy"
                            ? "اقدام دشمن"
                            : "اقدام دولت"}
                        </span>
                        {!item.is_read ? (
                          <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-500">
                            جدید
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[12px] font-medium leading-5 text-[var(--text-primary)]">
                        {item.message || item.title || "اعلان جدید"}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[var(--text-muted)]">
                        {item.actor_name ? (
                          <span>ثبت‌کننده: {item.actor_name}</span>
                        ) : null}
                        {item.date ? (
                          <span>{formatPersianDateLabel(item.date)}</span>
                        ) : null}
                        {item.created_at ? (
                          <span>
                            {new Intl.DateTimeFormat("fa-IR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(item.created_at))}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2 py-1 text-[10px] ${
        active
          ? "bg-blue-600 text-white"
          : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)]"
      }`}
    >
      {label}
    </button>
  );
}
