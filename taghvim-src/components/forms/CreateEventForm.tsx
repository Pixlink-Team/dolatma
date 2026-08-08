"use client";

import { PersianDatePicker } from "@taghvim/components/shared/PersianDatePicker";
import {
  LocationMapPicker,
  type MapCoordinates,
} from "@taghvim/components/forms/LocationMapPicker";
import { getAgencyById, listAgencies } from "@taghvim/lib/agency-store";
import { getDashboardSettings } from "@taghvim/lib/admin-store";
import { apiFetch, getCurrentUser } from "@taghvim/lib/auth";
import { SEED_RANGE_END, SEED_RANGE_START } from "@taghvim/data/timeline.mock";
import { upsertTimelineEvent } from "@taghvim/lib/timeline-store";
import {
  isAllowedMediaFile,
  MAX_MEDIA_BYTES,
  mediaKindFromFile,
  mediaKindFromMime,
  mediaKindLabel,
} from "@taghvim/lib/media";
import { NATIONAL_HERO_TAG, withNationalHeroTag } from "@taghvim/lib/tags";
import type { GovernmentAgency } from "@taghvim/types/agency";
import { userHasPermission } from "@taghvim/types/auth";
import type { EventType, Severity, TimelineEvent, TimelineMedia } from "@taghvim/types/timeline";
import { ImagePlus, Mic, Trash2, Upload, Video, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

type SchemaField = {
  key: string;
  label: string;
  type: string;
  options: Array<{ value: string; label: string }> | null;
  required: boolean;
  section: string;
  is_system: boolean;
  is_active: boolean;
};

type CreateEventFormProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (event: TimelineEvent) => void;
};

const SYSTEM_KEYS = new Set([
  "eventType",
  "title",
  "summary",
  "date",
  "severity",
  "description",
  "location",
  "source",
]);

export function CreateEventForm({
  open,
  onClose,
  onCreated,
}: CreateEventFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [allowedAgencies, setAllowedAgencies] = useState<GovernmentAgency[]>([]);
  const [values, setValues] = useState<Record<string, string>>({
    eventType: "enemy",
    title: "",
    summary: "",
    description: "",
    date: "",
    time: "12:00",
    severity: "medium",
    agencyId: "",
    source: "",
    location: "",
  });
  const [nationalHero, setNationalHero] = useState(false);
  const [responseMode, setResponseMode] = useState<"independent" | "linked">(
    "independent",
  );
  const [responseToId, setResponseToId] = useState("");
  const [enemyOptions, setEnemyOptions] = useState<
    Array<{ id: number; title: string; date?: string | null }>
  >([]);
  const [dateMin, setDateMin] = useState(SEED_RANGE_START);
  const [dateMax, setDateMax] = useState(SEED_RANGE_END);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mapPin, setMapPin] = useState<MapCoordinates | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const mediaPreviews = useMemo(
    () =>
      mediaFiles.map((file) => ({
        file,
        kind: mediaKindFromFile(file),
        url: URL.createObjectURL(file),
      })),
    [mediaFiles],
  );

  useEffect(() => {
    return () => {
      for (const preview of mediaPreviews) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [mediaPreviews]);

  const agencyOptions = useMemo(() => allowedAgencies, [allowedAgencies]);
  const activeFields = useMemo(
    () => fields.filter((f) => f.is_active !== false),
    [fields],
  );

  useEffect(() => {
    if (!open) return;
    setMediaFiles([]);
    setMapPin(null);
    setError(null);
    setIsDraggingMedia(false);
    dragDepthRef.current = 0;
    setResponseMode("independent");
    setResponseToId("");
    setNationalHero(false);
    const settings = getDashboardSettings();
    const min = settings.rangeStart || SEED_RANGE_START;
    const max = settings.rangeEnd || SEED_RANGE_END;
    setDateMin(min);
    setDateMax(max);

    const user = getCurrentUser();
    const all = listAgencies({ activeOnly: true });
    // Non-admins only see ministries assigned to them
    const scoped =
      user?.role === "super_admin"
        ? all
        : all.filter((a) => (user?.agencyIds ?? []).includes(a.id));
    setAllowedAgencies(scoped);
    setValues((d) => {
      let nextDate = d.date;
      if (!nextDate || nextDate < min || nextDate > max) {
        nextDate = min;
      }
      const nextAgency =
        d.agencyId && scoped.some((a) => a.id === d.agencyId)
          ? d.agencyId
          : scoped[0]?.id || "";
      return {
        ...d,
        agencyId: nextAgency,
        date: nextDate,
      };
    });

    void (async () => {
      try {
        const res = await apiFetch("/form-schema");
        if (!res.ok) return;
        const payload = await res.json();
        setFields(payload.data?.fields ?? []);
      } catch {
        // keep defaults
      }
    })();

    void (async () => {
      try {
        const res = await apiFetch("/my-content");
        if (!res.ok) return;
        const payload = await res.json();
        const rows = (payload.data?.enemy_actions ?? []) as Array<{
          id: number;
          title: string;
          date?: string | null;
          occurred_at?: string | null;
        }>;
        setEnemyOptions(
          rows.map((row) => ({
            id: row.id,
            title: row.title,
            date: row.date ?? row.occurred_at?.slice(0, 10) ?? null,
          })),
        );
      } catch {
        setEnemyOptions([]);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onPickMedia(files: FileList | null) {
    if (!files?.length) return;
    const next: File[] = [];
    for (const file of Array.from(files)) {
      if (!isAllowedMediaFile(file)) {
        setError("فقط تصویر، فیلم یا صوت مجاز است.");
        continue;
      }
      if (file.size > MAX_MEDIA_BYTES) {
        setError(`حجم «${file.name}» بیشتر از ۵۰ مگابایت است.`);
        continue;
      }
      next.push(file);
    }
    if (next.length) {
      setMediaFiles((prev) => [...prev, ...next].slice(0, 12));
      setError(null);
    }
  }

  function onMediaDragEnter(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    if (Array.from(e.dataTransfer.types).includes("Files")) {
      setIsDraggingMedia(true);
    }
  }

  function onMediaDragLeave(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDraggingMedia(false);
    }
  }

  function onMediaDragOver(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (Array.from(e.dataTransfer.types).includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function onMediaDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDraggingMedia(false);
    onPickMedia(e.dataTransfer.files);
  }

  function removeMedia(index: number) {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadActionMedia(
    eventType: EventType,
    actionId: number | string,
    files: File[],
  ): Promise<TimelineMedia[]> {
    const endpoint =
      eventType === "enemy"
        ? `/enemy-actions/${actionId}/media`
        : `/government-actions/${actionId}/media`;
    const uploaded: TimelineMedia[] = [];

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("alt", file.name);
      const res = await apiFetch(endpoint, { method: "POST", body: form });
      if (!res.ok) continue;
      const payload = await res.json();
      const data = payload.data as {
        id?: number | string;
        url?: string;
        mime_type?: string;
        alt?: string;
      };
      if (!data?.url) continue;
      uploaded.push({
        id: String(data.id ?? `${Date.now()}-${file.name}`),
        type: mediaKindFromMime(data.mime_type ?? file.type),
        url: data.url,
        title: file.name,
        alt: data.alt ?? file.name,
      });
    }

    return uploaded;
  }

  async function publish() {
    setError(null);
    const user = getCurrentUser();
    if (!user || !userHasPermission(user, "manage_content")) {
      setError("اجازه ثبت محتوا ندارید.");
      return;
    }

    for (const field of activeFields) {
      if (field.required && !String(values[field.key] ?? "").trim()) {
        setError(`فیلد «${field.label}» الزامی است.`);
        return;
      }
    }

    if (!values.title?.trim() || !values.date) {
      setError("عنوان و تاریخ الزامی است.");
      return;
    }
    if (values.date < dateMin || values.date > dateMax) {
      setError("تاریخ باید داخل بازه مجاز سامانه باشد.");
      return;
    }

    const eventType = (values.eventType as EventType) || "enemy";

    if (eventType === "government") {
      if (!values.agencyId) {
        setError(
          agencyOptions.length === 0
            ? "برای شما وزارتخانه‌ای تعریف نشده است؛ با مدیر هماهنگ کنید."
            : "وزارتخانه را انتخاب کنید.",
        );
        return;
      }
      if (!agencyOptions.some((a) => a.id === values.agencyId)) {
        setError("فقط وزارتخانه‌های مجاز خودتان را می‌توانید انتخاب کنید.");
        return;
      }
    }

    if (
      eventType === "government" &&
      responseMode === "linked" &&
      !responseToId
    ) {
      setError("اقدام دشمن مرتبط را انتخاب کنید، یا حالت مستقل را بزنید.");
      return;
    }

    const customFields: Record<string, string> = {};
    for (const field of activeFields) {
      if (!SYSTEM_KEYS.has(field.key) && values[field.key]) {
        customFields[field.key] = values[field.key]!;
      }
    }

    const agency =
      eventType === "government" ? getAgencyById(values.agencyId) : null;
    const tags =
      eventType === "government"
        ? withNationalHeroTag([], nationalHero)
        : [];
    const now = new Date().toISOString();
    const localMedia: TimelineMedia[] = mediaFiles.map((file, index) => ({
      id: `local-media-${Date.now()}-${index}`,
      type: mediaKindFromFile(file),
      url: URL.createObjectURL(file),
      title: file.name,
      alt: file.name,
    }));

    const event: TimelineEvent = {
      id: `evt-${Date.now()}`,
      eventType,
      title: values.title.trim(),
      summary: (values.summary || values.title).trim(),
      description: values.description?.trim() || undefined,
      date: values.date,
      time: values.time || "12:00",
      severity: (values.severity as Severity) || "medium",
      verificationStatus: "published",
      actionStatus: eventType === "government" ? "in_progress" : undefined,
      category:
        eventType === "government"
          ? agency?.shortName || "عمومی"
          : "عمومی",
      location: {
        province: values.location?.trim() || undefined,
        lat: mapPin?.latitude,
        lng: mapPin?.longitude,
      },
      organization:
        eventType === "government" ? agency?.shortName : undefined,
      agencyId: eventType === "government" ? values.agencyId : undefined,
      agencyName: eventType === "government" ? agency?.name : undefined,
      createdByUserId: user.id,
      createdByName: user.name,
      createdByAgencyIds: user.agencyIds?.length ? user.agencyIds : [],
      source: values.source?.trim() || undefined,
      imageUrl: localMedia.find((m) => m.type === "image")?.url,
      media: localMedia,
      tags,
      relatedEventIds:
        eventType === "government" &&
        responseMode === "linked" &&
        responseToId
          ? [`enemy-${responseToId}`]
          : [],
      relatedResponseIds: [],
      commentsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    setSubmitting(true);
    try {
      const dayRes = await apiFetch("/days", {
        method: "POST",
        body: JSON.stringify({
          date: values.date,
          title: values.title.trim(),
          summary: values.summary || null,
          status: "published",
        }),
      });

      let dayId: number | null = null;
      if (dayRes.ok) {
        const dayPayload = await dayRes.json();
        dayId = dayPayload.data?.id ?? null;
      } else if (dayRes.status === 422) {
        const listRes = await apiFetch(`/days?status=published`);
        if (listRes.ok) {
          const listPayload = await listRes.json();
          const found = (listPayload.data ?? []).find(
            (d: { date?: string; id: number }) =>
              String(d.date).startsWith(values.date),
          );
          dayId = found?.id ?? null;
        }
      }

      if (dayId) {
        const endpoint =
          eventType === "enemy"
            ? `/days/${dayId}/enemy-actions`
            : `/days/${dayId}/government-actions`;
        const body =
          eventType === "enemy"
            ? {
                title: values.title.trim(),
                description: values.description || values.summary || null,
                severity: values.severity || "medium",
                source: values.source || null,
                location: values.location || null,
                latitude: mapPin?.latitude ?? null,
                longitude: mapPin?.longitude ?? null,
                occurred_at: `${values.date}T${values.time || "12:00"}:00`,
                status: "published",
                custom_fields: customFields,
              }
            : {
                title: values.title.trim(),
                description: values.description || values.summary || null,
                agency: agency?.shortName || null,
                location: values.location || null,
                latitude: mapPin?.latitude ?? null,
                longitude: mapPin?.longitude ?? null,
                completed_at: `${values.date}T${values.time || "12:00"}:00`,
                status: "published",
                custom_fields: customFields,
                tags,
                agency_id: values.agencyId || null,
                response_to_id:
                  responseMode === "linked" && responseToId
                    ? Number(responseToId)
                    : null,
              };
        const actionRes = await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(body),
        });

        if (actionRes.ok && mediaFiles.length > 0) {
          const actionPayload = await actionRes.json();
          const actionId = actionPayload.data?.id;
          if (actionId != null) {
            const uploaded = await uploadActionMedia(
              eventType,
              actionId,
              mediaFiles,
            );
            if (uploaded.length > 0) {
              event.media = uploaded;
              event.imageUrl =
                uploaded.find((m) => m.type === "image")?.url ?? event.imageUrl;
            }
          }
        }
      }
    } catch {
      // Fall back to local store below
    } finally {
      setSubmitting(false);
    }

    upsertTimelineEvent(event);
    setMediaFiles([]);
    onCreated?.(event);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="بستن فرم"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface-2)] pb-[env(safe-area-inset-bottom)] overscroll-contain md:inset-y-6 md:left-1/2 md:right-auto md:w-[560px] md:-translate-x-1/2 md:rounded-2xl md:pb-0"
      >
        <div className="shrink-0 border-b border-[var(--border)] px-4 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                ثبت رویداد جدید
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                فرم بر اساس تنظیمات ادمین ساخته می‌شود
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-[var(--hover)]"
              aria-label="بستن"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
          {activeFields.length === 0 ? (
            <>
              <Select
                label="نوع رویداد"
                value={values.eventType || "enemy"}
                onChange={(v) => setValue("eventType", v)}
                options={[
                  { value: "enemy", label: "اقدام دشمن" },
                  { value: "government", label: "اقدام دولت" },
                ]}
              />
              {(values.eventType || "enemy") === "government" ? (
                <div className="space-y-1.5">
                  <Select
                    label="وزارتخانه *"
                    value={values.agencyId || ""}
                    onChange={(v) => setValue("agencyId", v)}
                    options={agencyOptions.map((a) => ({
                      value: a.id,
                      label: a.shortName,
                    }))}
                  />
                  {agencyOptions.length === 0 ? (
                    <p className="text-[11px] text-amber-600">
                      وزارتخانه‌ای برای حساب شما تعریف نشده است.
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      فقط وزارتخانه‌هایی که به شما دسترسی داده شده قابل انتخاب هستند.
                    </p>
                  )}
                </div>
              ) : null}
              <Field
                label="عنوان"
                value={values.title || ""}
                onChange={(v) => setValue("title", v)}
              />
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--text-secondary)]">تاریخ</span>
                <PersianDatePicker
                  value={values.date || ""}
                  onChange={(date) => setValue("date", date)}
                  placeholder="انتخاب تاریخ شمسی"
                  ariaLabel="تاریخ رویداد"
                  allowClear={false}
                  minDate={dateMin}
                  maxDate={dateMax}
                />
              </div>
              <Select
                label="شدت"
                value={values.severity || "medium"}
                onChange={(v) => setValue("severity", v)}
                options={[
                  { value: "low", label: "کم" },
                  { value: "medium", label: "متوسط" },
                  { value: "high", label: "شدید" },
                  { value: "critical", label: "بحرانی" },
                ]}
              />
            </>
          ) : (
            <>
              {activeFields.map((field) => (
                <DynamicField
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ""}
                  onChange={(v) => setValue(field.key, v)}
                  minDate={dateMin}
                  maxDate={dateMax}
                />
              ))}
              {(values.eventType || "enemy") === "government" ? (
                <div className="space-y-1.5">
                  <Select
                    label="وزارتخانه *"
                    value={values.agencyId || ""}
                    onChange={(v) => setValue("agencyId", v)}
                    options={agencyOptions.map((a) => ({
                      value: a.id,
                      label: a.shortName,
                    }))}
                  />
                  {agencyOptions.length === 0 ? (
                    <p className="text-[11px] text-amber-600">
                      وزارتخانه‌ای برای حساب شما تعریف نشده است.
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      فقط وزارتخانه‌هایی که به شما دسترسی داده شده قابل انتخاب هستند.
                    </p>
                  )}
                </div>
              ) : null}
            </>
          )}

          <Field
            label="ساعت"
            type="time"
            value={values.time || "12:00"}
            onChange={(v) => setValue("time", v)}
          />

          {(values.eventType || "enemy") === "government" ? (
            <div className="space-y-2 rounded-xl border border-[var(--government-border)] bg-[var(--event-gov-bg)] px-3 py-3">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                نوع اقدام دولت
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="gov-response-mode"
                    checked={responseMode === "independent"}
                    onChange={() => {
                      setResponseMode("independent");
                      setResponseToId("");
                    }}
                  />
                  مستقل
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="gov-response-mode"
                    checked={responseMode === "linked"}
                    onChange={() => setResponseMode("linked")}
                  />
                  پاسخ به اقدام دشمن
                </label>
              </div>
              {responseMode === "linked" ? (
                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--text-secondary)]">
                    اقدام دشمن مرتبط
                  </span>
                  <select
                    value={responseToId}
                    onChange={(e) => setResponseToId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">انتخاب کنید…</option>
                    {enemyOptions.map((opt) => (
                      <option key={opt.id} value={String(opt.id)}>
                        {opt.title}
                        {opt.date ? ` — ${opt.date}` : ""}
                      </option>
                    ))}
                  </select>
                  {enemyOptions.length === 0 ? (
                    <span className="block text-[11px] text-[var(--text-muted)]">
                      هنوز اقدام دشمنی برای اتصال ثبت نشده است.
                    </span>
                  ) : null}
                </label>
              ) : (
                <p className="text-[11px] text-[var(--text-secondary)]">
                  این رویداد به‌صورت مستقل ثبت می‌شود و به اقدام دشمن وصل نیست.
                </p>
              )}
            </div>
          ) : null}

          {(values.eventType || "enemy") === "government" ? (
            <label className="flex items-start gap-3 rounded-xl border border-[var(--government-border)] bg-[var(--event-gov-bg)] px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={nationalHero}
                onChange={(e) => setNationalHero(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold text-[var(--text-primary)]">
                  تگ {NATIONAL_HERO_TAG}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                  این اقدام دولت با برچسب قهرمان ملی منتشر می‌شود.
                </span>
              </span>
            </label>
          ) : null}

          <LocationMapPicker value={mapPin} onChange={setMapPin} />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--text-secondary)]">
                رسانه (تصویر، فیلم، صوت)
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                حداکثر ۵۰ مگابایت برای هر فایل
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onPickMedia(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={onMediaDragEnter}
              onDragLeave={onMediaDragLeave}
              onDragOver={onMediaDragOver}
              onDrop={onMediaDrop}
              className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition ${
                isDraggingMedia
                  ? "border-blue-500 bg-blue-500/10 text-blue-600"
                  : "border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:bg-[var(--hover)]"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isDraggingMedia
                    ? "bg-blue-500/15 text-blue-600"
                    : "bg-[var(--panel-2)] text-[var(--text-primary)]"
                }`}
              >
                {isDraggingMedia ? (
                  <Upload className="h-5 w-5" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {isDraggingMedia
                  ? "فایل را رها کنید"
                  : "کشیدن و رها کردن فایل‌ها اینجا"}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                یا کلیک کنید تا از دستگاه انتخاب شود
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <ImagePlus className="h-3 w-3" /> تصویر
                <Video className="ms-2 h-3 w-3" /> فیلم
                <Mic className="ms-2 h-3 w-3" /> صوت
              </span>
            </button>
            {mediaPreviews.length > 0 ? (
              <ul className="space-y-2">
                {mediaPreviews.map((item, index) => (
                  <li
                    key={`${item.file.name}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2"
                  >
                    {item.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : item.kind === "video" ? (
                      <video
                        src={item.url}
                        muted
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--panel-2)]">
                        <Mic className="h-5 w-5 text-[var(--text-secondary)]" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                        {item.file.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {mediaKindLabel(item.kind)} ·{" "}
                        {(item.file.size / (1024 * 1024)).toLocaleString("fa-IR", {
                          maximumFractionDigits: 1,
                        })}{" "}
                        مگابایت
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-red-400"
                      aria-label="حذف رسانه"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-50"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={() => void publish()}
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "در حال ثبت…" : "انتشار / ثبت"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DynamicField({
  field,
  value,
  onChange,
  minDate,
  maxDate,
}: {
  field: SchemaField;
  value: string;
  onChange: (v: string) => void;
  minDate?: string;
  maxDate?: string;
}) {
  if (field.type === "date" || field.key === "date") {
    return (
      <div className="space-y-1.5">
        <span className="text-xs text-[var(--text-secondary)]">
          {field.label}
          {field.required ? " *" : ""}
        </span>
        <PersianDatePicker
          value={value}
          onChange={onChange}
          placeholder="انتخاب تاریخ شمسی"
          ariaLabel={field.label}
          allowClear={!field.required}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="block space-y-1.5">
        <span className="text-xs text-[var(--text-secondary)]">
          {field.label}
          {field.required ? " *" : ""}
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
    );
  }

  if (field.type === "select" || field.key === "eventType" || field.key === "severity") {
    const options =
      field.options ??
      (field.key === "eventType"
        ? [
            { value: "enemy", label: "اقدام دشمن" },
            { value: "government", label: "اقدام دولت" },
          ]
        : field.key === "severity"
          ? [
              { value: "low", label: "کم" },
              { value: "medium", label: "متوسط" },
              { value: "high", label: "شدید" },
              { value: "critical", label: "بحرانی" },
            ]
          : []);
    return (
      <Select
        label={`${field.label}${field.required ? " *" : ""}`}
        value={value}
        onChange={onChange}
        options={options}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value === "1" || value === "true"}
          onChange={(e) => onChange(e.target.checked ? "1" : "0")}
        />
        {field.label}
      </label>
    );
  }

  return (
    <Field
      label={`${field.label}${field.required ? " *" : ""}`}
      type={field.type === "number" ? "number" : "text"}
      value={value}
      onChange={onChange}
    />
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
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
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.length === 0 ? <option value="">—</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
