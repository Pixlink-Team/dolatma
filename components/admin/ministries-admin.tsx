"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, ChevronDown, ChevronLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  deleteMinistryAction,
  deleteOrganizationAction,
  saveMinistryAction,
  saveOrganizationAction,
} from "@/lib/actions/ministry-actions";
import type { Ministry, MinistryOrganization } from "@/lib/types";

const ministrySchema = z.object({
  name: z.string().min(1, "نام کوتاه وزارتخانه الزامی است"),
  fullName: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

const orgSchema = z.object({
  name: z.string().min(1, "نام زیرمجموعه الزامی است"),
  fullName: z.string().optional(),
  isActive: z.boolean(),
});

interface MinistriesAdminProps {
  initialMinistries: Ministry[];
}

export function MinistriesAdmin({ initialMinistries }: MinistriesAdminProps) {
  const [open, setOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [orgMinistryId, setOrgMinistryId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [rows, setRows] = useState(initialMinistries);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(ministrySchema),
    defaultValues: {
      name: "",
      fullName: "",
      description: "",
      isActive: true,
    },
  });

  const orgForm = useForm({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: "",
      fullName: "",
      isActive: true,
    },
  });

  const orgMinistryName = useMemo(
    () => rows.find((row) => row.id === orgMinistryId)?.name ?? "",
    [orgMinistryId, rows]
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({ name: "", fullName: "", description: "", isActive: true });
    setOpen(true);
  };

  const openEdit = (item: Ministry) => {
    setEditingId(item.id);
    form.reset({
      name: item.name,
      fullName: item.fullName ?? "",
      description: item.description ?? "",
      isActive: item.isActive !== false,
    });
    setOpen(true);
  };

  const openCreateOrg = (ministryId: string) => {
    setOrgMinistryId(ministryId);
    setEditingOrgId(null);
    orgForm.reset({ name: "", fullName: "", isActive: true });
    setExpandedIds((prev) => new Set(prev).add(ministryId));
    setOrgOpen(true);
  };

  const openEditOrg = (ministryId: string, org: MinistryOrganization) => {
    setOrgMinistryId(ministryId);
    setEditingOrgId(org.id);
    orgForm.reset({
      name: org.name,
      fullName: org.fullName ?? "",
      isActive: org.isActive !== false,
    });
    setOrgOpen(true);
  };

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      const result = await saveMinistryAction({
        id: editingId ?? undefined,
        name: data.name,
        fullName: data.fullName?.trim() || null,
        description: data.description?.trim() || null,
        isActive: data.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "وزارتخانه به‌روزرسانی شد" : "وزارتخانه افزوده شد");
      setOpen(false);
      const next: Ministry = {
        id: editingId ?? result.id,
        name: data.name.trim(),
        fullName: data.fullName?.trim() || null,
        description: data.description?.trim() || null,
        isActive: data.isActive,
        createdAt:
          rows.find((row) => row.id === editingId)?.createdAt ?? new Date().toISOString(),
        organizations: editingId
          ? rows.find((row) => row.id === editingId)?.organizations ?? []
          : [],
      };
      setRows((prev) =>
        editingId
          ? prev.map((row) => (row.id === editingId ? next : row))
          : [next, ...prev]
      );
    });
  });

  const onSubmitOrg = orgForm.handleSubmit((data) => {
    if (!orgMinistryId) return;
    startTransition(async () => {
      const result = await saveOrganizationAction({
        id: editingOrgId ?? undefined,
        ministryId: orgMinistryId,
        name: data.name,
        fullName: data.fullName?.trim() || null,
        isActive: data.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editingOrgId ? "زیرمجموعه به‌روزرسانی شد" : "زیرمجموعه افزوده شد");
      setOrgOpen(false);
      const nextOrg: MinistryOrganization = {
        id: editingOrgId ?? result.id,
        ministryId: orgMinistryId,
        ministryName: orgMinistryName,
        name: data.name.trim(),
        fullName: data.fullName?.trim() || null,
        isActive: data.isActive,
        createdAt: new Date().toISOString(),
      };
      setRows((prev) =>
        prev.map((ministry) => {
          if (ministry.id !== orgMinistryId) return ministry;
          const organizations = ministry.organizations ?? [];
          return {
            ...ministry,
            organizations: editingOrgId
              ? organizations.map((org) => (org.id === editingOrgId ? nextOrg : org))
              : [...organizations, nextOrg].sort((a, b) => a.name.localeCompare(b.name, "fa")),
          };
        })
      );
    });
  });

  const onDelete = (item: Ministry) => {
    startTransition(async () => {
      const result = await deleteMinistryAction(item.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("وزارتخانه حذف شد");
      setRows((prev) => prev.filter((row) => row.id !== item.id));
    });
  };

  const onDeleteOrg = (ministryId: string, org: MinistryOrganization) => {
    startTransition(async () => {
      const result = await deleteOrganizationAction(org.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("زیرمجموعه حذف شد");
      setRows((prev) =>
        prev.map((ministry) =>
          ministry.id === ministryId
            ? {
                ...ministry,
                organizations: (ministry.organizations ?? []).filter((item) => item.id !== org.id),
              }
            : ministry
        )
      );
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">وزارتخانه‌ها و زیرمجموعه‌ها</h1>
          <p className="text-sm text-muted-foreground">
            وزارتخانه‌ها و سازمان‌های زیرمجموعه را مدیریت کنید؛ کاربران را می‌توان به وزارتخانه یا
            زیرمجموعه وصل کرد.
          </p>
        </div>
        <Button type="button" onClick={openCreate} disabled={isPending}>
          <Plus className="ml-2 size-4" />
          وزارتخانه جدید
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          هنوز وزارتخانه‌ای ثبت نشده است
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((item) => {
            const organizations = item.organizations ?? [];
            const expanded = expandedIds.has(item.id);
            return (
              <article
                key={item.id}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <button
                      type="button"
                      className="mt-1 rounded-md border p-1 text-muted-foreground hover:bg-muted"
                      onClick={() => toggleExpanded(item.id)}
                      aria-label={expanded ? "بستن زیرمجموعه‌ها" : "نمایش زیرمجموعه‌ها"}
                    >
                      {expanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronLeft className="size-4" />
                      )}
                    </button>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold leading-snug">{item.name}</h2>
                        <Badge
                          variant={item.isActive === false ? "secondary" : "default"}
                          className={
                            item.isActive === false
                              ? undefined
                              : "bg-emerald-600 hover:bg-emerald-600 text-white"
                          }
                        >
                          {item.isActive === false ? "غیرفعال" : "فعال"}
                        </Badge>
                        <Badge variant="outline">{organizations.length} زیرمجموعه</Badge>
                      </div>
                      {item.fullName && (
                        <p className="text-sm text-muted-foreground">{item.fullName}</p>
                      )}
                      {item.description && (
                        <p className="text-sm leading-7 text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openCreateOrg(item.id)}
                      disabled={isPending}
                    >
                      <Plus className="ml-1 size-3.5" />
                      زیرمجموعه
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(item)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openEdit(item)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 border-t pt-3">
                    {organizations.length === 0 ? (
                      <p className="px-2 text-sm text-muted-foreground">
                        هنوز زیرمجموعه‌ای برای این وزارتخانه ثبت نشده است.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {organizations.map((org) => (
                          <li
                            key={org.id}
                            className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{org.name}</p>
                              {org.fullName && (
                                <p className="text-xs text-muted-foreground">{org.fullName}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => onDeleteOrg(item.id, org)}
                                disabled={isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditOrg(item.id, org)}
                                disabled={isPending}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "ویرایش وزارتخانه" : "وزارتخانه جدید"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>نام کوتاه</Label>
              <Input {...form.register("name")} placeholder="مثلاً بهداشت و درمان" />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>نام کامل</Label>
              <Input
                {...form.register("fullName")}
                placeholder="مثلاً وزارت بهداشت، درمان و آموزش پزشکی"
              />
            </div>
            <div className="space-y-2">
              <Label>توضیح</Label>
              <Textarea {...form.register("description")} rows={3} />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
              <span>فعال</span>
              <Switch
                checked={form.watch("isActive")}
                onCheckedChange={(value) => form.setValue("isActive", value)}
              />
            </label>
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

      <Dialog open={orgOpen} onOpenChange={setOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOrgId ? "ویرایش زیرمجموعه" : "زیرمجموعه جدید"}
              {orgMinistryName ? ` — ${orgMinistryName}` : ""}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmitOrg}>
            <div className="space-y-2">
              <Label>نام زیرمجموعه</Label>
              <Input {...orgForm.register("name")} placeholder="مثلاً سازمان غذا و دارو" />
              {orgForm.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {orgForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>نام کامل (اختیاری)</Label>
              <Input {...orgForm.register("fullName")} />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
              <span>فعال</span>
              <Switch
                checked={orgForm.watch("isActive")}
                onCheckedChange={(value) => orgForm.setValue("isActive", value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOrgOpen(false)}>
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
