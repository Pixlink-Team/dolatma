"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  IdCard,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteDeviceAction,
  saveDeviceAction,
} from "@/lib/actions/device-actions";
import {
  DEVICE_STATUS_LABELS,
  DEVICE_TYPE_LABELS,
} from "@/lib/device-labels";
import type { Device, DeviceStatus, DeviceType } from "@/lib/types";
import { adminHref } from "@/lib/utils";

const deviceSchema = z.object({
  name: z.string().min(1, "نام دستگاه الزامی است"),
  shortName: z.string().optional(),
  type: z.enum([
    "ministry",
    "organization",
    "directorate",
    "company",
    "governorate",
    "municipality",
    "other",
  ]),
  mission: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]),
});

interface DevicesAdminProps {
  initialDevices: Device[];
}

export function DevicesAdmin({ initialDevices }: DevicesAdminProps) {
  const [open, setOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parentIdForChild, setParentIdForChild] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [rows, setRows] = useState(initialDevices);
  const [isPending, startTransition] = useTransition();

  const roots = useMemo(
    () => rows.filter((item) => !item.parentId),
    [rows]
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Device[]>();
    for (const item of rows) {
      if (!item.parentId) continue;
      const list = map.get(item.parentId) ?? [];
      list.push(item);
      map.set(item.parentId, list);
    }
    return map;
  }, [rows]);

  const form = useForm({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: "",
      shortName: "",
      type: "ministry" as DeviceType,
      mission: "",
      status: "active" as DeviceStatus,
    },
  });

  const childForm = useForm({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: "",
      shortName: "",
      type: "organization" as DeviceType,
      mission: "",
      status: "active" as DeviceStatus,
    },
  });

  const parentName = useMemo(
    () => rows.find((row) => row.id === parentIdForChild)?.shortName
      || rows.find((row) => row.id === parentIdForChild)?.name
      || "",
    [parentIdForChild, rows]
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateRoot = () => {
    setEditingId(null);
    form.reset({
      name: "",
      shortName: "",
      type: "ministry",
      mission: "",
      status: "active",
    });
    setOpen(true);
  };

  const openEdit = (device: Device) => {
    setEditingId(device.id);
    form.reset({
      name: device.name,
      shortName: device.shortName ?? "",
      type: device.type,
      mission: device.mission ?? "",
      status: device.status,
    });
    setOpen(true);
  };

  const openCreateChild = (parentId: string) => {
    setParentIdForChild(parentId);
    childForm.reset({
      name: "",
      shortName: "",
      type: "organization",
      mission: "",
      status: "active",
    });
    setChildOpen(true);
  };

  const onSaveRoot = form.handleSubmit((data) => {
    startTransition(async () => {
      const result = await saveDeviceAction({
        id: editingId ?? undefined,
        name: data.name,
        shortName: data.shortName || null,
        type: data.type,
        parentId: null,
        mission: data.mission || null,
        status: data.status,
        activityScope: "national",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "دستگاه به‌روزرسانی شد" : "دستگاه ایجاد شد");
      setOpen(false);
      window.location.reload();
    });
  });

  const onSaveChild = childForm.handleSubmit((data) => {
    if (!parentIdForChild) return;
    startTransition(async () => {
      const result = await saveDeviceAction({
        name: data.name,
        shortName: data.shortName || null,
        type: data.type,
        parentId: parentIdForChild,
        mission: data.mission || null,
        status: data.status,
        activityScope: "national",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("زیرمجموعه ایجاد شد");
      setChildOpen(false);
      window.location.reload();
    });
  });

  const onDelete = (device: Device) => {
    if (!confirm(`حذف «${device.shortName || device.name}»؟`)) return;
    startTransition(async () => {
      const result = await deleteDeviceAction(device.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("حذف شد");
      setRows((prev) => prev.filter((item) => item.id !== device.id && item.parentId !== device.id));
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">دستگاه‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            فهرست وزارتخانه‌ها و زیرمجموعه‌ها — برای جزئیات وارد شناسنامه ۳۶۰ درجه شوید.
          </p>
        </div>
        <Button onClick={openCreateRoot} disabled={isPending}>
          <Plus className="ml-2 h-4 w-4" />
          دستگاه جدید
        </Button>
      </div>

      <div className="space-y-3">
        {roots.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            هنوز دستگاهی ثبت نشده است.
          </div>
        ) : (
          roots.map((root) => {
            const children = childrenByParent.get(root.id) ?? [];
            const expanded = expandedIds.has(root.id);
            return (
              <div key={root.id} className="rounded-lg border bg-card">
                <div className="flex flex-wrap items-center gap-2 p-4">
                  <button
                    type="button"
                    className="rounded p-1 hover:bg-muted"
                    onClick={() => toggleExpanded(root.id)}
                    aria-label="باز و بسته کردن"
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </button>
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {root.shortName || root.name}
                      </span>
                      <Badge variant="secondary">
                        {DEVICE_TYPE_LABELS[root.type]}
                      </Badge>
                      <Badge variant={root.status === "active" ? "default" : "outline"}>
                        {DEVICE_STATUS_LABELS[root.status]}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {root.name}
                      {typeof root.childrenCount === "number"
                        ? ` · ${root.childrenCount} زیرمجموعه`
                        : children.length
                          ? ` · ${children.length} زیرمجموعه`
                          : ""}
                      {typeof root.usersCount === "number"
                        ? ` · ${root.usersCount} کاربر`
                        : ""}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={adminHref(`/admin/devices/${root.id}`)}>
                      <IdCard className="ml-1 h-4 w-4" />
                      شناسنامه
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openCreateChild(root.id)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(root)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(root)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {expanded && children.length > 0 && (
                  <div className="border-t bg-muted/30">
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className="flex flex-wrap items-center gap-2 border-b px-4 py-3 last:border-b-0"
                      >
                        <div className="w-8" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {child.shortName || child.name}
                            </span>
                            <Badge variant="outline">
                              {DEVICE_TYPE_LABELS[child.type]}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {child.name}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={adminHref(`/admin/devices/${child.id}`)}>
                            <IdCard className="ml-1 h-4 w-4" />
                            شناسنامه
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(child)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(child)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "ویرایش دستگاه" : "دستگاه جدید"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSaveRoot}>
            <div className="space-y-2">
              <Label>نام کامل</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>نام کوتاه</Label>
              <Input {...form.register("shortName")} />
            </div>
            <div className="space-y-2">
              <Label>نوع</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value) => form.setValue("type", value as DeviceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {DEVICE_TYPE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>وضعیت</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => form.setValue("status", value as DeviceStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEVICE_STATUS_LABELS) as DeviceStatus[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {DEVICE_STATUS_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>حوزه مأموریت</Label>
              <Textarea rows={3} {...form.register("mission")} />
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              ذخیره
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={childOpen} onOpenChange={setChildOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>زیرمجموعه برای «{parentName}»</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSaveChild}>
            <div className="space-y-2">
              <Label>نام کامل</Label>
              <Input {...childForm.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>نام کوتاه</Label>
              <Input {...childForm.register("shortName")} />
            </div>
            <div className="space-y-2">
              <Label>نوع</Label>
              <Select
                value={childForm.watch("type")}
                onValueChange={(value) => childForm.setValue("type", value as DeviceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {DEVICE_TYPE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              ایجاد زیرمجموعه
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
