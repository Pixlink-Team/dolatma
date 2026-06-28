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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { deleteUserAction, saveUserAction } from "@/lib/actions/extended-actions";
import type { AdminUser, CampaignSettings } from "@/lib/types";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "contributor"]),
  password: z.string().optional(),
  campaignIds: z.array(z.string()),
});

interface UsersAdminProps {
  initialUsers: AdminUser[];
  campaigns: CampaignSettings[];
}

export function UsersAdmin({ initialUsers, campaigns }: UsersAdminProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rows, setRows] = useState(initialUsers);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      name: "",
      role: "contributor" as const,
      password: "",
      campaignIds: [] as string[],
    },
  });

  const toggleCampaign = (campaignId: string) => {
    const current = form.getValues("campaignIds");
    form.setValue(
      "campaignIds",
      current.includes(campaignId)
        ? current.filter((id) => id !== campaignId)
        : [...current, campaignId]
    );
  };

  const onSubmit = form.handleSubmit((data) => {
    if (!editingId && !data.password) {
      toast.error("رمز عبور الزامی است");
      return;
    }

    startTransition(async () => {
      const result = await saveUserAction({ ...data, id: editingId ?? undefined });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره نشد");
        return;
      }

      const savedId = "id" in result ? result.id : (editingId ?? crypto.randomUUID());

      const nextUser: AdminUser = {
        id: savedId,
        email: data.email,
        name: data.name,
        role: data.role,
        campaignIds: data.campaignIds,
        createdAt: new Date().toISOString(),
      };

      setRows((prev) =>
        editingId ? prev.map((row) => (row.id === editingId ? { ...row, ...nextUser } : row)) : [...prev, nextUser]
      );
      toast.success("ذخیره شد");
      setOpen(false);
    });
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">کاربران</h1>
          <p className="text-sm text-muted-foreground">تعریف کاربر و دسترسی به کمپین — هر کاربر فقط داده خودش را می‌بیند</p>
        </div>
        <Button onClick={() => { setEditingId(null); form.reset({ email: "", name: "", role: "contributor", password: "", campaignIds: [] }); setOpen(true); }}>
          <Plus className="h-4 w-4" />
          کاربر جدید
        </Button>
      </div>

      <AdminDataTable
        data={rows}
        searchKeys={["name", "email", "role"]}
        columns={[
          { key: "name", label: "نام" },
          { key: "email", label: "ایمیل" },
          { key: "role", label: "نقش", render: (item) => (item.role === "admin" ? "مدیر" : "کاربر") },
          {
            key: "campaignIds",
            label: "کمپین‌ها",
            render: (item) =>
              item.campaignIds
                .map((id) => campaigns.find((campaign) => campaign.id === id)?.title ?? id)
                .join("، ") || "—",
          },
        ]}
        onEdit={(user) => {
          setEditingId(user.id);
          form.reset({
            email: user.email,
            name: user.name,
            role: user.role,
            password: "",
            campaignIds: user.campaignIds,
          });
          setOpen(true);
        }}
        onDelete={(user) => {
          startTransition(async () => {
            await deleteUserAction(user.id);
            setRows((prev) => prev.filter((row) => row.id !== user.id));
            toast.success("حذف شد");
          });
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "ویرایش کاربر" : "کاربر جدید"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label>نام</Label><Input {...form.register("name")} /></div>
            <div className="space-y-2"><Label>ایمیل</Label><Input {...form.register("email")} dir="ltr" /></div>
            <div className="space-y-2">
              <Label>{editingId ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}</Label>
              <Input type="password" {...form.register("password")} />
            </div>
            <div className="space-y-2">
              <Label>نقش</Label>
              <Select value={form.watch("role")} onValueChange={(value) => form.setValue("role", value as "admin" | "contributor")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contributor">کاربر (فقط داده خودش)</SelectItem>
                  <SelectItem value="admin">مدیر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>دسترسی به کمپین‌ها</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {campaigns.map((campaign) => (
                  <label key={campaign.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.watch("campaignIds").includes(campaign.id)}
                      onChange={() => toggleCampaign(campaign.id)}
                    />
                    {campaign.title}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={isPending} className="w-full">ذخیره</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
