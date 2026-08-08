"use client";

import { listAgencies } from "@taghvim/lib/agency-store";
import type { TimelineFiltersState, TimelineDay } from "@taghvim/types/timeline";
import { defaultFilters } from "@taghvim/types/timeline";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type TimelineFiltersProps = {
  open: boolean;
  days: TimelineDay[];
  value: TimelineFiltersState;
  onClose: () => void;
  onApply: (next: TimelineFiltersState) => void;
};

export function TimelineFilters({
  open,
  days,
  value,
  onClose,
  onApply,
}: TimelineFiltersProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const agencies = useMemo(() => listAgencies({ activeOnly: true }), []);

  const options = useMemo(() => {
    const events = days.flatMap((d) => d.events);
    return {
      categories: [...new Set(events.map((e) => e.category))],
      provinces: [
        ...new Set(events.map((e) => e.location?.province).filter(Boolean)),
      ] as string[],
      cities: [
        ...new Set(events.map((e) => e.location?.city).filter(Boolean)),
      ] as string[],
      organizations: [
        ...new Set(events.map((e) => e.organization).filter(Boolean)),
      ] as string[],
      sources: [
        ...new Set(events.map((e) => e.source).filter(Boolean)),
      ] as string[],
    };
  }, [days]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="بستن فیلترها"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="فیلترهای خط زمانی"
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--panel)] p-4 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[400px] md:rounded-none md:border-y-0 md:border-l md:border-r-0"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--text-primary)]">فیلترها</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <Select
            label="وزارتخانه / بخش دولت"
            value={draft.agencyId}
            onChange={(v) => setDraft((d) => ({ ...d, agencyId: v }))}
            options={[
              { value: "all", label: "همه" },
              ...agencies.map((a) => ({
                value: a.id,
                label: a.shortName,
              })),
            ]}
          />
          <Select
            label="نوع محتوا"
            value={draft.eventType}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                eventType: v as TimelineFiltersState["eventType"],
              }))
            }
            options={[
              { value: "all", label: "همه" },
              { value: "enemy", label: "اقدامات دشمن" },
              { value: "government", label: "اقدامات دولت" },
            ]}
          />
          <Select
            label="سطح شدت"
            value={draft.severity}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                severity: v as TimelineFiltersState["severity"],
              }))
            }
            options={[
              { value: "all", label: "همه" },
              { value: "low", label: "کم" },
              { value: "medium", label: "متوسط" },
              { value: "high", label: "بالا" },
              { value: "critical", label: "بحرانی" },
            ]}
          />
          <Select
            label="دسته‌بندی"
            value={draft.category}
            onChange={(v) => setDraft((d) => ({ ...d, category: v }))}
            options={[
              { value: "all", label: "همه" },
              ...options.categories.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Select
            label="استان"
            value={draft.province}
            onChange={(v) => setDraft((d) => ({ ...d, province: v }))}
            options={[
              { value: "all", label: "همه" },
              ...options.provinces.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Select
            label="شهر"
            value={draft.city}
            onChange={(v) => setDraft((d) => ({ ...d, city: v }))}
            options={[
              { value: "all", label: "همه" },
              ...options.cities.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Select
            label="نهاد مسئول"
            value={draft.organization}
            onChange={(v) => setDraft((d) => ({ ...d, organization: v }))}
            options={[
              { value: "all", label: "همه" },
              ...options.organizations.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Select
            label="وضعیت تأیید"
            value={draft.verificationStatus}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                verificationStatus: v as TimelineFiltersState["verificationStatus"],
              }))
            }
            options={[
              { value: "all", label: "همه" },
              { value: "draft", label: "پیش‌نویس" },
              { value: "pending", label: "در انتظار" },
              { value: "verified", label: "تأییدشده" },
              { value: "rejected", label: "ردشده" },
            ]}
          />
          <Select
            label="پاسخ"
            value={draft.hasResponse}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                hasResponse: v as TimelineFiltersState["hasResponse"],
              }))
            }
            options={[
              { value: "all", label: "همه" },
              { value: "yes", label: "دارای پاسخ" },
              { value: "no", label: "بدون پاسخ" },
            ]}
          />
          <Select
            label="منبع"
            value={draft.source}
            onChange={(v) => setDraft((d) => ({ ...d, source: v }))}
            options={[
              { value: "all", label: "همه" },
              ...options.sources.map((c) => ({ value: c, label: c })),
            ]}
          />

          <label className="flex items-center gap-2 text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={draft.hasImage}
              onChange={(e) =>
                setDraft((d) => ({ ...d, hasImage: e.target.checked }))
              }
            />
            دارای تصویر
          </label>
          <label className="flex items-center gap-2 text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={draft.hasVideo}
              onChange={(e) =>
                setDraft((d) => ({ ...d, hasVideo: e.target.checked }))
              }
            />
            دارای ویدئو
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            اعمال فیلتر
          </button>
          <button
            type="button"
            onClick={() => setDraft(defaultFilters)}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            پاک کردن همه
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("taghvim_saved_filters", JSON.stringify(draft));
              onApply(draft);
              onClose();
            }}
            className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-2 text-sm text-[var(--primary)]"
          >
            ذخیره فیلتر
          </button>
        </div>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-[var(--panel)] text-[var(--text-primary)]"
          >
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
