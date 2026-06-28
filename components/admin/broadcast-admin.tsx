"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { DocumentUpload } from "@/components/ui/document-upload";
import { PersianDateField } from "@/components/ui/persian-date-input";
import { deleteBroadcastReportAction, saveBroadcastReportAction } from "@/lib/actions/extended-actions";
import { todayISO } from "@/lib/jalali";
import type { BroadcastReport, BroadcastReportSummary } from "@/lib/types";
import { formatPersianDate, formatPersianNumber } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1),
  reportDate: z.string(),
  pdfUrl: z.string().min(1),
  fileName: z.string().min(1),
  notes: z.string().optional(),
  published: z.boolean(),
});

interface BroadcastAdminProps {
  campaignId: string;
  initialReports: BroadcastReport[];
}

function formatSummaryPreview(summary: BroadcastReportSummary): string {
  const parts: string[] = [];
  if (summary.totalBillboards != null) {
    parts.push(`${formatPersianNumber(summary.totalBillboards)} پوستر`);
  }
  if (summary.totalCities != null) {
    parts.push(`${formatPersianNumber(summary.totalCities)} شهر`);
  }
  if (summary.temporaryCount != null) {
    parts.push(`${formatPersianNumber(summary.temporaryCount)} موقت`);
  }
  return parts.length > 0 ? parts.join(" · ") : "بدون داده استخراج‌شده";
}

export function BroadcastAdmin({ campaignId, initialReports }: BroadcastAdminProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rows, setRows] = useState(initialReports);
  const [parsedSummary, setParsedSummary] = useState<BroadcastReportSummary | null>(null);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      reportDate: todayISO(),
      pdfUrl: "",
      fileName: "",
      notes: "",
      published: false,
    },
  });

  const parsePdf = async (pdfUrl: string) => {
    setParsingPdf(true);
    try {
      const response = await fetch("/api/broadcast/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl }),
      });

      const body = (await response.json()) as {
        success?: boolean;
        summary?: BroadcastReportSummary;
        error?: string;
      };

      if (!response.ok || !body.success || !body.summary) {
        throw new Error(body.error ?? "استخراج داده از PDF ناموفق بود");
      }

      setParsedSummary(body.summary);
      toast.success("داده‌های PDF استخراج شد");
    } catch (error) {
      setParsedSummary(null);
      toast.error(error instanceof Error ? error.message : "استخراج داده از PDF ناموفق بود");
    } finally {
      setParsingPdf(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setParsedSummary(null);
    form.reset({
      title: "",
      reportDate: todayISO(),
      pdfUrl: "",
      fileName: "",
      notes: "",
      published: false,
    });
    setOpen(true);
  };

  const openEdit = (report: BroadcastReport) => {
    setEditingId(report.id);
    setParsedSummary(report.summaryData);
    form.reset({
      title: report.title,
      reportDate: report.reportDate,
      pdfUrl: report.pdfUrl,
      fileName: report.fileName,
      notes: report.summaryData.notes ?? "",
      published: report.published,
    });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      const summaryData: BroadcastReportSummary = {
        ...(parsedSummary ?? {}),
        notes: data.notes,
      };

      const payload = {
        campaignId,
        id: editingId ?? undefined,
        title: data.title,
        reportDate: data.reportDate,
        pdfUrl: data.pdfUrl,
        fileName: data.fileName,
        published: data.published,
        summaryData,
      };

      const result = await saveBroadcastReportAction(payload);
      if (!result.success) {
        toast.error("ذخیره نشد");
        return;
      }

      const savedId = "id" in result ? result.id : (editingId ?? crypto.randomUUID());

      const nextRow: BroadcastReport = {
        id: savedId,
        campaignId,
        title: data.title,
        reportDate: data.reportDate,
        pdfUrl: data.pdfUrl,
        fileName: data.fileName,
        summaryData,
        published: data.published,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setRows((prev) =>
        editingId ? prev.map((row) => (row.id === editingId ? { ...row, ...nextRow } : row)) : [...prev, nextRow]
      );
      toast.success("ذخیره شد");
      setOpen(false);
    });
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">گزارش پخش صدا و سیما</h1>
          <p className="text-sm text-muted-foreground">
            آپلود PDF روزانه؛ آمار و جداول به‌صورت خودکار از فایل استخراج می‌شود
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          افزودن گزارش
        </Button>
      </div>

      <AdminDataTable
        data={rows}
        searchKeys={["title", "fileName"]}
        columns={[
          { key: "title", label: "عنوان" },
          { key: "reportDate", label: "تاریخ", render: (item) => formatPersianDate(item.reportDate) },
          {
            key: "summary",
            label: "خلاصه",
            render: (item) => formatSummaryPreview(item.summaryData),
          },
          { key: "published", label: "وضعیت", render: (item) => (item.published ? "منتشر" : "پیش‌نویس") },
        ]}
        onEdit={openEdit}
        onDelete={(item) => {
          startTransition(async () => {
            await deleteBroadcastReportAction(item.id);
            setRows((prev) => prev.filter((row) => row.id !== item.id));
            toast.success("حذف شد");
          });
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "ویرایش گزارش" : "گزارش جدید"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان گزارش</Label>
              <Input {...form.register("title")} placeholder="مثلاً گزارش روزانه بیلبورد" />
            </div>

            <PersianDateField control={form.control} name="reportDate" label="تاریخ گزارش" />

            <DocumentUpload
              label="فایل PDF گزارش"
              value={form.watch("pdfUrl")}
              fileName={form.watch("fileName")}
              onChange={(payload) => {
                form.setValue("pdfUrl", payload.url);
                form.setValue("fileName", payload.fileName || "report.pdf");
                if (!form.getValues("title")) {
                  form.setValue("title", payload.fileName?.replace(/\.pdf$/i, "") ?? "گزارش پخش");
                }
                void parsePdf(payload.url);
              }}
            />

            {parsingPdf && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال استخراج داده از PDF...
              </div>
            )}

            {parsedSummary && !parsingPdf && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <p className="font-medium">داده‌های استخراج‌شده از PDF</p>
                <p className="text-muted-foreground">{formatSummaryPreview(parsedSummary)}</p>
                {parsedSummary.clientName && (
                  <p className="text-muted-foreground">مشتری: {parsedSummary.clientName}</p>
                )}
                {parsedSummary.statusBreakdown && parsedSummary.statusBreakdown.length > 0 && (
                  <p className="text-muted-foreground">
                    {formatPersianNumber(parsedSummary.statusBreakdown.length)} وضعیت ·{" "}
                    {formatPersianNumber(parsedSummary.cityBreakdown?.length ?? 0)} شهر ·{" "}
                    {formatPersianNumber(parsedSummary.billboards?.length ?? 0)} پوستر در لیست
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>یادداشت (اختیاری)</Label>
              <Textarea {...form.register("notes")} placeholder="نکات تکمیلی برای نمایش در داشبورد" />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.watch("published")} onCheckedChange={(value) => form.setValue("published", value)} />
              <Label>منتشر شود</Label>
            </div>

            <Button type="submit" disabled={isPending || parsingPdf} className="w-full">
              ذخیره
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
