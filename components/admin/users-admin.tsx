"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProvinceCityFields } from "@/components/admin/province-city-fields";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersImportPanel } from "@/components/admin/users-import-panel";
import { getLoginUsernameFromEmail, normalizeStoredUserEmail } from "@/lib/auth/user-login";
import { normalizeImportedCity, normalizeImportedProvince } from "@/lib/iran-locations";
import {
  deleteUserAction,
  deleteUsersAction,
  saveUserAction,
  saveUserMinistryAction,
} from "@/lib/actions/extended-actions";
import {
  contributorPermissionLabels,
  defaultContributorPermissions,
  normalizeContributorPermissions,
  type ContributorPermissionKey,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import { getRoleLabel } from "@/lib/user-roles";
import type { AdminRole, AdminUser, CampaignSettings, Ministry } from "@/lib/types";

const NO_MINISTRY = "__none__";
const NO_ORGANIZATION = "__none__";
const NO_PARENT = "__none__";

const schema = z.object({
  email: z.string().min(1, "نام کاربری یا ایمیل الزامی است"),
  name: z.string().min(1),
  role: z.enum(["admin", "contributor", "client", "ministry_parent", "sub_user"]),
  password: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  ministryId: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  parentUserId: z.string().nullable().optional(),
  campaignIds: z.array(z.string()),
});

const permissionKeys = Object.keys(contributorPermissionLabels) as ContributorPermissionKey[];

const rolesWithCampaignAccess: AdminRole[] = [
  "contributor",
  "client",
  "ministry_parent",
  "sub_user",
];

interface UsersAdminProps {
  initialUsers: AdminUser[];
  campaigns: CampaignSettings[];
  ministries?: Ministry[];
  /** full = admin; ministry = client can only set ministry; sub_users = ministry parent manages children */
  mode?: "full" | "ministry" | "sub_users";
  parentUserId?: string;
  parentMinistryId?: string | null;
}

export function UsersAdmin({
  initialUsers,
  campaigns,
  ministries = [],
  mode = "full",
  parentUserId,
  parentMinistryId = null,
}: UsersAdminProps) {
  const isFullMode = mode === "full";
  const isSubUsersMode = mode === "sub_users";
  const isMinistryOnlyMode = mode === "ministry";
  const canManageUsers = isFullMode || isSubUsersMode;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rows, setRows] = useState(initialUsers);
  const [campaignPermissions, setCampaignPermissions] = useState<Record<string, ContributorPermissions>>({});
  const [isPending, startTransition] = useTransition();

  const parentOptions = useMemo(
    () => rows.filter((user) => user.role === "ministry_parent"),
    [rows]
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      name: "",
      role: (isSubUsersMode ? "sub_user" : "contributor") as AdminRole,
      password: "",
      province: "",
      city: "",
      phone: "",
      ministryId: null as string | null,
      organizationId: null as string | null,
      parentUserId: parentUserId ?? null,
      campaignIds: [] as string[],
    },
  });

  const selectedCampaignIds = form.watch("campaignIds") ?? [];
  const selectedRole = form.watch("role");
  const selectedProvince = form.watch("province");
  const selectedCity = form.watch("city");
  const selectedMinistryId = form.watch("ministryId");
  const selectedOrganizationId = form.watch("organizationId");
  const selectedParentUserId = form.watch("parentUserId");

  const organizationOptions = useMemo(() => {
    const ministryId = selectedMinistryId || (isSubUsersMode ? parentMinistryId : null);
    if (!ministryId) return [] as NonNullable<Ministry["organizations"]>;
    return ministries.find((ministry) => ministry.id === ministryId)?.organizations ?? [];
  }, [ministries, selectedMinistryId, isSubUsersMode, parentMinistryId]);

  const toggleCampaign = (campaignId: string) => {
    const current = form.getValues("campaignIds");
    if (current.includes(campaignId)) {
      form.setValue(
        "campaignIds",
        current.filter((id) => id !== campaignId)
      );
      return;
    }

    form.setValue("campaignIds", [...current, campaignId]);
    setCampaignPermissions((prev) => ({
      ...prev,
      [campaignId]: prev[campaignId] ?? defaultContributorPermissions(),
    }));
  };

  const togglePermission = (campaignId: string, key: ContributorPermissionKey, value: boolean) => {
    setCampaignPermissions((prev) => ({
      ...prev,
      [campaignId]: {
        ...(prev[campaignId] ?? defaultContributorPermissions()),
        [key]: value,
      },
    }));
  };

  const onSubmit = form.handleSubmit((data) => {
    if (isMinistryOnlyMode) {
      if (!editingId) return;
      startTransition(async () => {
        const organizationId = data.organizationId ?? null;
        const result = await saveUserMinistryAction({
          userId: editingId,
          ministryId: data.ministryId ?? null,
          organizationId,
        });
        if (!result.success) {
          toast.error("error" in result ? result.error : "ذخیره نشد");
          return;
        }
        const ministry = ministries.find((item) => item.id === data.ministryId);
        const ministryName = ministry?.name ?? null;
        const organizationName =
          ministry?.organizations?.find((item) => item.id === organizationId)?.name ?? null;
        setRows((prev) =>
          prev.map((row) =>
            row.id === editingId
              ? {
                  ...row,
                  ministryId: data.ministryId ?? null,
                  ministryName,
                  organizationId,
                  organizationName,
                }
              : row
          )
        );
        toast.success("وزارتخانه / زیرمجموعه ذخیره شد");
        setOpen(false);
      });
      return;
    }

    if (!editingId && !data.password) {
      toast.error("رمز عبور الزامی است");
      return;
    }

    const role: AdminRole = isSubUsersMode ? "sub_user" : data.role;
    const ministryId =
      (isSubUsersMode ? parentMinistryId : null) || data.ministryId || null;
    const organizationId = data.organizationId ?? null;
    const nextParentUserId = isSubUsersMode
      ? parentUserId ?? null
      : role === "sub_user"
        ? data.parentUserId ?? null
        : null;

    if (isFullMode && role === "ministry_parent" && !ministryId) {
      toast.error("برای یوزر مادر انتخاب وزارتخانه الزامی است");
      return;
    }
    if (isFullMode && role === "sub_user" && !nextParentUserId) {
      toast.error("برای کاربر زیرمجموعه انتخاب یوزر مادر الزامی است");
      return;
    }

    startTransition(async () => {
      const result = await saveUserAction({
        ...data,
        role,
        email: normalizeStoredUserEmail(data.email),
        id: editingId ?? undefined,
        province: data.province?.trim() || null,
        city: data.city?.trim() || null,
        phone: data.phone?.trim() || null,
        ministryId,
        organizationId,
        parentUserId: nextParentUserId,
        campaignPermissions: rolesWithCampaignAccess.includes(role) ? campaignPermissions : undefined,
      });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره نشد");
        return;
      }

      const savedId = "id" in result ? result.id : (editingId ?? crypto.randomUUID());
      const existing = rows.find((row) => row.id === editingId);
      const ministry = ministries.find((item) => item.id === ministryId);
      const ministryName = ministry?.name ?? existing?.ministryName ?? null;
      const organizationName =
        ministry?.organizations?.find((item) => item.id === organizationId)?.name ??
        existing?.organizationName ??
        null;
      const parentName =
        parentOptions.find((item) => item.id === nextParentUserId)?.name ??
        existing?.parentUserName ??
        null;

      const nextUser: AdminUser = {
        id: savedId!,
        email: normalizeStoredUserEmail(data.email),
        name: data.name,
        role,
        province: data.province?.trim() || null,
        city: data.city?.trim() || null,
        phone: data.phone?.trim() || null,
        accountManagerName: existing?.accountManagerName ?? null,
        ministryId,
        ministryName,
        organizationId,
        organizationName,
        parentUserId: nextParentUserId,
        parentUserName: parentName,
        campaignIds: data.campaignIds,
        campaignPermissions: rolesWithCampaignAccess.includes(role) ? campaignPermissions : {},
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };

      setRows((prev) =>
        editingId ? prev.map((row) => (row.id === editingId ? { ...row, ...nextUser } : row)) : [...prev, nextUser]
      );
      toast.success("ذخیره شد");
      setOpen(false);
    });
  });

  const openCreate = () => {
    if (!canManageUsers) return;
    setEditingId(null);
    setCampaignPermissions({});
    form.reset({
      email: "",
      name: "",
      role: isSubUsersMode ? "sub_user" : "contributor",
      password: "",
      province: "",
      city: "",
      phone: "",
      ministryId: null,
      organizationId: null,
      parentUserId: parentUserId ?? null,
      campaignIds: [],
    });
    setOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditingId(user.id);
    const permissions = user.campaignPermissions ?? {};
    const normalizedProvince =
      normalizeImportedProvince(user.province ?? "") ?? user.province?.trim() ?? "";
    const normalizedCity =
      normalizeImportedCity(normalizedProvince, user.city ?? "") ?? user.city?.trim() ?? "";

    setCampaignPermissions(
      Object.fromEntries(
        Object.entries(permissions).map(([campaignId, value]) => [
          campaignId,
          normalizeContributorPermissions(value),
        ])
      )
    );
    form.reset({
      email: getLoginUsernameFromEmail(user.email ?? ""),
      name: user.name ?? "",
      role: user.role ?? (isSubUsersMode ? "sub_user" : "contributor"),
      password: "",
      province: normalizedProvince,
      city: normalizedCity,
      phone: user.phone ?? "",
      ministryId: user.ministryId ?? null,
      organizationId: user.organizationId ?? null,
      parentUserId: user.parentUserId ?? parentUserId ?? null,
      campaignIds: user.campaignIds ?? [],
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          {isSubUsersMode ? "کاربران زیرمجموعه" : "کاربران"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isFullMode
            ? "تعریف وزارتخانه، یوزر مادر، کاربر زیرمجموعه، دسترسی کمپین و بخش‌های پنل"
            : isSubUsersMode
              ? "ایجاد و مدیریت کاربران زیرمجموعه با استان، شهر و شماره موبایل"
              : "تعیین وزارتخانه کاربران"}
        </p>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">لیست کاربران</TabsTrigger>
          {isFullMode && <TabsTrigger value="import">ورود از Excel</TabsTrigger>}
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          {canManageUsers && (
            <div className="flex justify-end">
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {isSubUsersMode ? "کاربر زیرمجموعه جدید" : "کاربر جدید"}
              </Button>
            </div>
          )}

          <AdminDataTable
            data={rows}
            selectable={isFullMode}
            searchKeys={[
              "name",
              "email",
              "role",
              "province",
              "city",
              "accountManagerName",
              "ministryName",
              "organizationName",
            ]}
            columns={[
              { key: "name", label: "نام" },
              {
                key: "email",
                label: "نام کاربری",
                render: (item) => getLoginUsernameFromEmail(item.email),
              },
              { key: "province", label: "استان", render: (item) => item.province || "—" },
              { key: "city", label: "شهر", render: (item) => item.city || "—" },
              {
                key: "ministryName",
                label: "وزارتخانه",
                render: (item) => item.ministryName || "—",
              },
              {
                key: "organizationName",
                label: "زیرمجموعه",
                render: (item) => item.organizationName || "—",
              },
              {
                key: "accountManagerName",
                label: "مسئول اکانت",
                render: (item) => item.accountManagerName?.trim() || "—",
              },
              {
                key: "role",
                label: "نقش",
                render: (item) => getRoleLabel(item.role),
              },
              ...(isFullMode
                ? [
                    {
                      key: "campaignIds" as const,
                      label: "کمپین‌ها",
                      render: (item: AdminUser) =>
                        (item.campaignIds ?? [])
                          .map((id) => campaigns.find((campaign) => campaign.id === id)?.title ?? id)
                          .join("، ") || "—",
                    },
                  ]
                : []),
            ]}
            onEdit={openEdit}
            onDelete={
              canManageUsers
                ? (user) => {
                    startTransition(async () => {
                      const result = await deleteUserAction(user.id);
                      if (!result.success) {
                        toast.error("error" in result ? result.error : "حذف نشد");
                        return;
                      }
                      setRows((prev) => prev.filter((row) => row.id !== user.id));
                      toast.success("حذف شد");
                    });
                  }
                : undefined
            }
            onBulkDelete={
              isFullMode
                ? (users) => {
                    startTransition(async () => {
                      const ids = users.map((user) => user.id);
                      const result = await deleteUsersAction(ids);
                      if (!result.success) {
                        toast.error("error" in result ? result.error : "حذف نشد");
                        return;
                      }
                      const deletedIds = new Set(ids);
                      setRows((prev) => prev.filter((row) => !deletedIds.has(row.id)));
                      toast.success(`${ids.length} کاربر حذف شد`);
                    });
                  }
                : undefined
            }
          />
        </TabsContent>

        {isFullMode && (
          <TabsContent value="import" className="mt-4">
            <UsersImportPanel
              campaigns={campaigns}
              onImported={() => {
                window.location.reload();
              }}
            />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isMinistryOnlyMode
                ? "وزارتخانه کاربر"
                : editingId
                  ? isSubUsersMode
                    ? "ویرایش کاربر زیرمجموعه"
                    : "ویرایش کاربر"
                  : isSubUsersMode
                    ? "کاربر زیرمجموعه جدید"
                    : "کاربر جدید"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            {canManageUsers ? (
              <>
                <div className="space-y-2">
                  <Label>نام</Label>
                  <Input {...form.register("name")} />
                </div>
                <div className="space-y-2">
                  <Label>نام کاربری</Label>
                  <Input {...form.register("email")} dir="ltr" placeholder="BAZARBAYJAN" />
                  <p className="text-xs text-muted-foreground">فقط نام کاربری — بدون @example.com</p>
                </div>
                <ProvinceCityFields
                  province={selectedProvince ?? ""}
                  city={selectedCity ?? ""}
                  onProvinceChange={(value) => form.setValue("province", value)}
                  onCityChange={(value) => form.setValue("city", value)}
                />
                <div className="space-y-2">
                  <Label>شماره موبایل (برای پیامک)</Label>
                  <Input
                    {...form.register("phone")}
                    dir="ltr"
                    placeholder="0912xxxxxxx"
                    inputMode="tel"
                  />
                </div>
              </>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">نام: </span>
                  {form.getValues("name") || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">نام کاربری: </span>
                  <span dir="ltr">{form.getValues("email") || "—"}</span>
                </p>
              </div>
            )}

            {!isSubUsersMode && (
              <>
                <div className="space-y-2">
                  <Label>وزارتخانه</Label>
                  <Select
                    value={selectedMinistryId ?? NO_MINISTRY}
                    onValueChange={(value) => {
                      form.setValue("ministryId", value === NO_MINISTRY ? null : value);
                      form.setValue("organizationId", null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب وزارتخانه" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_MINISTRY}>بدون وزارتخانه</SelectItem>
                      {ministries.map((ministry) => (
                        <SelectItem key={ministry.id} value={ministry.id}>
                          {ministry.name}
                          {ministry.fullName ? ` — ${ministry.fullName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>زیرمجموعه (اختیاری)</Label>
                  <Select
                    value={selectedOrganizationId ?? NO_ORGANIZATION}
                    onValueChange={(value) =>
                      form.setValue(
                        "organizationId",
                        value === NO_ORGANIZATION ? null : value
                      )
                    }
                    disabled={!selectedMinistryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="خود وزارتخانه یا یک زیرمجموعه" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ORGANIZATION}>خود وزارتخانه</SelectItem>
                      {organizationOptions.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    اگر زیرمجموعه انتخاب نشود، کاربر به خود وزارتخانه وصل می‌شود.
                  </p>
                </div>
              </>
            )}

            {isSubUsersMode && organizationOptions.length > 0 && (
              <div className="space-y-2">
                <Label>زیرمجموعه (اختیاری)</Label>
                <Select
                  value={selectedOrganizationId ?? NO_ORGANIZATION}
                  onValueChange={(value) =>
                    form.setValue("organizationId", value === NO_ORGANIZATION ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="خود وزارتخانه یا یک زیرمجموعه" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ORGANIZATION}>خود وزارتخانه</SelectItem>
                    {organizationOptions.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {canManageUsers && (
              <>
                {editingId && isFullMode && (
                  <div className="space-y-2">
                    <Label>مسئول اکانت</Label>
                    <Input
                      value={rows.find((row) => row.id === editingId)?.accountManagerName ?? ""}
                      disabled
                      placeholder="توسط خود کاربر در پروفایل تنظیم می‌شود"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{editingId ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}</Label>
                  <Input type="password" {...form.register("password")} />
                </div>

                {isFullMode && (
                  <>
                    <div className="space-y-2">
                      <Label>نقش</Label>
                      <Select
                        value={selectedRole}
                        onValueChange={(value) => form.setValue("role", value as AdminRole)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contributor">کاربر (فقط داده خودش)</SelectItem>
                          <SelectItem value="ministry_parent">یوزر مادر وزارتخانه</SelectItem>
                          <SelectItem value="sub_user">کاربر زیرمجموعه</SelectItem>
                          <SelectItem value="client">کارفرما</SelectItem>
                          <SelectItem value="admin">مدیر</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedRole === "sub_user" && (
                      <div className="space-y-2">
                        <Label>یوزر مادر</Label>
                        <Select
                          value={selectedParentUserId ?? NO_PARENT}
                          onValueChange={(value) =>
                            form.setValue("parentUserId", value === NO_PARENT ? null : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="انتخاب یوزر مادر" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_PARENT}>انتخاب کنید</SelectItem>
                            {parentOptions.map((parent) => (
                              <SelectItem key={parent.id} value={parent.id}>
                                {parent.name}
                                {parent.ministryName ? ` — ${parent.ministryName}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <Label>دسترسی به کمپین‌ها</Label>
                  <div className="space-y-2 rounded-lg border p-3">
                    {campaigns.map((campaign) => (
                      <label key={campaign.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedCampaignIds.includes(campaign.id)}
                          onChange={() => toggleCampaign(campaign.id)}
                        />
                        {campaign.title}
                      </label>
                    ))}
                  </div>
                </div>

                {rolesWithCampaignAccess.includes(selectedRole) && selectedCampaignIds.length > 0 && (
                  <div className="space-y-3">
                    <Label>دسترسی به بخش‌های پنل (برای هر کمپین)</Label>
                    {selectedCampaignIds.map((campaignId) => {
                      const campaign = campaigns.find((item) => item.id === campaignId);
                      const permissions = normalizeContributorPermissions(
                        campaignPermissions[campaignId] ?? defaultContributorPermissions()
                      );
                      return (
                        <div key={campaignId} className="rounded-lg border p-3 space-y-2">
                          <p className="text-sm font-medium">{campaign?.title ?? campaignId}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {permissionKeys.map((key) => (
                              <label
                                key={key}
                                className="flex items-center justify-between gap-3 text-sm rounded-md border px-3 py-2"
                              >
                                <span>{contributorPermissionLabels[key]}</span>
                                <Switch
                                  checked={permissions[key]}
                                  onCheckedChange={(value) =>
                                    togglePermission(campaignId, key, value)
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <Button type="submit" disabled={isPending} className="w-full">
              ذخیره
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
