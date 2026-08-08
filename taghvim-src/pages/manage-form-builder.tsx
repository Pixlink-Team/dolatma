"use client";

import { RequireAuth } from "@taghvim/components/admin/RequireAuth";
import { apiFetch } from "@taghvim/lib/auth";
import { FALLBACK_FORM_SCHEMA } from "@taghvim/lib/form-schema";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Eye,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type FormField = {
  id?: number;
  key: string;
  label: string;
  type: string;
  options: Array<{ value: string; label: string }> | null;
  required: boolean;
  sort_order: number;
  section: string;
  is_system: boolean;
  is_active: boolean;
};

type FormSchema = {
  key: string;
  name: string;
  fields: FormField[];
};

const FIELD_TYPES = [
  "text",
  "textarea",
  "select",
  "date",
  "number",
  "boolean",
  "file",
] as const;

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "متن کوتاه",
  textarea: "متن بلند",
  select: "انتخابی",
  date: "تاریخ",
  number: "عدد",
  boolean: "بله / خیر",
  file: "فایل",
};

export default function FormBuilderPage() {
  return (
    <RequireAuth requirePermission="manage_form_schema">
      <FormBuilder />
    </RequireAuth>
  );
}

function FormBuilder() {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await apiFetch("/form-schema");
      if (!res.ok) {
        setSchema(FALLBACK_FORM_SCHEMA as unknown as FormSchema);
        setError(
          "API در دسترس نبود؛ فرم پیش‌فرض نمایش داده شد. برای ذخیره، سرور را روشن کنید.",
        );
        return;
      }
      const payload = await res.json();
      setSchema(payload.data ?? (FALLBACK_FORM_SCHEMA as unknown as FormSchema));
    } catch (err) {
      setSchema(FALLBACK_FORM_SCHEMA as unknown as FormSchema);
      setError(
        err instanceof Error
          ? err.message
          : "API در دسترس نبود؛ فرم پیش‌فرض نمایش داده شد.",
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const previewFields = useMemo(
    () => (schema?.fields ?? []).filter((f) => f.is_active !== false),
    [schema],
  );

  function updateField(index: number, patch: Partial<FormField>) {
    if (!schema) return;
    const fields = schema.fields.map((f, i) =>
      i === index ? { ...f, ...patch } : f,
    );
    setSchema({ ...schema, fields });
    setSaved(false);
    setHighlightKey(fields[index]?.key ?? null);
  }

  function addField() {
    if (!schema) return;
    const key = `custom_${Date.now()}`;
    const next: FormField = {
      key,
      label: "فیلد جدید",
      type: "text",
      options: null,
      required: false,
      sort_order: schema.fields.length,
      section: "custom",
      is_system: false,
      is_active: true,
    };
    setSchema({
      ...schema,
      fields: [...schema.fields, next],
    });
    setSaved(false);
    setHighlightKey(key);
  }

  function removeField(index: number) {
    if (!schema) return;
    const field = schema.fields[index];
    if (field?.is_system) {
      setError("فیلدهای ثابت سیستم قابل حذف نیستند");
      return;
    }
    setSchema({
      ...schema,
      fields: schema.fields.filter((_, i) => i !== index),
    });
    setSaved(false);
    setHighlightKey(null);
  }

  function moveField(index: number, direction: -1 | 1) {
    if (!schema) return;
    const target = index + direction;
    if (target < 0 || target >= schema.fields.length) return;
    const fields = [...schema.fields];
    const current = fields[index]!;
    fields[index] = fields[target]!;
    fields[target] = current;
    setSchema({
      ...schema,
      fields: fields.map((f, i) => ({ ...f, sort_order: i })),
    });
    setSaved(false);
    setHighlightKey(current.key);
  }

  async function save() {
    if (!schema) return;
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch("/form-schema", {
        method: "PUT",
        body: JSON.stringify({
          name: schema.name,
          fields: schema.fields.map((f, i) => ({ ...f, sort_order: i })),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload.message ?? "ذخیره ناموفق بود");
        return;
      }
      const payload = await res.json();
      setSchema(payload.data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره ناموفق بود");
    }
  }

  if (!schema) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">در حال بارگذاری...</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            فرم‌ساز رویداد
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            فیلدها را بسازید، جابه‌جا کنید و همان‌جا نتیجه را در پیش‌نمایش ببینید.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGuideOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--hover)]"
          >
            <BookOpen className="h-4 w-4" />
            {guideOpen ? "بستن آموزش" : "آموزش فرم‌ساز"}
          </button>
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--hover)]"
          >
            <Plus className="h-4 w-4" />
            فیلد جدید
          </button>
          <button
            type="button"
            onClick={() => void save()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Save className="h-4 w-4" />
            ذخیره
          </button>
        </div>
      </div>

      {guideOpen ? <FormBuilderGuide /> : null}

      {error ? (
        <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm text-emerald-600">
          ذخیره شد — فرم ثبت رویداد با همین ترتیب نمایش داده می‌شود.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              تنظیم فیلدها
            </h3>
            <span className="text-[11px] text-[var(--text-muted)]">
              {schema.fields.length.toLocaleString("fa-IR")} فیلد
            </span>
          </div>

          {schema.fields.map((field, index) => (
            <div
              key={field.key}
              className={`rounded-2xl border bg-[var(--panel)] p-4 transition ${
                highlightKey === field.key
                  ? "border-blue-500/60 ring-2 ring-blue-500/20"
                  : "border-[var(--border)]"
              }`}
              onFocusCapture={() => setHighlightKey(field.key)}
              onMouseEnter={() => setHighlightKey(field.key)}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {field.label || "بدون عنوان"}
                  {field.is_system ? (
                    <span className="mr-2 text-[10px] text-[var(--primary)]">
                      (ثابت)
                    </span>
                  ) : null}
                  {!field.is_active ? (
                    <span className="mr-2 text-[10px] text-amber-600">
                      (غیرفعال — در فرم دیده نمی‌شود)
                    </span>
                  ) : null}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveField(index, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)] disabled:opacity-30"
                    aria-label="انتقال به بالا"
                    title="بالا"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(index, 1)}
                    disabled={index === schema.fields.length - 1}
                    className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)] disabled:opacity-30"
                    aria-label="انتقال به پایین"
                    title="پایین"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  {!field.is_system ? (
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="rounded-lg border border-red-500/30 p-2 text-red-400"
                      aria-label="حذف فیلد"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-xs">
                  <span className="text-[var(--text-secondary)]">کلید</span>
                  <input
                    value={field.key}
                    disabled={field.is_system}
                    onChange={(e) => updateField(index, { key: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 disabled:opacity-60"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-[var(--text-secondary)]">برچسب</span>
                  <input
                    value={field.label}
                    onChange={(e) =>
                      updateField(index, { label: e.target.value })
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-[var(--text-secondary)]">نوع</span>
                  <select
                    value={field.type}
                    disabled={field.is_system}
                    onChange={(e) =>
                      updateField(index, { type: e.target.value })
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 disabled:opacity-60"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {FIELD_TYPE_LABELS[t] ?? t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-[var(--text-secondary)]">بخش</span>
                  <input
                    value={field.section}
                    onChange={(e) =>
                      updateField(index, { section: e.target.value })
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2"
                  />
                </label>
              </div>

              {field.type === "select" ? (
                <label className="mt-3 block space-y-1 text-xs">
                  <span className="text-[var(--text-secondary)]">
                    گزینه‌ها (هر خط: مقدار|برچسب)
                  </span>
                  <textarea
                    value={(field.options ?? [])
                      .map((o) => `${o.value}|${o.label}`)
                      .join("\n")}
                    disabled={field.is_system}
                    onChange={(e) => {
                      const options = e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [value, ...rest] = line.split("|");
                          const label = rest.join("|").trim() || value!;
                          return { value: value!.trim(), label };
                        });
                      updateField(index, {
                        options: options.length ? options : null,
                      });
                    }}
                    rows={3}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 disabled:opacity-60"
                  />
                </label>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      updateField(index, { required: e.target.checked })
                    }
                  />
                  الزامی
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.is_active}
                    onChange={(e) =>
                      updateField(index, { is_active: e.target.checked })
                    }
                  />
                  فعال (نمایش در فرم ثبت)
                </label>
              </div>
            </div>
          ))}
        </section>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-[var(--primary)]" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  پیش‌نمایش زنده فرم
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  با هر تغییر، همین‌جا نتیجه را می‌بینید
                </p>
              </div>
            </div>

            <div className="mb-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
              فیلدهای فعال:{" "}
              <strong className="text-[var(--text-primary)]">
                {previewFields.length.toLocaleString("fa-IR")}
              </strong>
              {" · "}
              غیرفعال:{" "}
              <strong className="text-[var(--text-primary)]">
                {(schema.fields.length - previewFields.length).toLocaleString(
                  "fa-IR",
                )}
              </strong>
            </div>

            <LiveFormPreview
              fields={previewFields}
              highlightKey={highlightKey}
              formName={schema.name}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function FormBuilderGuide() {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-[var(--primary)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          آموزش سریع فرم‌ساز
        </h3>
      </div>
      <ol className="grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-2 xl:grid-cols-4">
        <GuideStep
          step="۱"
          title="افزودن فیلد"
          text="با «فیلد جدید» یک ورودی به فرم ثبت رویداد اضافه می‌شود. در پیش‌نمایش سمت چپ فوراً ظاهر می‌شود."
        />
        <GuideStep
          step="۲"
          title="ویرایش برچسب و نوع"
          text="برچسب همان متنی است که کاربر می‌بیند. نوع مشخص می‌کند ورودی متن، تاریخ، لیست و غیره باشد."
        />
        <GuideStep
          step="۳"
          title="چینش بالا / پایین"
          text="با دکمه‌های فلش، ترتیب نمایش فیلدها را عوض کنید. همین ترتیب بعد از ذخیره در صفحه ثبت رویداد اعمال می‌شود."
        />
        <GuideStep
          step="۴"
          title="فعال / غیرفعال"
          text="اگر فیلدی را غیرفعال کنید از پیش‌نمایش و فرم واقعی حذف می‌شود، ولی حذف دائمی نیست. فیلدهای ثابت سیستم پاک نمی‌شوند."
        />
      </ol>
      <p className="mt-3 rounded-xl bg-[var(--panel-2)] px-3 py-2 text-[11px] leading-5 text-[var(--text-muted)]">
        نکته: بعد از تغییرات حتماً «ذخیره» را بزنید تا در سامانه اعمال شود. پیش‌نمایش
        فقط پیش‌نمایش است و داده واقعی ذخیره نمی‌کند.
      </p>
    </section>
  );
}

function GuideStep({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
      <p className="mb-1 text-xs font-bold text-[var(--primary)]">
        گام {step} · {title}
      </p>
      <p className="text-[12px] leading-6">{text}</p>
    </li>
  );
}

function LiveFormPreview({
  fields,
  highlightKey,
  formName,
}: {
  fields: FormField[];
  highlightKey: string | null;
  formName: string;
}) {
  if (fields.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] px-3 py-8 text-center text-sm text-[var(--text-secondary)]">
        هیچ فیلد فعالی نیست. یک فیلد را فعال کنید یا فیلد جدید بسازید.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="border-b border-[var(--border)] pb-2">
        <p className="text-xs text-[var(--text-muted)]">فرم ثبت رویداد</p>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {formName || "ثبت رویداد"}
        </p>
      </div>

      {fields.map((field) => (
        <div
          key={field.key}
          className={`rounded-xl px-2 py-2 transition ${
            highlightKey === field.key
              ? "bg-blue-500/10 ring-1 ring-blue-500/40"
              : ""
          }`}
        >
          <label className="block space-y-1.5 text-sm">
            <span className="text-xs text-[var(--text-secondary)]">
              {field.label || "بدون عنوان"}
              {field.required ? " *" : ""}
            </span>
            <PreviewControl field={field} />
          </label>
        </div>
      ))}

      <button
        type="button"
        disabled
        className="w-full rounded-xl bg-blue-600/70 px-3 py-2 text-sm font-semibold text-white opacity-80"
      >
        انتشار / ثبت (فقط پیش‌نمایش)
      </button>
    </div>
  );
}

function PreviewControl({ field }: { field: FormField }) {
  const className =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none";

  if (field.type === "textarea") {
    return (
      <textarea
        rows={3}
        disabled
        placeholder="متن نمونه…"
        className={className}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select disabled className={className} defaultValue="">
        <option value="">انتخاب کنید…</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <input type="checkbox" disabled />
        بله / خیر
      </label>
    );
  }

  if (field.type === "file") {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--text-muted)]">
        محل انتخاب فایل
      </div>
    );
  }

  const inputType =
    field.type === "number"
      ? "number"
      : field.type === "date"
        ? "date"
        : "text";

  return (
    <input
      type={inputType}
      disabled
      placeholder={FIELD_TYPE_LABELS[field.type] ?? field.type}
      className={className}
    />
  );
}
