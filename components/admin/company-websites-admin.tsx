"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExternalLink, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaUpload } from "@/components/ui/media-upload";
import { Card, CardContent } from "@/components/ui/card";
import { AdminCompactAddCard } from "@/components/admin/admin-compact-add-card";
import { AdminItemActions } from "@/components/admin/admin-item-actions";
import {
  deleteCompanyWebsiteAction,
  saveCompanyWebsiteAction,
} from "@/lib/actions/admin-actions";
import { useSectionCreateGate } from "@/lib/hooks/use-section-create-gate";
import { CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE } from "@/lib/content-constraints";
import { stripFileAccessToken } from "@/lib/uploads";
import { ensureHttpUrl } from "@/lib/utils";
import type { CompanyWebsite } from "@/lib/types";

const schema = z.object({
  title: z
    .string()
    .min(1, "نام سایت الزامی است")
    .max(CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE),
  url: z.string().transform((value, ctx) => {
    const url = ensureHttpUrl(value);
    if (!url) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "لینک معتبر وارد کنید" });
      return z.NEVER;
    }
    return url;
  }),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CompanyWebsitesAdminProps {
  campaignId: string;
  initialItems: CompanyWebsite[];
}

export function CompanyWebsitesAdmin({ campaignId, initialItems }: CompanyWebsitesAdminProps) {
  const { requestCreate, tutorialModal } = useSectionCreateGate("analytics", campaignId);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(initialItems);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      url: "",
      description: "",
      logoUrl: "",
    },
  });

  const resetForm = () => {
    setEditingId(null);
    form.reset({
      title: "",
      url: "",
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
        companyName: null,
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
            companyName: null,
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
      description: item.description ?? "",
      logoUrl: item.logoUrl ?? "",
    });
    setOpen(true);
  };

  const handleDelete = (item: CompanyWebsite) => {
    startTransition(async () => {
      const result = await deleteCompanyWebsiteAction(item.id);
      if (!result?.success) {
        toast.error("error" in result && result.error ? String(result.error) : "خطا در حذف");
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== item.id));
      toast.success("حذف شد");
    });
  };

  return (
    <div className="space-y-6">
      {tutorialModal}
      <div>
        <h1 className="text-2xl font-bold">سایت‌ها</h1>
        <p className="text-sm text-muted-foreground">
          معرفی سایت‌ها با نام و لینک — جدا از بخش انتشار مطلب در سایت
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <AdminCompactAddCard
          onClick={openCreate}
          disabled={isPending}
          label="افزودن سایت"
          aspectClass="min-h-[11rem] h-full aspect-auto"
        />
        {rows.map((item) => {
          const openSite = () => {
            if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
            else openEdit(item);
          };
          return (
            <Card
              key={item.id}
              className="cursor-pointer overflow-hidden transition hover:border-primary/40 hover:shadow-sm"
              onClick={openSite}
              role="link"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openSite();
                }
              }}
            >
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {item.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.logoUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Globe className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.title}</p>
                      {item.ownerName ? (
                        <p className="truncate text-xs text-muted-foreground">{item.ownerName}</p>
                      ) : null}
                    </div>
                  </div>
                  <div onClick={(event) => event.stopPropagation()}>
                    <AdminItemActions
                      onView={openSite}
                      onEdit={() => openEdit(item)}
                      onDelete={() => handleDelete(item)}
                    />
                  </div>
                </div>

                {item.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                ) : null}

                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline"
                  dir="ltr"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.url}</span>
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "ویرایش سایت" : "افزودن سایت"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cw-title">نام سایت / عنوان</Label>
              <Input id="cw-title" {...form.register("title")} placeholder="مثلاً سایت رسمی" />
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
                placeholder="example.com یا https://example.com"
              />
              {form.formState.errors.url && (
                <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
              )}
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
