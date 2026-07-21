"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExternalLink, Globe, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaUpload } from "@/components/ui/media-upload";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { adminOwnerTableColumn } from "@/components/admin/admin-owner-badge";
import {
  deleteCompanyWebsiteAction,
  saveCompanyWebsiteAction,
} from "@/lib/actions/admin-actions";
import { useSectionCreateGate } from "@/lib/hooks/use-section-create-gate";
import { CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE } from "@/lib/content-constraints";
import { stripFileAccessToken } from "@/lib/uploads";
import type { CompanyWebsite } from "@/lib/types";

const schema = z.object({
  title: z
    .string()
    .min(1, "نام سایت الزامی است")
    .max(CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE),
  url: z.string().url("لینک معتبر وارد کنید"),
  companyName: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CompanyWebsitesAdminProps {
  campaignId: string;
  initialItems: CompanyWebsite[];
}

export function CompanyWebsitesAdmin({ campaignId, initialItems }: CompanyWebsitesAdminProps) {
  const { requestCreate, tutorialModal } = useSectionCreateGate("analytics");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(initialItems);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      url: "",
      companyName: "",
      description: "",
      logoUrl: "",
    },
  });

  const resetForm = () => {
    setEditingId(null);
    form.reset({
      title: "",
      url: "",
      companyName: "",
      description: "",
      logoUrl: "",
    });
  };

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      const payload = {
        campaignId,
        id: editingId ?? undefined,
        title: data.title.trim(),
        url: data.url.trim(),
        companyName: data.companyName?.trim() || null,
        description: data.description?.trim() || null,
        logoUrl: stripFileAccessToken(data.logoUrl || "") || null,
        published: true,
      };
      const result = await saveCompanyWebsiteAction(payload);
      if (!result?.success) {
        toast.error("error" in result && result.error ? String(result.error) : "خطا در ذخیره");
        return;
      }

      if (editingId) {
        setRows((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? ({
                  ...item,
                  ...payload,
                  updatedAt: new Date().toISOString(),
                } as CompanyWebsite)
              : item
          )
        );
      } else {
        setRows((prev) => [
          {
            id: "id" in result && result.id ? String(result.id) : crypto.randomUUID(),
            campaignId,
            title: payload.title,
            url: payload.url,
            companyName: payload.companyName,
            description: payload.description,
            logoUrl: payload.logoUrl,
            published: true,
            sortOrder: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      toast.success("ذخیره شد");
      setOpen(false);
      resetForm();
    });
  });

  const openCreate = () => {
    void requestCreate(() => {
      resetForm();
      setOpen(true);
    });
  };

  const openEdit = (item: CompanyWebsite) => {
    setEditingId(item.id);
    form.reset({
      title: item.title,
      url: item.url,
      companyName: item.companyName ?? "",
      description: item.description ?? "",
      logoUrl: item.logoUrl ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      {tutorialModal}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">سایت‌های شرکت‌ها</h1>
          <p className="text-sm text-muted-foreground">
            معرفی سایت شرکت شما با نام و لینک — جدا از بخش انتشار مطلب در سایت
          </p>
        </div>
        <Button onClick={openCreate} disabled={isPending}>
          <Plus className="h-4 w-4" />
          افزودن سایت
        </Button>
      </div>

      <AdminDataTable
        data={rows}
        searchKeys={["title", "companyName", "url"]}
        columns={[
          {
            key: "logo",
            label: "لوگو",
            render: (item) =>
              item.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.logoUrl} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
              ),
          },
          { key: "title", label: "نام سایت", render: (item) => item.title },
          {
            key: "company",
            label: "شرکت",
            render: (item) => item.companyName || "—",
          },
          {
            key: "url",
            label: "لینک",
            render: (item) => (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                باز کردن
              </a>
            ),
          },
          adminOwnerTableColumn<CompanyWebsite>(),
        ]}
        onEdit={openEdit}
        onDelete={(item) => {
          startTransition(async () => {
            const result = await deleteCompanyWebsiteAction(item.id);
            if (!result?.success) {
              toast.error("error" in result && result.error ? String(result.error) : "خطا در حذف");
              return;
            }
            setRows((prev) => prev.filter((row) => row.id !== item.id));
            toast.success("حذف شد");
          });
        }}
      />

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "ویرایش سایت" : "افزودن سایت شرکت"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cw-title">نام سایت / عنوان</Label>
              <Input id="cw-title" {...form.register("title")} placeholder="مثلاً سایت رسمی شرکت" />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cw-url">لینک</Label>
              <Input
                id="cw-url"
                dir="ltr"
                className="text-left"
                {...form.register("url")}
                placeholder="https://example.com"
              />
              {form.formState.errors.url && (
                <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cw-company">نام شرکت (اختیاری)</Label>
              <Input id="cw-company" {...form.register("companyName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cw-description">توضیح کوتاه (اختیاری)</Label>
              <Textarea id="cw-description" rows={3} {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label>لوگو / تصویر (اختیاری)</Label>
              <MediaUpload
                value={form.watch("logoUrl") || ""}
                onChange={(url) => form.setValue("logoUrl", url)}
                accept="image/*"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={isPending}>
                ذخیره
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
