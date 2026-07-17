"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { deleteMinistryAction, saveMinistryAction } from "@/lib/actions/ministry-actions";
import type { Ministry } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "نام کوتاه وزارتخانه الزامی است"),
  fullName: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

interface MinistriesAdminProps {
  initialMinistries: Ministry[];
}

export function MinistriesAdmin({ initialMinistries }: MinistriesAdminProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rows, setRows] = useState(initialMinistries);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      fullName: "",
      description: "",
      isActive: true,
    },
  });

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
      };
      setRows((prev) =>
        editingId
          ? prev.map((row) => (row.id === editingId ? next : row))
          : [next, ...prev]
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">وزارتخانه‌ها</h1>
          <p className="text-sm text-muted-foreground">
            وزارتخانه‌های دولتی را مدیریت کنید؛ سپس برای هر کدام یوزر مادر بسازید.
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
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((item) => (
            <article
              key={item.id}
              className="relative rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div className="absolute left-4 top-4">
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
              </div>
              <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <Building2 className="h-5 w-5" />
              </div>

              <div className="space-y-2 pt-8 pr-14">
                <h2 className="text-lg font-bold leading-snug">{item.name}</h2>
                {item.fullName && (
                  <p className="text-sm text-muted-foreground">{item.fullName}</p>
                )}
                {item.description && (
                  <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
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
            </article>
          ))}
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
    </div>
  );
}
