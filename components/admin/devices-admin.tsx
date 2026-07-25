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
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";

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

type DeviceFormValues = z.infer<typeof deviceSchema>;

interface DevicesAdminProps {
  initialDevices: Device[];
  /** Full admin can create root ministries. */
  canCreateRoot?: boolean;
  /** Passport (360°) is admin-only for now. */
  showPassport?: boolean;
  /** Scoped user's home node — cannot be deleted. */
  homeDeviceId?: string | null;
}

const CHILD_TYPES = (Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).filter(
  (key) => key !== "ministry"
);

export function DevicesAdmin({
  initialDevices,
  canCreateRoot = true,
  showPassport = true,
  homeDeviceId = null,
}: DevicesAdminProps) {
  const { campaignId } = useAdminCampaign();
  const [open, setOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [parentIdForChild, setParentIdForChild] = useState<string | null>(null);
  // Cards start collapsed; expand on demand via the chevron.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [rows] = useState(initialDevices);
  const [isPending, startTransition] = useTransition();

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

  const rowIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);

  /** Nodes whose parent is missing from the loaded set (scoped subtree root or true roots). */
  const displayRoots = useMemo(() => {
    if (homeDeviceId) {
      const home = rows.find((row) => row.id === homeDeviceId);
      if (home) return [home];
    }
    return rows.filter((item) => !item.parentId || !rowIds.has(item.parentId));
  }, [homeDeviceId, rowIds, rows]);

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: "",
      shortName: "",
      type: "ministry",
      mission: "",
      status: "active",
    },
  });

  const childForm = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: "",
      shortName: "",
      type: "organization",
      mission: "",
      status: "active",
    },
  });

  const parentName = useMemo(
    () =>
      rows.find((row) => row.id === parentIdForChild)?.shortName ||
      rows.find((row) => row.id === parentIdForChild)?.name ||
      "",
    [parentIdForChild, rows]
  );

  const editTypeOptions = useMemo(() => {
    const editing = editingId ? rows.find((row) => row.id === editingId) : null;
    if (canCreateRoot && !editingParentId) {
      return Object.keys(DEVICE_TYPE_LABELS) as DeviceType[];
    }
    // Home/root ministry node for scoped users must keep ministry in the type list.
    if (editing && !editing.parentId && editing.type === "ministry") {
      return Object.keys(DEVICE_TYPE_LABELS) as DeviceType[];
    }
    return CHILD_TYPES;
  }, [canCreateRoot, editingId, editingParentId, rows]);

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
    setEditingParentId(null);
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
    setEditingParentId(device.parentId ?? null);
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

  const onSaveDevice = form.handleSubmit((data) => {
    startTransition(async () => {
      const result = await saveDeviceAction({
        id: editingId ?? undefined,
        name: data.name,
        shortName: data.shortName || null,
        type: data.type,
        parentId: editingId ? editingParentId : null,
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
      setExpandedIds((prev) => new Set(prev).add(parentIdForChild));
      window.location.reload();
    });
  });

  const onDelete = (device: Device) => {
    if (homeDeviceId && device.id === homeDeviceId) {
      toast.error("نمی‌توانید دستگاه اصلی خودتان را حذف کنید");
      return;
    }
    if (!confirm(`حذف «${device.shortName || device.name}»؟`)) return;
    startTransition(async () => {
      const result = await deleteDeviceAction(device.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("حذف شد");
      window.location.reload();
    });
  };

  const renderNode = (device: Device, depth: number) => {
    const children = childrenByParent.get(device.id) ?? [];
    const expanded = expandedIds.has(device.id);
    const isHome = homeDeviceId === device.id;
    const paddingRight = 16 + depth * 20;

    return (
      <div key={device.id} className={depth === 0 ? "rounded-lg border bg-card" : ""}>
        <div
          className={`flex flex-wrap items-center gap-2 ${
            depth === 0 ? "p-4" : "border-b px-4 py-3 last:border-b-0"
          }`}
          style={{ paddingRight }}
        >
          <button
            type="button"
            className="rounded p-1 hover:bg-muted"
            onClick={() => toggleExpanded(device.id)}
            aria-label="باز و بسته کردن"
          >
            {children.length > 0 || (device.childrenCount ?? 0) > 0 ? (
              expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )
            ) : (
              <span className="inline-block h-4 w-4" />
            )}
          </button>
          {depth === 0 ? <Building2 className="h-5 w-5 text-muted-foreground" /> : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={depth === 0 ? "font-semibold" : "font-medium"}>
                {device.shortName || device.name}
              </span>
              <Badge variant={depth === 0 ? "secondary" : "outline"}>
                {DEVICE_TYPE_LABELS[device.type]}
              </Badge>
              {depth === 0 ? (
                <Badge variant={device.status === "active" ? "default" : "outline"}>
                  {DEVICE_STATUS_LABELS[device.status]}
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {device.name}
              {typeof device.childrenCount === "number"
                ? ` · ${device.childrenCount} زیرمجموعه`
                : children.length
                  ? ` · ${children.length} زیرمجموعه`
                  : ""}
              {typeof device.usersCount === "number" ? ` · ${device.usersCount} کاربر` : ""}
            </p>
          </div>
          {showPassport ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={adminHref(`/admin/devices/${device.id}`, campaignId)}>
                <IdCard className="ml-1 h-4 w-4" />
                {isHome ? "تکمیل شناسنامه" : "مشاهده شناسنامه"}
              </Link>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openCreateChild(device.id)}
            title="افزودن زیرمجموعه"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEdit(device)}
            title="ویرایش"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!isHome ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(device)}
              title="حذف"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : null}
        </div>

        {expanded && children.length > 0 ? (
          <div className={depth === 0 ? "border-t bg-muted/30" : "bg-muted/20"}>
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">دستگاه‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canCreateRoot
              ? "فهرست وزارتخانه‌ها و زیرمجموعه‌ها — هر دستگاه شناسنامه خودش را تکمیل می‌کند؛ بالادستی فقط مشاهده می‌کند."
              : "درخت دستگاه خودتان — شناسنامه دستگاه خودتان را تکمیل کنید و شناسنامه زیرمجموعه‌ها را فقط ببینید."}
          </p>
        </div>
        {canCreateRoot ? (
          <Button onClick={openCreateRoot} disabled={isPending}>
            <Plus className="ml-2 h-4 w-4" />
            دستگاه جدید
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        {displayRoots.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            {homeDeviceId
              ? "دستگاهی به حساب شما متصل نشده است. با مدیر سیستم هماهنگ کنید."
              : "هنوز دستگاهی ثبت نشده است."}
          </div>
        ) : (
          displayRoots.map((root) => renderNode(root, 0))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "ویرایش دستگاه" : "دستگاه جدید"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSaveDevice}>
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
                  {editTypeOptions.map((key) => (
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
                  {CHILD_TYPES.map((key) => (
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
