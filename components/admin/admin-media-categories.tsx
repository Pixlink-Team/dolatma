"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveCategoryAction } from "@/lib/actions/admin-actions";
import type { MediaCategory, MediaCategoryType } from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";

const categorySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.coerce.number(),
  published: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface AdminMediaCategoriesProps {
  campaignId: string;
  type: MediaCategoryType;
  categories: MediaCategory[];
  label: string;
}

export function AdminMediaCategories({
  campaignId,
  type,
  categories,
  label,
}: AdminMediaCategoriesProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MediaCategory | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { title: "", description: "", sortOrder: 1, published: true },
  });

  const refresh = () => router.refresh();

  const openCreate = () => {
    setEditingCategory(null);
    form.reset({
      title: "",
      description: "",
      sortOrder: categories.length + 1,
      published: true,
    });
    setOpen(true);
  };

  const openEdit = (category: MediaCategory) => {
    setEditingCategory(category);
    form.reset({
      title: category.title,
      description: category.description ?? "",
      sortOrder: category.sortOrder,
      published: category.published,
    });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      await saveCategoryAction({
        ...data,
        id: editingCategory?.id,
        campaignId,
        type,
      });
      toast.success(editingCategory ? "دسته ویرایش شد" : "دسته افزوده شد");
      setOpen(false);
      setEditingCategory(null);
      form.reset();
      refresh();
    });
  });

  return (
    <>
      <div className="rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">دسته‌بندی {label}</p>
            <p className="text-xs text-muted-foreground">دسته‌های ساخته‌شده قابل ویرایش هستند</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            دسته جدید
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">دسته‌ای ثبت نشده است.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => openEdit(category)}
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-right transition-colors hover:bg-muted/60"
              >
                <span className="text-sm font-medium">{category.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {formatPersianNumber(category.sortOrder)}
                </Badge>
                <Badge variant={category.published ? "success" : "secondary"} className="text-[10px]">
                  {category.published ? "منتشر" : "پیش‌نویس"}
                </Badge>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "ویرایش دسته" : `افزودن دسته ${label}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>عنوان</Label>
              <Input {...form.register("title")} />
            </div>
            <div>
              <Label>توضیحات</Label>
              <Textarea {...form.register("description")} rows={2} />
            </div>
            <div>
              <Label>ترتیب</Label>
              <Input type="number" {...form.register("sortOrder")} />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch("published")}
                onCheckedChange={(value) => form.setValue("published", value)}
              />
              <Label>منتشر</Label>
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "در حال ذخیره..." : "ذخیره دسته"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
