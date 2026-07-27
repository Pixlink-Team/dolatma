"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  Copy,
  ExternalLink,
  IdCard,
  Pencil,
  Plus,
  Shield,
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
  saveDevicePublicPageAction,
} from "@/lib/actions/device-actions";
import {
  clearDeviceAccessAction,
  getDeviceSubtreeAccessAction,
  saveDeviceSubtreeAccessAction,
} from "@/lib/actions/device-access-actions";
import { ContributorPermissionsEditor } from "@/components/admin/contributor-permissions-editor";
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";
import { useSectionCreateGate } from "@/lib/hooks/use-section-create-gate";
import {
  DEVICE_STATUS_LABELS,
  DEVICE_TYPE_LABELS,
} from "@/lib/device-labels";
import {
  allContributorPermissionKeys,
  deniedContributorPermissions,
  intersectContributorPermissions,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import type { Device, DeviceStatus, DeviceType } from "@/lib/types";
import { adminHref } from "@/lib/utils";

type AccessEditNode = {
  deviceId: string;
  name: string;
  shortName: string | null;
  parentId: string | null;
  permissions: ContributorPermissions;
  /** Static ceiling from ancestors above the dialog root (server). */
  rootExternalCeiling: ContributorPermissions | null;
  hasOwnRow: boolean;
};

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
  publicSlug: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      "اسلاگ فقط حروف انگلیسی کوچک، عدد و خط تیره"
    ),
  pagePassword: z.string().optional(),
  removePagePassword: z.boolean().optional(),
});

type DeviceFormValues = z.infer<typeof deviceSchema>;

interface DevicesAdminProps {
  initialDevices: Device[];
  /** Full admin can create root ministries. */
  canCreateRoot?: boolean;
  /** Create / edit / delete devices in the tree (manageSubtreeDevices). */
  canManageDevices?: boolean;
  /** Set campaign access ceiling on devices (cascades to subtree users). */
  canManageAccess?: boolean;
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
  canManageDevices = true,
  canManageAccess = false,
  showPassport = true,
  homeDeviceId = null,
}: DevicesAdminProps) {
  const { campaignId } = useAdminCampaign();
  const { requestCreate, tutorialModal } = useSectionCreateGate("subsidiaries");
  const [open, setOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [parentIdForChild, setParentIdForChild] = useState<string | null>(null);
  // Cards start collapsed; expand on demand via the chevron.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [rows] = useState(initialDevices);
  const [isPending, startTransition] = useTransition();

  const [accessOpen, setAccessOpen] = useState(false);
  const [accessDevice, setAccessDevice] = useState<Device | null>(null);
  const [accessNodes, setAccessNodes] = useState<AccessEditNode[]>([]);
  const [accessExpandedIds, setAccessExpandedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [accessLoading, setAccessLoading] = useState(false);
  const [editingHasPagePassword, setEditingHasPagePassword] = useState(false);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Device[]>();
    for (const item of rows) {
      if (!item.parentId || item.parentId === item.id) continue;
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
    return rows.filter(
      (item) =>
        !item.parentId ||
        item.parentId === item.id ||
        !rowIds.has(item.parentId)
    );
  }, [homeDeviceId, rowIds, rows]);

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: "",
      shortName: "",
      type: "ministry",
      mission: "",
      status: "active",
      publicSlug: "",
      pagePassword: "",
      removePagePassword: false,
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
      publicSlug: "",
      pagePassword: "",
      removePagePassword: false,
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
    // Home/root ministry node: scoped users may not change ministry type.
    if (editing && !editing.parentId && editing.type === "ministry") {
      return canCreateRoot
        ? (Object.keys(DEVICE_TYPE_LABELS) as DeviceType[])
        : (["ministry"] as DeviceType[]);
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
    setEditingHasPagePassword(false);
    form.reset({
      name: "",
      shortName: "",
      type: "ministry",
      mission: "",
      status: "active",
      publicSlug: "",
      pagePassword: "",
      removePagePassword: false,
    });
    setOpen(true);
  };

  const openEdit = (device: Device) => {
    setEditingId(device.id);
    setEditingParentId(device.parentId ?? null);
    setEditingHasPagePassword(Boolean(device.hasPagePassword));
    form.reset({
      name: device.name,
      shortName: device.shortName ?? "",
      type: device.type,
      mission: device.mission ?? "",
      status: device.status,
      publicSlug: device.publicSlug ?? "",
      pagePassword: "",
      removePagePassword: false,
    });
    setOpen(true);
  };

  const openCreateChild = (parentId: string) => {
    void requestCreate(() => {
      setParentIdForChild(parentId);
      childForm.reset({
        name: "",
        shortName: "",
        type: "organization",
        mission: "",
        status: "active",
        publicSlug: "",
        pagePassword: "",
        removePagePassword: false,
      });
      setChildOpen(true);
    });
  };

  const savePublicPageForDevice = async (
    deviceId: string,
    data: DeviceFormValues
  ): Promise<boolean> => {
    const slug = data.publicSlug?.trim().toLowerCase() || null;
    const wantsPassword = Boolean(data.pagePassword?.trim());
    const wantsRemove = Boolean(data.removePagePassword);

    // Always persist slug (including clearing); password only when changed.
    const result = await saveDevicePublicPageAction({
      deviceId,
      publicSlug: slug,
      password: wantsPassword ? data.pagePassword : undefined,
      removePassword: wantsRemove && !wantsPassword,
    });
    if (!result.success) {
      toast.error(result.error);
      return false;
    }
    return true;
  };

  const copyPublicLink = async (slug: string) => {
    const url = `${window.location.origin}/device/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("لینک کپی شد");
    } catch {
      toast.error("کپی لینک ناموفق بود");
    }
  };

  const accessChildrenByParent = useMemo(() => {
    const map = new Map<string, AccessEditNode[]>();
    for (const node of accessNodes) {
      if (!node.parentId) continue;
      // Only nest under parents that are part of this dialog tree.
      if (!accessNodes.some((item) => item.deviceId === node.parentId)) continue;
      const list = map.get(node.parentId) ?? [];
      list.push(node);
      map.set(node.parentId, list);
    }
    return map;
  }, [accessNodes]);

  const accessRootNode = useMemo(() => {
    if (!accessDevice) return null;
    return accessNodes.find((node) => node.deviceId === accessDevice.id) ?? null;
  }, [accessDevice, accessNodes]);

  /** Live ceiling from edited ancestors in this dialog (+ external root ceiling). */
  const liveCeilingFor = (deviceId: string): ContributorPermissions | null => {
    const byId = new Map(accessNodes.map((node) => [node.deviceId, node]));
    const node = byId.get(deviceId);
    if (!node) return null;

    let ceiling: ContributorPermissions | null = null;
    let currentParent = node.parentId;
    const seen = new Set<string>();

    while (currentParent && byId.has(currentParent) && !seen.has(currentParent)) {
      seen.add(currentParent);
      const parent = byId.get(currentParent)!;
      ceiling = ceiling
        ? intersectContributorPermissions(ceiling, parent.permissions)
        : parent.permissions;
      currentParent = parent.parentId;
    }

    const external = accessRootNode?.rootExternalCeiling ?? null;
    if (external) {
      ceiling = ceiling ? intersectContributorPermissions(ceiling, external) : external;
    }
    return ceiling;
  };

  const openAccess = (device: Device) => {
    if (!campaignId) {
      toast.error("راستا انتخاب نشده است");
      return;
    }
    setAccessDevice(device);
    setAccessOpen(true);
    setAccessLoading(true);
    setAccessNodes([]);
    setAccessExpandedIds(new Set([device.id]));
    startTransition(async () => {
      const result = await getDeviceSubtreeAccessAction(device.id, campaignId);
      setAccessLoading(false);
      if (!result.success) {
        toast.error(result.error || "بارگذاری دسترسی ناموفق بود");
        setAccessOpen(false);
        return;
      }
      const rootExternal =
        result.nodes.find((node) => node.deviceId === device.id)?.parentCeiling ?? null;
      setAccessNodes(
        result.nodes.map((node) => ({
          deviceId: node.deviceId,
          name: node.name,
          shortName: node.shortName,
          parentId: node.parentId,
          permissions: node.permissions,
          rootExternalCeiling: rootExternal,
          hasOwnRow: node.hasOwnRow,
        }))
      );
      // Expand first level of children so deep tree is immediately editable.
      const firstLevel = result.nodes
        .filter((node) => node.parentId === device.id)
        .map((node) => node.deviceId);
      setAccessExpandedIds(new Set([device.id, ...firstLevel]));
    });
  };

  const onSaveAccess = () => {
    if (!accessDevice || !campaignId || accessNodes.length === 0) return;
    startTransition(async () => {
      const result = await saveDeviceSubtreeAccessAction({
        campaignId,
        nodes: accessNodes.map((node) => ({
          deviceId: node.deviceId,
          permissions: node.permissions,
        })),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `دسترسی ${result.savedDevices} دستگاه ذخیره شد و برای ${result.clampedUsers} کاربر زیرمجموعه فعال شد`
      );
      setAccessOpen(false);
    });
  };

  const onClearAccess = () => {
    if (!accessDevice || !campaignId || !canCreateRoot) return;
    if (!confirm("سقف دسترسی اختصاصی این دستگاه حذف شود؟ (ارث از والد باقی می‌ماند)")) {
      return;
    }
    startTransition(async () => {
      const result = await clearDeviceAccessAction(accessDevice.id, campaignId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("سقف اختصاصی دستگاه حذف شد");
      setAccessOpen(false);
    });
  };

  /** Descendant device ids under a node inside the access dialog tree. */
  const listAccessDescendantIds = (
    nodes: AccessEditNode[],
    rootId: string
  ): Set<string> => {
    const children = new Map<string, string[]>();
    for (const node of nodes) {
      if (!node.parentId) continue;
      if (!nodes.some((item) => item.deviceId === node.parentId)) continue;
      const list = children.get(node.parentId) ?? [];
      list.push(node.deviceId);
      children.set(node.parentId, list);
    }
    const out = new Set<string>();
    const stack = [...(children.get(rootId) ?? [])];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (out.has(id)) continue;
      out.add(id);
      for (const childId of children.get(id) ?? []) stack.push(childId);
    }
    return out;
  };

  /**
   * Update one node and sync changed flags to all descendants so enabling
   * access on a ministry also activates the same flags under organizations.
   */
  const updateAccessNode = (deviceId: string, permissions: ContributorPermissions) => {
    setAccessNodes((prev) => {
      const previous = prev.find((node) => node.deviceId === deviceId);
      const descendants = listAccessDescendantIds(prev, deviceId);
      const changedKeys = allContributorPermissionKeys.filter(
        (key) =>
          !previous ||
          Boolean(previous.permissions[key]) !== Boolean(permissions[key])
      );

      return prev.map((node) => {
        if (node.deviceId === deviceId) {
          return { ...node, permissions };
        }
        if (!descendants.has(node.deviceId) || changedKeys.length === 0) {
          return node;
        }
        const next = { ...node.permissions };
        for (const key of changedKeys) {
          next[key] = Boolean(permissions[key]);
        }
        return { ...node, permissions: next };
      });
    });
  };

  const enableAllAccessFor = (deviceId: string) => {
    const ceiling = liveCeilingFor(deviceId);
    const next = deniedContributorPermissions();
    for (const key of allContributorPermissionKeys) {
      next[key] = ceiling ? Boolean(ceiling[key]) : true;
    }
    updateAccessNode(deviceId, next);
  };

  const disableAllAccessFor = (deviceId: string) => {
    updateAccessNode(deviceId, deniedContributorPermissions());
  };

  const toggleAccessExpanded = (deviceId: string) => {
    setAccessExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) next.delete(deviceId);
      else next.add(deviceId);
      return next;
    });
  };

  const renderAccessNode = (
    node: AccessEditNode,
    depth: number,
    ancestors: Set<string> = new Set()
  ): ReactNode => {
    if (ancestors.has(node.deviceId)) return null;
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(node.deviceId);

    const children = (accessChildrenByParent.get(node.deviceId) ?? []).filter(
      (child) => !nextAncestors.has(child.deviceId)
    );
    const expanded = accessExpandedIds.has(node.deviceId);
    const ceiling = liveCeilingFor(node.deviceId);
    const label = node.shortName || node.name;

    return (
      <div
        key={node.deviceId}
        className={
          depth === 0
            ? "space-y-3"
            : "space-y-3 border-r-2 border-muted pr-3 mr-1"
        }
      >
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            {children.length > 0 ? (
              <button
                type="button"
                className="rounded p-1 hover:bg-muted"
                onClick={() => toggleAccessExpanded(node.deviceId)}
                aria-label="باز و بسته کردن زیرمجموعه"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="inline-block h-6 w-6 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              {node.shortName && node.shortName !== node.name ? (
                <p className="text-xs text-muted-foreground">{node.name}</p>
              ) : null}
            </div>
            {depth === 0 ? (
              <Badge variant="secondary">ریشه</Badge>
            ) : (
              <Badge variant="outline">سطح {depth + 1}</Badge>
            )}
            {!node.hasOwnRow ? (
              <Badge variant="outline" className="text-amber-700 dark:text-amber-400">
                بدون سقف اختصاصی
              </Badge>
            ) : null}
          </div>
          {ceiling ? (
            <p className="text-xs text-muted-foreground">
              محدود به سقف بالادست؛ نمی‌توانید بیشتر از والد بدهید.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => enableAllAccessFor(node.deviceId)}
              disabled={isPending}
            >
              فعال‌سازی همه مجاز
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => disableAllAccessFor(node.deviceId)}
              disabled={isPending}
            >
              خاموش کردن همه
            </Button>
          </div>
          <ContributorPermissionsEditor
            permissions={node.permissions}
            onChange={(next) => updateAccessNode(node.deviceId, next)}
            ceiling={ceiling}
            disabled={isPending}
          />
        </div>

        {expanded && children.length > 0 ? (
          <div className="space-y-3">
            {children.map((child) => renderAccessNode(child, depth + 1, nextAncestors))}
          </div>
        ) : null}
      </div>
    );
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
      const publicOk = await savePublicPageForDevice(result.id, data);
      if (!publicOk) return;
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
      const publicOk = await savePublicPageForDevice(result.id, data);
      if (!publicOk) return;
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
      try {
        const result = await deleteDeviceAction(device.id);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("حذف شد");
        window.location.reload();
      } catch (error) {
        console.error("[devices] delete failed", error);
        toast.error("حذف دستگاه ناموفق بود");
      }
    });
  };

  const renderNode = (
    device: Device,
    depth: number,
    ancestors: Set<string> = new Set()
  ) => {
    // Guard against cyclic parent links that would overflow the call stack.
    if (ancestors.has(device.id)) return null;
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(device.id);

    const children = (childrenByParent.get(device.id) ?? []).filter(
      (child) => !nextAncestors.has(child.id)
    );
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
              {device.publicSlug ? ` · /device/${device.publicSlug}` : ""}
            </p>
          </div>
          {device.publicSlug ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="کپی لینک عمومی"
                onClick={() => void copyPublicLink(device.publicSlug!)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" asChild title="باز کردن صفحه عمومی">
                <a href={`/device/${device.publicSlug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ) : null}
          {showPassport ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={adminHref(`/admin/devices/${device.id}`, campaignId)}>
                <IdCard className="ml-1 h-4 w-4" />
                {isHome ? "تکمیل شناسنامه" : "مشاهده شناسنامه"}
              </Link>
            </Button>
          ) : null}
          {canManageAccess ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openAccess(device)}
              title="دسترسی‌های دستگاه"
            >
              <Shield className="h-4 w-4" />
            </Button>
          ) : null}
          {canManageDevices ? (
            <>
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
            </>
          ) : null}
        </div>

        {expanded && children.length > 0 ? (
          <div className={depth === 0 ? "border-t bg-muted/30" : "bg-muted/20"}>
            {children.map((child) => renderNode(child, depth + 1, nextAncestors))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {tutorialModal}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">دستگاه‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canCreateRoot
              ? "فهرست وزارتخانه‌ها و زیرمجموعه‌ها — هر دستگاه شناسنامه خودش را تکمیل می‌کند؛ بالادستی فقط مشاهده می‌کند."
              : "درخت دستگاه خودتان — شناسنامه دستگاه خودتان را تکمیل کنید و شناسنامه زیرمجموعه‌ها را فقط ببینید."}
          </p>
        </div>
        {canCreateRoot && canManageDevices ? (
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
                disabled={editTypeOptions.length === 1 && editTypeOptions[0] === "ministry"}
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
              {editTypeOptions.length === 1 && editTypeOptions[0] === "ministry" ? (
                <p className="text-xs text-muted-foreground">
                  نوع وزارتخانه ریشه قابل تغییر نیست.
                </p>
              ) : null}
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
            <div className="space-y-2">
              <Label>اسلاگ صفحه عمومی (اختیاری)</Label>
              <Input
                {...form.register("publicSlug")}
                dir="ltr"
                className="text-left"
                placeholder="vezerat-jahad"
              />
              <p className="text-xs text-muted-foreground">
                لینک: /device/اسلاگ — فقط حروف انگلیسی کوچک، عدد و خط تیره
              </p>
              {form.watch("publicSlug")?.trim() ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyPublicLink(form.getValues("publicSlug")!.trim())}
                  >
                    <Copy className="ml-1 h-3.5 w-3.5" />
                    کپی لینک
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a
                      href={`/device/${form.getValues("publicSlug")!.trim()}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      باز کردن
                    </a>
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>رمز صفحه عمومی (اختیاری)</Label>
              <Input
                type="password"
                {...form.register("pagePassword")}
                dir="ltr"
                className="text-left"
                placeholder={
                  editingHasPagePassword
                    ? "رمز جدید (خالی = بدون تغییر)"
                    : "حداقل ۴ کاراکتر"
                }
              />
              {editingHasPagePassword ? (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" {...form.register("removePagePassword")} />
                  حذف رمز فعلی
                </label>
              ) : null}
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
            <div className="space-y-2">
              <Label>اسلاگ صفحه عمومی (اختیاری)</Label>
              <Input
                {...childForm.register("publicSlug")}
                dir="ltr"
                className="text-left"
                placeholder="sazman-foo"
              />
            </div>
            <div className="space-y-2">
              <Label>رمز صفحه عمومی (اختیاری)</Label>
              <Input
                type="password"
                {...childForm.register("pagePassword")}
                dir="ltr"
                className="text-left"
                placeholder="حداقل ۴ کاراکتر"
              />
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              ایجاد زیرمجموعه
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={accessOpen}
        onOpenChange={(next) => {
          setAccessOpen(next);
          if (!next) {
            setAccessDevice(null);
            setAccessNodes([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              دسترسی دستگاه
              {accessDevice
                ? ` — ${accessDevice.shortName || accessDevice.name}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          {accessLoading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
          ) : accessRootNode ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                سقف دسترسی را برای این دستگاه و همه زیرمجموعه‌ها تنظیم کنید. با فعال
                کردن دسترسی روی یک سطح، همان تغییر روی زیرشاخه‌ها هم اعمال می‌شود و پس
                از ذخیره برای همه کاربران آن شاخه فعال می‌گردد.
              </p>
              {accessNodes.length > 1 ? (
                <p className="text-xs text-muted-foreground">
                  {accessNodes.length} دستگاه در این درخت — با فلش زیرشاخه‌ها را باز
                  کنید و دسترسی هر سطح را جداگانه ویرایش کنید.
                </p>
              ) : null}
              {renderAccessNode(accessRootNode, 0)}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="flex-1"
                  disabled={isPending}
                  onClick={onSaveAccess}
                >
                  ذخیره کل درخت دسترسی
                </Button>
                {canCreateRoot && accessRootNode.hasOwnRow ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={onClearAccess}
                  >
                    حذف سقف اختصاصی ریشه
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">دستگاهی برای ویرایش یافت نشد.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
