"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, MessageSquare, Users } from "lucide-react";
import { toast } from "sonner";
import {
  CONTENT_TITLE_MAX_LENGTH,
  CONTENT_TITLE_MAX_LENGTH_MESSAGE,
} from "@/lib/content-constraints";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminEditorDialog,
  AdminEditorDialogActions,
} from "@/components/admin/admin-editor-dialog";
import { AdminCreatedAtText } from "@/components/admin/admin-created-at";
import {
  AdminCompactAddCard,
  ADMIN_CONTENT_GRID_CLASS,
  AdminEmptyCreateState,
} from "@/components/admin/admin-compact-add-card";
import {
  AdminContentFilterBar,
  DEFAULT_ADMIN_CONTENT_FILTER,
  sortAdminContentItems,
  type AdminContentFilterState,
} from "@/components/admin/admin-content-filter-bar";
import { AdminItemActions } from "@/components/admin/admin-item-actions";
import { AdminOwnerBadge } from "@/components/admin/admin-owner-badge";
import { AdminViewModeToggle } from "@/components/admin/admin-view-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { DocumentUpload } from "@/components/ui/document-upload";
import { PersianDateField } from "@/components/ui/persian-date-input";
import { ProductionSourcePicker } from "@/components/admin/production-source-picker";
import { SocialPlatformIcon } from "@/components/public/social-platform-icon";
import {
  deleteSmsSendReportAction,
  saveSmsSendReportAction,
} from "@/lib/actions/extended-actions";
import { useAdminEditDeepLink } from "@/lib/hooks/use-admin-edit-deep-link";
import { useAdminViewMode } from "@/lib/hooks/use-admin-view-mode";
import { useSectionCreateGate } from "@/lib/hooks/use-section-create-gate";
import { todayISO } from "@/lib/jalali";
import type { ProductionSourceType } from "@/lib/production-source-shared";
import {
  getSmsSendChannelLabel,
  SMS_SEND_CHANNEL_OPTIONS,
  type SmsSendChannel,
} from "@/lib/sms-send-channels";
import type { SmsSendReport, SocialPlatform } from "@/lib/types";
import { cn, formatPersianDate, formatPersianNumber } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1).max(CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE),
  sendDate: z.string().min(1),
  recipientCount: z.coerce.number().int().min(1, "حداقل یک گیرنده لازم است"),
  messageBody: z.string().min(1, "متن پیام الزامی است"),
  channels: z
    .array(z.enum(SMS_SEND_CHANNEL_OPTIONS))
    .min(1, "یک رسانه ارسال را انتخاب کنید")
    .max(1, "فقط یک رسانه ارسال قابل انتخاب است"),
  evidenceFileUrl: z.string().optional(),
  evidenceFileName: z.string().optional(),
  evidenceMimeType: z.string().optional(),
  evidenceFileSize: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SmsReportsAdminProps {
  campaignId: string;
  initialReports: SmsSendReport[];
}

function emptyFormValues(): FormValues {
  return {
    title: "",
    sendDate: todayISO(),
    recipientCount: 1,
    messageBody: "",
    channels: ["sms"],
    evidenceFileUrl: "",
    evidenceFileName: "",
    evidenceMimeType: "",
    evidenceFileSize: 0,
  };
}

function reportToFormValues(report: SmsSendReport): FormValues {
  return {
    title: report.title,
    sendDate: report.sendDate,
    recipientCount: report.recipientCount,
    messageBody: report.messageBody,
    channels: report.channels.length > 0 ? [report.channels[0]] : ["sms"],
    evidenceFileUrl: report.evidenceFileUrl ?? "",
    evidenceFileName: report.evidenceFileName ?? "",
    evidenceMimeType: report.evidenceMimeType ?? "",
    evidenceFileSize: report.evidenceFileSize ?? 0,
  };
}

function truncateMessage(text: string, max = 90): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function isSocialMessengerChannel(channel: SmsSendChannel): channel is Extract<
  SmsSendChannel,
  SocialPlatform
> {
  return channel !== "sms";
}

function ChannelBadges({ channels }: { channels: SmsSendChannel[] }) {
  const channel = channels[0];
  if (!channel) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
        {isSocialMessengerChannel(channel) ? (
          <SocialPlatformIcon platform={channel} size="sm" className="h-3.5 w-3.5 rounded-sm" />
        ) : (
          <MessageSquare className="h-3 w-3" />
        )}
        {getSmsSendChannelLabel(channel)}
      </Badge>
    </div>
  );
}

export function SmsReportsAdmin({ campaignId, initialReports }: SmsReportsAdminProps) {
  const { requestCreate, tutorialModal } = useSectionCreateGate("smsReports", campaignId);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sourceProductionType, setSourceProductionType] = useState<ProductionSourceType | null>(null);
  const [sourceProductionId, setSourceProductionId] = useState<string | null>(null);
  const [rows, setRows] = useState(initialReports);
  const [isPending, startTransition] = useTransition();
  const [contentFilter, setContentFilter] = useState<AdminContentFilterState>(DEFAULT_ADMIN_CONTENT_FILTER);
  const { viewMode, setViewMode } = useAdminViewMode("smsReports");
  const sortedRows = useMemo(
    () =>
      sortAdminContentItems(rows, contentFilter.sortOrder, (item) => item.sendDate || item.updatedAt || item.createdAt),
    [rows, contentFilter.sortOrder]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyFormValues(),
  });

  const { highlightFields, setHighlightFields, resetDeepLink } = useAdminEditDeepLink({
    items: rows,
    getId: (row) => row.id,
    basePath: "/admin/sms-reports",
    onOpen: (report, fields) => {
      setEditingId(report.id);
      setSourceProductionType(report.sourceProductionType ?? null);
      setSourceProductionId(report.sourceProductionId ?? null);
      form.reset(reportToFormValues(report));
      setHighlightFields(fields);
      setOpen(true);
    },
  });

  const watchedTitle = form.watch("title");
  const watchedChannels = form.watch("channels");
  const watchedEvidenceUrl = form.watch("evidenceFileUrl");
  const watchedEvidenceName = form.watch("evidenceFileName");
  const highlightTitle = highlightFields.includes("title") && !watchedTitle?.trim();

  const selectChannel = (channel: SmsSendChannel) => {
    form.setValue("channels", [channel], { shouldDirty: true, shouldValidate: true });
  };

  const openCreate = () => {
    void requestCreate(() => {
      setEditingId(null);
      setSourceProductionType(null);
      setSourceProductionId(null);
      setHighlightFields([]);
      form.reset(emptyFormValues());
      setOpen(true);
    });
  };

  const openEdit = (report: SmsSendReport) => {
    setEditingId(report.id);
    setSourceProductionType(report.sourceProductionType ?? null);
    setSourceProductionId(report.sourceProductionId ?? null);
    setHighlightFields([]);
    form.reset(reportToFormValues(report));
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    resetDeepLink();
  };

  const handleViewEvidence = (report: SmsSendReport) => {
    if (report.evidenceFileUrl) {
      window.open(report.evidenceFileUrl, "_blank");
      return;
    }
    toast.message("مستند پیوست نشده است");
  };

  const handleDelete = (report: SmsSendReport) => {
    startTransition(async () => {
      const result = await deleteSmsSendReportAction(report.id);
      if (!result.success) {
        toast.error(result.error ?? "حذف نشد");
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== report.id));
      toast.success("حذف شد");
    });
  };

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      const payload = {
        campaignId,
        id: editingId ?? undefined,
        title: data.title.trim(),
        sendDate: data.sendDate,
        recipientCount: data.recipientCount,
        messageBody: data.messageBody.trim(),
        channels: data.channels,
        evidenceFileUrl: data.evidenceFileUrl?.trim() || null,
        evidenceFileName: data.evidenceFileName?.trim() || null,
        evidenceMimeType: data.evidenceMimeType?.trim() || null,
        evidenceFileSize: data.evidenceFileSize ?? 0,
        published: true,
        sourceProductionType,
        sourceProductionId,
      };

      const result = await saveSmsSendReportAction(payload);
      if (!result.success) {
        toast.error("error" in result ? result.error : "ذخیره نشد");
        return;
      }

      const savedId = "id" in result ? result.id : (editingId ?? crypto.randomUUID());
      const nextRow: SmsSendReport = {
        id: savedId,
        campaignId,
        title: payload.title,
        sendDate: payload.sendDate,
        recipientCount: payload.recipientCount,
        messageBody: payload.messageBody,
        channels: payload.channels,
        evidenceFileUrl: payload.evidenceFileUrl,
        evidenceFileName: payload.evidenceFileName,
        evidenceMimeType: payload.evidenceMimeType,
        evidenceFileSize: payload.evidenceFileSize,
        published: true,
        sortOrder: 0,
        sourceProductionType,
        sourceProductionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setRows((prev) =>
        editingId ? prev.map((row) => (row.id === editingId ? { ...row, ...nextRow } : row)) : [...prev, nextRow]
      );
      toast.success("ذخیره شد");
      closeDialog();
    });
  });

  return (
    <div className="space-y-6">
      {tutorialModal}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ارسال پیام انبوه</h1>
          <p className="text-sm text-muted-foreground">
            ثبت گزارش ارسال پیام انبوه (پیامک، بله، ایتا و سایر کانال‌ها) — عنوان، رسانه، تعداد گیرندگان، متن پیام و مستند اختیاری
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <AdminContentFilterBar
        filter={contentFilter}
        onChange={setContentFilter}
        users={[]}
        plans={[]}
        items={rows}
      />

      {sortedRows.length === 0 ? (
        <AdminEmptyCreateState>
          <AdminCompactAddCard onClick={openCreate} label="ثبت ارسال جدید" />
        </AdminEmptyCreateState>
      ) : viewMode === "grid" ? (
        <div className={ADMIN_CONTENT_GRID_CLASS}>
          <AdminCompactAddCard onClick={openCreate} label="ثبت ارسال جدید" />
          {sortedRows.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => openEdit(report)}
              className="rounded-xl border bg-card p-4 text-right transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <AdminItemActions
                  onView={report.evidenceFileUrl ? () => handleViewEvidence(report) : undefined}
                  onEdit={() => openEdit(report)}
                  onDelete={() => handleDelete(report)}
                />
              </div>
              <p className="truncate font-medium">{report.title}</p>
              <ChannelBadges channels={report.channels} />
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {formatPersianNumber(report.recipientCount)} نفر
                <span>·</span>
                {formatPersianDate(report.sendDate)}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {truncateMessage(report.messageBody)}
              </p>
              {report.evidenceFileName ? (
                <p className="mt-2 flex items-center gap-1 truncate text-xs text-primary">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  {report.evidenceFileName}
                </p>
              ) : null}
              <AdminCreatedAtText createdAt={report.createdAt} className="mt-2 text-xs" />
              <AdminOwnerBadge
                ownerUserId={report.ownerUserId}
                ownerName={report.ownerName}
                className="mt-1"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-w-[10rem]">
            <AdminCompactAddCard onClick={openCreate} label="ثبت ارسال جدید" />
          </div>
          <div className="overflow-hidden rounded-xl border">
          {sortedRows.map((report) => (
            <div
              key={report.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{report.title}</p>
                  <ChannelBadges channels={report.channels} />
                  <p className="text-xs text-muted-foreground">
                    {formatPersianNumber(report.recipientCount)} نفر · {formatPersianDate(report.sendDate)}
                    {report.evidenceFileName ? ` · ${report.evidenceFileName}` : ""}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {truncateMessage(report.messageBody, 120)}
                  </p>
                  <AdminCreatedAtText createdAt={report.createdAt} className="text-xs" />
                  <AdminOwnerBadge
                    ownerUserId={report.ownerUserId}
                    ownerName={report.ownerName}
                    className="mt-1"
                  />
                </div>
              </div>
              <AdminItemActions
                onView={report.evidenceFileUrl ? () => handleViewEvidence(report) : undefined}
                onEdit={() => openEdit(report)}
                onDelete={() => handleDelete(report)}
              />
            </div>
          ))}
          </div>
        </div>
      )}

      <AdminEditorDialog
        open={open}
        onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}
        title={editingId ? "ویرایش گزارش ارسال" : "ثبت ارسال پیام"}
        description="ثبت گزارش ارسال پیام انبوه با عنوان، رسانه ارسال، تعداد گیرندگان و مستند اختیاری"
        formProps={{ onSubmit }}
        footer={
          <AdminEditorDialogActions submit isPending={isPending} />
        }
      >
        <ProductionSourcePicker
          campaignId={campaignId}
          valueType={sourceProductionType}
          valueId={sourceProductionId}
          label="کدام تولید را نشر می‌کنید؟"
          onChange={(item) => {
            setSourceProductionType(item?.type ?? null);
            setSourceProductionId(item?.id ?? null);
          }}
        />
        <div className="space-y-2">
          <Label className={cn(highlightTitle && "text-destructive")}>عنوان</Label>
          <Input
            {...form.register("title")}
            maxLength={CONTENT_TITLE_MAX_LENGTH}
            placeholder="مثلاً پیامک اطلاع‌رسانی مرحله اول"
            className={cn(highlightTitle && "border-destructive focus-visible:ring-destructive")}
          />
          {form.formState.errors.title ? (
            <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>رسانه ارسال</Label>
          <p className="text-xs text-muted-foreground">
            فقط یک رسانه ارسال را انتخاب کنید.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="رسانه ارسال">
            {SMS_SEND_CHANNEL_OPTIONS.map((channel) => {
              const checked = watchedChannels?.[0] === channel;
              return (
                <button
                  key={channel}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => selectChannel(channel)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-right text-sm transition-colors",
                    checked
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      checked ? "border-primary" : "border-muted-foreground/40"
                    )}
                  >
                    {checked ? (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    ) : null}
                  </span>
                  {isSocialMessengerChannel(channel) ? (
                    <SocialPlatformIcon platform={channel} size="sm" className="h-5 w-5 rounded-md" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="truncate">{getSmsSendChannelLabel(channel)}</span>
                </button>
              );
            })}
          </div>
          {form.formState.errors.channels ? (
            <p className="text-xs text-destructive">{form.formState.errors.channels.message}</p>
          ) : null}
        </div>

        <PersianDateField control={form.control} name="sendDate" label="تاریخ ارسال" />

        <div className="space-y-2">
          <Label>تعداد گیرندگان</Label>
          <Input
            type="number"
            min={1}
            step={1}
            {...form.register("recipientCount")}
            placeholder="مثلاً ۵۰۰۰"
          />
          {form.formState.errors.recipientCount ? (
            <p className="text-xs text-destructive">{form.formState.errors.recipientCount.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>متن پیام ارسال‌شده</Label>
          <Textarea
            {...form.register("messageBody")}
            rows={5}
            placeholder="متن دقیق پیامی که برای مخاطبان ارسال شده را وارد کنید"
          />
          {form.formState.errors.messageBody ? (
            <p className="text-xs text-destructive">{form.formState.errors.messageBody.message}</p>
          ) : null}
        </div>

        <DocumentUpload
          label="مستند ارسال (اختیاری)"
          value={watchedEvidenceUrl ?? ""}
          fileName={watchedEvidenceName}
          onChange={(payload) => {
            form.setValue("evidenceFileUrl", payload.url, { shouldDirty: true });
            form.setValue("evidenceFileName", payload.fileName, { shouldDirty: true });
            form.setValue("evidenceMimeType", payload.mimeType, { shouldDirty: true });
            form.setValue("evidenceFileSize", payload.fileSize, { shouldDirty: true });
          }}
        />
      </AdminEditorDialog>
    </div>
  );
}
