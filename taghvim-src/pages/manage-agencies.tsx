"use client";

import { RequireAuth } from "@taghvim/components/admin/RequireAuth";
import {
  createAgency,
  deleteAgency,
  listAgencies,
  restoreSeedAgencies,
  updateAgency,
} from "@taghvim/lib/agency-store";
import type { GovernmentAgency } from "@taghvim/types/agency";
import { Building2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

export default function AdminAgenciesPage() {
  return (
    <RequireAuth requireManageAgencies>
      <AgenciesManager />
    </RequireAuth>
  );
}

function AgenciesManager() {
  const [agencies, setAgencies] = useState<GovernmentAgency[]>(() =>
    listAgencies(),
  );
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<GovernmentAgency | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = () => setAgencies(listAgencies());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            وزارتخانه‌ها و بخش‌های دولت
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            هر بخش می‌تواند اقدامات دشمن مرتبط، پاسخ دفاعی و اقدامات مستقل خود را
            ثبت کند. سپس از بالای سایت فقط همان بخش را فیلتر کنید.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!confirm("لیست پیش‌فرض وزارتخانه‌ها بازیابی شود؟")) return;
              restoreSeedAgencies();
              refresh();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover)]"
          >
            <RotateCcw className="h-4 w-4" />
            بازیابی پیش‌فرض
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            وزارتخانه جدید
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {agencies.map((agency) => (
          <article
            key={agency.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-[var(--primary)]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {agency.shortName}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {agency.name}
                  </p>
                </div>
              </div>
              <span
                className={
                  agency.isActive
                    ? "rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300"
                    : "rounded-md bg-slate-500/20 px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                }
              >
                {agency.isActive ? "فعال" : "غیرفعال"}
              </span>
            </div>
            <p className="mt-3 text-xs leading-6 text-[var(--text-secondary)]">
              {agency.description || "بدون توضیح"}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(agency);
                  setCreating(false);
                }}
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
                aria-label="ویرایش"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!confirm(`حذف «${agency.shortName}»؟`)) return;
                  try {
                    deleteAgency(agency.id);
                    refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "خطا");
                  }
                }}
                className="rounded-lg border border-red-500/30 p-2 text-red-300 hover:bg-red-500/10"
                aria-label="حذف"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {(creating || editing) && (
        <AgencyFormModal
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
            setError(null);
          }}
          onSaved={() => {
            refresh();
            setCreating(false);
            setEditing(null);
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function AgencyFormModal({
  initial,
  onClose,
  onSaved,
  onError,
}: {
  initial: GovernmentAgency | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [shortName, setShortName] = useState(initial?.shortName ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (initial) {
        updateAgency(initial.id, {
          name,
          shortName,
          description,
          isActive,
        });
      } else {
        createAgency({ name, shortName, description, isActive });
      }
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "خطا در ذخیره");
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="بستن"
        onClick={onClose}
      />
      <div className="absolute inset-x-4 top-1/2 mx-auto max-w-lg -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
        <h3 className="mb-4 text-lg font-bold text-[var(--text-primary)]">
          {initial ? "ویرایش وزارتخانه" : "وزارتخانه جدید"}
        </h3>
        <form onSubmit={onSubmit} className="space-y-3 text-sm">
          <label className="block space-y-1.5">
            <span className="text-[var(--text-secondary)]">نام کامل</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[var(--text-secondary)]">نام کوتاه (برای فیلتر)</span>
            <input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[var(--text-secondary)]">توضیح</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center gap-2 text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            فعال باشد
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white"
            >
              ذخیره
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] px-4 py-2"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
