"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { deleteMinistryAction, saveMinistryAction } from "@/lib/actions/ministry-actions";
import type { Ministry } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "نام وزارتخانه الزامی است"),
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
    defaultValues: { name: "" },
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({ name: "" });
    setOpen(true);
  };

  const openEdit = (item: Ministry) => {
    setEditingId(item.id);
    form.reset({ name: item.name });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      const result = await saveMinistryAction({
        id: editingId ?? undefined,
        name: data.name,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "وزارتخانه به‌روزرسانی شد" : "وزارتخانه افزوده شد");
      setOpen(false);
      if (editingId) {
        setRows((prev) =>
          prev.map((row) => (row.id === editingId ? { ...row, name: data.name.trim() } : row))
        );
      } else {
        setRows((prev) => [
          {
            id: result.id,
            name: data.name.trim(),
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
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
            وزارتخانه‌های دولتی را تعریف کنید؛ سپس برای هر کدام یوزر مادر بسازید.
          </p>
        </div>
        <Button type="button" onClick={openCreate} disabled={isPending}>
          <Plus className="ml-2 size-4" />
          وزارتخانه جدید
        </Button>
      </div>

      <AdminDataTable
        data={rows}
        searchKeys={["name"]}
        columns={[
          { key: "name", label: "نام", render: (item) => item.name },
          {
            key: "createdAt",
            label: "تاریخ ایجاد",
            render: (item) => new Date(item.createdAt).toLocaleDateString("fa-IR"),
          },
        ]}
        onEdit={openEdit}
        onDelete={onDelete}
        emptyMessage="هنوز وزارتخانه‌ای ثبت نشده است"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "ویرایش وزارتخانه" : "وزارتخانه جدید"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>نام وزارتخانه</Label>
              <Input {...form.register("name")} placeholder="مثلاً وزارت نیرو" />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
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
