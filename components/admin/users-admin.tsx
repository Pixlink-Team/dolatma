"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, ChevronLeft, Filter, KeyRound, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ProvinceCityFields } from "@/components/admin/province-city-fields";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { UsersMinistryTree } from "@/components/admin/users-ministry-tree";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersImportPanel } from "@/components/admin/users-import-panel";
import { getLoginUsernameFromEmail, normalizeStoredUserEmail } from "@/lib/auth/user-login";
import { normalizeImportedCity, normalizeImportedProvince } from "@/lib/iran-locations";
import {
  bulkUpdateUsersAccessAction,
  deleteUserAction,
  deleteUsersAction,
  saveUserAction,
  saveUserMinistryAction,
} from "@/lib/actions/extended-actions";
import {
  contributorPermissionLabels,
  defaultContributorPermissions,
  normalizeContributorPermissions,
  panelManagementKeys,
  panelManagementPermissionLabels,
  subtreeManagementKeys,
  type ContributorPermissionKey,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import { getOrgRolePermissionPreset, subtreeManagementPermissionLabels } from "@/lib/org-role-presets";
import { ORG_ROLE_LABELS, ORG_ROLES, type OrgRole } from "@/lib/org-roles";
import { getUserRoleDisplayLabel, isOrgUserRole } from "@/lib/user-roles";
import {
  getAuthorityBadgeLabel,
  inferDefaultAuthorityLevel,
} from "@/lib/directive-authority";
import { Badge } from "@/components/ui/badge";
import type { AdminRole, AdminUser, CampaignSettings, Ministry } from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";

const NO_MINISTRY = "__none__";
const NO_ORGANIZATION = "__none__";
const NO_PARENT = "__none__";
const FILTER_ALL = "all";

const schema = z.object({
  email: z.string().min(1, "نام کاربری یا ایمیل الزامی است"),
  name: z.string().min(1),
  role: z.enum(["admin", "client", "org_user"]),
  orgRole: z.enum(["primary", "supervisor", "deputy", "pr"]).nullable().optional(),
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

const rolesWithCampaignAccess: AdminRole[] = ["org_user", "client"];

function isSubtreeParentUser(user: AdminUser): boolean {
  if (!isOrgUserRole(user.role)) return false;
  return (
    user.orgRole === "primary" ||
    user.orgRole === "deputy" ||
    Boolean(user.campaignIds.some((id) => user.campaignPermissions[id]?.manageSubtreeUsers))
  );
}

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
  const [filterMinistryId, setFilterMinistryId] = useState(FILTER_ALL);
  const [filterOrganizationId, setFilterOrganizationId] = useState(FILTER_ALL);
  const [filterProvince, setFilterProvince] = useState(FILTER_ALL);
  const [filterCity, setFilterCity] = useState(FILTER_ALL);
  const [campaignPermissions, setCampaignPermissions] = useState<Record<string, ContributorPermissions>>({});
  const [isPending, startTransition] = useTransition();
  const [bulkAccessOpen, setBulkAccessOpen] = useState(false);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState<AdminUser[]>([]);
  const [bulkClearSelection, setBulkClearSelection] = useState<(() => void) | null>(null);
  const [bulkCampaignIds, setBulkCampaignIds] = useState<string[]>([]);
  const [bulkPermissions, setBulkPermissions] = useState<ContributorPermissions>(
    defaultContributorPermissions()
  );
  /** Parents in this set are collapsed; everyone else with children stays expanded. */
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(() => new Set());

  const parentOptions = useMemo(
    () => rows.filter((user) => isSubtreeParentUser(user)),
    [rows]
  );

  const filterMinistryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of rows) {
      if (user.ministryId) {
        map.set(user.ministryId, user.ministryName?.trim() || "وزارتخانه");
      }
    }
    for (const ministry of ministries) {
      map.set(ministry.id, ministry.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }, [rows, ministries]);

  const filterOrganizationOptions = useMemo(() => {
    if (filterMinistryId === FILTER_ALL) return [] as { id: string; name: string }[];
    const map = new Map<string, string>();
    for (const user of rows) {
      if (user.ministryId === filterMinistryId && user.organizationId) {
        map.set(user.organizationId, user.organizationName?.trim() || "زیرمجموعه");
      }
    }
    const ministryOrgs =
      ministries.find((ministry) => ministry.id === filterMinistryId)?.organizations ?? [];
    for (const org of ministryOrgs) {
      map.set(org.id, org.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }, [rows, ministries, filterMinistryId]);

  const filterProvinceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const user of rows) {
      const province = user.province?.trim();
      if (province) set.add(province);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fa"));
  }, [rows]);

  const filterCityOptions = useMemo(() => {
    if (filterProvince === FILTER_ALL) return [] as string[];
    const set = new Set<string>();
    for (const user of rows) {
      if (user.province?.trim() !== filterProvince) continue;
      const city = user.city?.trim();
      if (city) set.add(city);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fa"));
  }, [rows, filterProvince]);

  const filteredRows = useMemo(() => {
    return rows.filter((user) => {
      if (filterMinistryId !== FILTER_ALL && user.ministryId !== filterMinistryId) return false;
      if (filterOrganizationId !== FILTER_ALL && user.organizationId !== filterOrganizationId) {
        return false;
      }
      if (filterProvince !== FILTER_ALL && user.province?.trim() !== filterProvince) return false;
      if (filterCity !== FILTER_ALL && user.city?.trim() !== filterCity) return false;
      return true;
    });
  }, [rows, filterMinistryId, filterOrganizationId, filterProvince, filterCity]);

  const usersFilterActive =
    filterMinistryId !== FILTER_ALL ||
    filterOrganizationId !== FILTER_ALL ||
    filterProvince !== FILTER_ALL ||
    filterCity !== FILTER_ALL;

  const filteredIds = useMemo(
    () => new Set(filteredRows.map((user) => user.id)),
    [filteredRows]
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, AdminUser[]>();
    for (const user of filteredRows) {
      if (!user.parentUserId || !filteredIds.has(user.parentUserId)) continue;
      const list = map.get(user.parentUserId) ?? [];
      list.push(user);
      map.set(user.parentUserId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    }
    return map;
  }, [filteredRows, filteredIds]);

  const { treeRows, depthById, childCountById } = useMemo(() => {
    const nestedChildIds = new Set<string>();
    for (const [, children] of childrenByParent) {
      for (const child of children) nestedChildIds.add(child.id);
    }

    const roleRank = (user: AdminUser) => {
      if (isSubtreeParentUser(user)) return 0;
      if (user.parentUserId) return 2;
      return 1;
    };

    const roots = filteredRows
      .filter((user) => !nestedChildIds.has(user.id))
      .sort((a, b) => {
        const byRole = roleRank(a) - roleRank(b);
        if (byRole !== 0) return byRole;
        return a.name.localeCompare(b.name, "fa");
      });

    const ordered: AdminUser[] = [];
    const depths = new Map<string, number>();
    const counts = new Map<string, number>();

    for (const root of roots) {
      const children = childrenByParent.get(root.id) ?? [];
      counts.set(root.id, children.length);
      depths.set(root.id, 0);
      ordered.push(root);
      if (children.length === 0 || collapsedParentIds.has(root.id)) continue;
      for (const child of children) {
        depths.set(child.id, 1);
        counts.set(child.id, 0);
        ordered.push(child);
      }
    }

    return { treeRows: ordered, depthById: depths, childCountById: counts };
  }, [filteredRows, childrenByParent, collapsedParentIds]);

  const toggleParentExpanded = (parentId: string) => {
    setCollapsedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const resetUsersFilters = () => {
    setFilterMinistryId(FILTER_ALL);
    setFilterOrganizationId(FILTER_ALL);
    setFilterProvince(FILTER_ALL);
    setFilterCity(FILTER_ALL);
  };

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      name: "",
      role: "org_user" as const,
      orgRole: "pr" as OrgRole,
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
  const selectedOrgRole = form.watch("orgRole");
  const selectedProvince = form.watch("province");
  const selectedCity = form.watch("city");
  const selectedMinistryId = form.watch("ministryId");
  const selectedOrganizationId = form.watch("organizationId");
  const selectedParentUserId = form.watch("parentUserId");

  const applyOrgRolePreset = (orgRole: OrgRole) => {
    const preset = getOrgRolePermissionPreset(orgRole);
    const campaignIds = form.getValues("campaignIds") ?? [];
    if (campaignIds.length === 0) {
      setCampaignPermissions({});
      return;
    }
    setCampaignPermissions(
      Object.fromEntries(campaignIds.map((campaignId) => [campaignId, { ...preset }]))
    );
  };

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
    const orgRole = form.getValues("orgRole");
    const preset =
      selectedRole === "org_user" && orgRole
        ? getOrgRolePermissionPreset(orgRole)
        : defaultContributorPermissions();
    setCampaignPermissions((prev) => ({
      ...prev,
      [campaignId]: prev[campaignId] ?? preset,
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

  const openBulkAccess = (users: AdminUser[], clearSelection: () => void) => {
    const editable = users.filter((user) => rolesWithCampaignAccess.includes(user.role));
    if (editable.length === 0) {
      toast.error("برای کاربران انتخاب‌شده امکان تنظیم دسترسی پنل وجود ندارد");
      return;
    }
    setBulkSelectedUsers(editable);
    setBulkClearSelection(() => clearSelection);
    setBulkCampaignIds([]);
    setBulkPermissions(defaultContributorPermissions());
    setBulkAccessOpen(true);
  };

  const toggleBulkCampaign = (campaignId: string) => {
    setBulkCampaignIds((prev) =>
      prev.includes(campaignId) ? prev.filter((id) => id !== campaignId) : [...prev, campaignId]
    );
  };

  const applyBulkAccess = () => {
    if (bulkSelectedUsers.length === 0) {
      toast.error("هیچ کاربری انتخاب نشده است");
      return;
    }

    startTransition(async () => {
      const result = await bulkUpdateUsersAccessAction({
        userIds: bulkSelectedUsers.map((user) => user.id),
        campaignIds: bulkCampaignIds,
        permissions: bulkPermissions,
      });
      if (!result.success) {
        toast.error(result.error ?? "بروزرسانی دسترسی ناموفق بود");
        return;
      }

      const sharedPermissions = Object.fromEntries(
        bulkCampaignIds.map((campaignId) => [campaignId, bulkPermissions])
      ) as Record<string, ContributorPermissions>;
      const updatedIds = new Set(bulkSelectedUsers.map((user) => user.id));

      setRows((prev) =>
        prev.map((row) =>
          updatedIds.has(row.id)
            ? {
                ...row,
                campaignIds: [...bulkCampaignIds],
                campaignPermissions: { ...sharedPermissions },
              }
            : row
        )
      );

      const updated =
        "updated" in result && typeof result.updated === "number" ? result.updated : bulkSelectedUsers.length;
      const skipped =
        "skipped" in result && typeof result.skipped === "number" ? result.skipped : 0;
      toast.success(
        skipped > 0
          ? `دسترسی ${formatPersianNumber(updated)} کاربر به‌روزرسانی شد (${formatPersianNumber(skipped)} رد شد)`
          : `دسترسی ${formatPersianNumber(updated)} کاربر به‌روزرسانی شد`
      );
      setBulkAccessOpen(false);
      bulkClearSelection?.();
      setBulkClearSelection(null);
      setBulkSelectedUsers([]);
    });
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

    const role: AdminRole = isSubUsersMode ? "org_user" : data.role;
    const orgRole: OrgRole | null =
      role === "org_user" ? (data.orgRole ?? "pr") : null;
    const ministryId =
      (isSubUsersMode ? parentMinistryId : null) || data.ministryId || null;
    const organizationId = data.organizationId ?? null;
    const nextParentUserId = isSubUsersMode
      ? parentUserId ?? null
      : role === "org_user"
        ? data.parentUserId ?? null
        : null;

    if (isFullMode && role === "org_user" && !ministryId) {
      toast.error("برای کاربر دستگاه انتخاب وزارتخانه الزامی است");
      return;
    }

    const authorityLevel = inferDefaultAuthorityLevel({
      role,
      organizationId,
      ministryId,
    });

    startTransition(async () => {
      const result = await saveUserAction({
        ...data,
        role,
        orgRole,
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
        orgRole,
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
        authorityLevel,
        authorityOther: null,
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
    const defaultOrgRole: OrgRole = "pr";
    setCampaignPermissions({});
    form.reset({
      email: "",
      name: "",
      role: "org_user",
      orgRole: defaultOrgRole,
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
    const role: AdminRole =
      user.role === "admin" || user.role === "client" || user.role === "org_user"
        ? user.role
        : "org_user";
    form.reset({
      email: getLoginUsernameFromEmail(user.email ?? ""),
      name: user.name ?? "",
      role,
      orgRole: user.orgRole ?? (role === "org_user" ? "pr" : null),
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
            ? "سمت‌های سازمانی (مدیر، ناظر، معاون، روابط عمومی) و دسترسی‌های زیرشاخه"
            : isSubUsersMode
              ? "ایجاد و مدیریت کاربران زیرمجموعه با سمت سازمانی"
              : "تعیین وزارتخانه کاربران و مشاهده توزیع درختی"}
        </p>
      </div>

      <Tabs defaultValue={isSubUsersMode ? "list" : "tree"}>
        <TabsList>
          {!isSubUsersMode && <TabsTrigger value="tree">نمای درختی</TabsTrigger>}
          <TabsTrigger value="list">{isSubUsersMode ? "لیست کاربران" : "لیست جدول"}</TabsTrigger>
          {isFullMode && <TabsTrigger value="import">ورود از Excel</TabsTrigger>}
        </TabsList>

        {!isSubUsersMode && (
          <TabsContent value="tree" className="mt-4 space-y-4">
            {canManageUsers && (
              <div className="flex justify-end">
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  کاربر جدید
                </Button>
              </div>
            )}

            {isFullMode && (
              <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4 shrink-0 text-primary" />
                    فیلتر کاربران
                  </div>
                  {usersFilterActive && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetUsersFilters}
                      className="gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      ریست فیلتر
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SearchableSelect
                    value={filterMinistryId}
                    onValueChange={(value) => {
                      setFilterMinistryId(value);
                      setFilterOrganizationId(FILTER_ALL);
                    }}
                    options={[
                      { value: FILTER_ALL, label: "همه وزارتخانه‌ها" },
                      ...filterMinistryOptions.map((ministry) => ({
                        value: ministry.id,
                        label: ministry.name,
                      })),
                    ]}
                    placeholder="وزارتخانه"
                    searchPlaceholder="جستجوی وزارتخانه..."
                  />
                  <SearchableSelect
                    value={filterOrganizationId}
                    onValueChange={setFilterOrganizationId}
                    options={[
                      { value: FILTER_ALL, label: "همه زیرمجموعه‌ها" },
                      ...filterOrganizationOptions.map((org) => ({
                        value: org.id,
                        label: org.name,
                      })),
                    ]}
                    placeholder={
                      filterMinistryId === FILTER_ALL
                        ? "ابتدا وزارتخانه را انتخاب کنید"
                        : "زیرمجموعه"
                    }
                    searchPlaceholder="جستجوی زیرمجموعه..."
                    disabled={filterMinistryId === FILTER_ALL}
                  />
                  <SearchableSelect
                    value={filterProvince}
                    onValueChange={(value) => {
                      setFilterProvince(value);
                      setFilterCity(FILTER_ALL);
                    }}
                    options={[
                      { value: FILTER_ALL, label: "همه استان‌ها" },
                      ...filterProvinceOptions.map((province) => ({
                        value: province,
                        label: province,
                      })),
                    ]}
                    placeholder="استان"
                    searchPlaceholder="جستجوی استان..."
                  />
                  <SearchableSelect
                    value={filterCity}
                    onValueChange={setFilterCity}
                    options={[
                      { value: FILTER_ALL, label: "همه شهرها" },
                      ...filterCityOptions.map((city) => ({ value: city, label: city })),
                    ]}
                    placeholder={
                      filterProvince === FILTER_ALL ? "ابتدا استان را انتخاب کنید" : "شهر"
                    }
                    searchPlaceholder="جستجوی شهر..."
                    disabled={filterProvince === FILTER_ALL}
                  />
                </div>
              </div>
            )}

            <UsersMinistryTree
              users={filteredRows}
              ministries={ministries}
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
            />
          </TabsContent>
        )}

        <TabsContent value="list" className="space-y-4 mt-4">
          {canManageUsers && (
            <div className="flex justify-end">
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {isSubUsersMode ? "کاربر زیرمجموعه جدید" : "کاربر جدید"}
              </Button>
            </div>
          )}

          {isFullMode && (
            <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="h-4 w-4 text-primary shrink-0" />
                  فیلتر کاربران
                </div>
                {usersFilterActive && (
                  <Button type="button" variant="outline" size="sm" onClick={resetUsersFilters} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    ریست فیلتر
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SearchableSelect
                  value={filterMinistryId}
                  onValueChange={(value) => {
                    setFilterMinistryId(value);
                    setFilterOrganizationId(FILTER_ALL);
                  }}
                  options={[
                    { value: FILTER_ALL, label: "همه وزارتخانه‌ها" },
                    ...filterMinistryOptions.map((ministry) => ({
                      value: ministry.id,
                      label: ministry.name,
                    })),
                  ]}
                  placeholder="وزارتخانه"
                  searchPlaceholder="جستجوی وزارتخانه..."
                />
                <SearchableSelect
                  value={filterOrganizationId}
                  onValueChange={setFilterOrganizationId}
                  options={[
                    { value: FILTER_ALL, label: "همه زیرمجموعه‌ها" },
                    ...filterOrganizationOptions.map((org) => ({
                      value: org.id,
                      label: org.name,
                    })),
                  ]}
                  placeholder={
                    filterMinistryId === FILTER_ALL
                      ? "ابتدا وزارتخانه را انتخاب کنید"
                      : "زیرمجموعه"
                  }
                  searchPlaceholder="جستجوی زیرمجموعه..."
                  disabled={filterMinistryId === FILTER_ALL}
                />
                <SearchableSelect
                  value={filterProvince}
                  onValueChange={(value) => {
                    setFilterProvince(value);
                    setFilterCity(FILTER_ALL);
                  }}
                  options={[
                    { value: FILTER_ALL, label: "همه استان‌ها" },
                    ...filterProvinceOptions.map((province) => ({
                      value: province,
                      label: province,
                    })),
                  ]}
                  placeholder="استان"
                  searchPlaceholder="جستجوی استان..."
                />
                <SearchableSelect
                  value={filterCity}
                  onValueChange={setFilterCity}
                  options={[
                    { value: FILTER_ALL, label: "همه شهرها" },
                    ...filterCityOptions.map((city) => ({ value: city, label: city })),
                  ]}
                  placeholder={
                    filterProvince === FILTER_ALL ? "ابتدا استان را انتخاب کنید" : "شهر"
                  }
                  searchPlaceholder="جستجوی شهر..."
                  disabled={filterProvince === FILTER_ALL}
                />
              </div>
            </div>
          )}

          <AdminDataTable
            data={treeRows}
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
              "parentUserName",
            ]}
            columns={[
              {
                key: "name",
                label: "نام",
                truncate: false,
                render: (item) => {
                  const depth = depthById.get(item.id) ?? 0;
                  const childCount = childCountById.get(item.id) ?? 0;
                  const expanded = !collapsedParentIds.has(item.id);
                  const orphanSubUser =
                    depth === 0 && Boolean(item.parentUserId) && Boolean(item.parentUserName);
                  const nestedSubUser = depth > 0 && Boolean(item.parentUserName);

                  return (
                    <div
                      className="flex items-start gap-1"
                      style={{ paddingRight: depth * 20 }}
                    >
                      {childCount > 0 ? (
                        <button
                          type="button"
                          className="mt-0.5 shrink-0 rounded p-0.5 hover:bg-muted"
                          onClick={() => toggleParentExpanded(item.id)}
                          aria-label={expanded ? "بستن زیرمجموعه‌ها" : "باز کردن زیرمجموعه‌ها"}
                        >
                          {expanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <span className="mt-0.5 inline-block h-4 w-4 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={
                              childCount > 0 ? "font-semibold leading-5" : "leading-5"
                            }
                          >
                            {item.name}
                          </span>
                          {childCount > 0 ? (
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              {formatPersianNumber(childCount)} زیرمجموعه
                            </Badge>
                          ) : null}
                        </div>
                        {orphanSubUser || nestedSubUser ? (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            زیردستِ {item.parentUserName}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "email",
                label: "نام کاربری",
                render: (item) => getLoginUsernameFromEmail(item.email),
              },
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
              { key: "province", label: "استان", render: (item) => item.province || "—" },
              { key: "city", label: "شهر", render: (item) => item.city || "—" },
              {
                key: "accountManagerName",
                label: "مسئول اکانت",
                render: (item) => item.accountManagerName?.trim() || "—",
              },
              {
                key: "role",
                label: "نقش / سمت",
                render: (item) => getUserRoleDisplayLabel(item),
              },
              {
                key: "authorityLevel",
                label: "بالادستی",
                render: (item) => (
                  <Badge variant="outline">
                    {getAuthorityBadgeLabel(item.authorityLevel, item.authorityOther)}
                  </Badge>
                ),
              },
              ...(isFullMode
                ? [
                    {
                      key: "campaignIds" as const,
                      label: "راستاها",
                      render: (item: AdminUser) =>
                        (item.campaignIds ?? [])
                          .map((id) => campaigns.find((campaign) => campaign.id === id)?.title ?? id)
                          .join("، ") || "—",
                    },
                  ]
                : []),
            ]}
            onEdit={openEdit}
            renderBulkActions={
              isFullMode
                ? ({ selectedItems, clearSelection }) => (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openBulkAccess(selectedItems, clearSelection)}
                    >
                      <KeyRound className="h-4 w-4" />
                      ویرایش دسترسی
                    </Button>
                  )
                : undefined
            }
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
                </div>
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
              <ProvinceCityFields
                province={selectedProvince ?? ""}
                city={selectedCity ?? ""}
                onProvinceChange={(value) => form.setValue("province", value)}
                onCityChange={(value) => form.setValue("city", value)}
              />
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
                      <Label>نقش سیستمی</Label>
                      <Select
                        value={selectedRole}
                        onValueChange={(value) => {
                          const nextRole = value as "admin" | "client" | "org_user";
                          form.setValue("role", nextRole);
                          if (nextRole === "org_user") {
                            const orgRole = (form.getValues("orgRole") ?? "pr") as OrgRole;
                            form.setValue("orgRole", orgRole);
                            applyOrgRolePreset(orgRole);
                          } else {
                            form.setValue("orgRole", null);
                            form.setValue("parentUserId", null);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="org_user">کاربر دستگاه</SelectItem>
                          <SelectItem value="client">کارفرما</SelectItem>
                          <SelectItem value="admin">مدیر سیستم</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(selectedRole === "org_user" || isSubUsersMode) && (
                      <div className="space-y-2">
                        <Label>سمت سازمانی</Label>
                        <Select
                          value={selectedOrgRole ?? "pr"}
                          onValueChange={(value) => {
                            const orgRole = value as OrgRole;
                            form.setValue("orgRole", orgRole);
                            applyOrgRolePreset(orgRole);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORG_ROLES.map((key) => (
                              <SelectItem key={key} value={key}>
                                {ORG_ROLE_LABELS[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            const orgRole = (form.getValues("orgRole") ?? "pr") as OrgRole;
                            applyOrgRolePreset(orgRole);
                            toast.success("پیش‌فرض سمت اعمال شد");
                          }}
                        >
                          بازنشانی به پیش‌فرض نقش
                        </Button>
                      </div>
                    )}

                    {selectedRole === "org_user" && (
                      <div className="space-y-2">
                        <Label>کاربر والد (اختیاری)</Label>
                        <Select
                          value={selectedParentUserId ?? NO_PARENT}
                          onValueChange={(value) =>
                            form.setValue("parentUserId", value === NO_PARENT ? null : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="بدون والد / ریشه دستگاه" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_PARENT}>بدون والد</SelectItem>
                            {parentOptions.map((parent) => (
                              <SelectItem key={parent.id} value={parent.id}>
                                {parent.name}
                                {parent.orgRole
                                  ? ` — ${ORG_ROLE_LABELS[parent.orgRole]}`
                                  : ""}
                                {parent.ministryName ? ` — ${parent.ministryName}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                {isSubUsersMode && (
                  <div className="space-y-2">
                    <Label>سمت سازمانی</Label>
                    <Select
                      value={selectedOrgRole ?? "pr"}
                      onValueChange={(value) => {
                        const orgRole = value as OrgRole;
                        form.setValue("role", "org_user");
                        form.setValue("orgRole", orgRole);
                        applyOrgRolePreset(orgRole);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORG_ROLES.map((key) => (
                          <SelectItem key={key} value={key}>
                            {ORG_ROLE_LABELS[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const orgRole = (form.getValues("orgRole") ?? "pr") as OrgRole;
                        applyOrgRolePreset(orgRole);
                        toast.success("پیش‌فرض سمت اعمال شد");
                      }}
                    >
                      بازنشانی به پیش‌فرض نقش
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>دسترسی به راستاها</Label>
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
                    <Label>دسترسی به بخش‌های پنل (برای هر راستا)</Label>
                    {selectedCampaignIds.map((campaignId) => {
                      const campaign = campaigns.find((item) => item.id === campaignId);
                      const permissions = normalizeContributorPermissions(
                        campaignPermissions[campaignId] ?? defaultContributorPermissions()
                      );
                      return (
                        <div key={campaignId} className="rounded-lg border p-3 space-y-3">
                          <p className="text-sm font-medium">{campaign?.title ?? campaignId}</p>
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">بخش‌های محتوا</p>
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
                          {selectedRole === "org_user" && (
                            <>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                بخش‌های تنظیمات و مدیریت
                              </p>
                              <p className="text-xs text-muted-foreground">
                                به‌طور پیش‌فرض خاموش است؛ فقط در صورت نیاز فعال کنید.
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {panelManagementKeys.map((key) => (
                                  <label
                                    key={key}
                                    className="flex items-center justify-between gap-3 text-sm rounded-md border px-3 py-2"
                                  >
                                    <span>{panelManagementPermissionLabels[key]}</span>
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
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                قابلیت‌های مدیریتی زیرشاخه
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {subtreeManagementKeys.map((key) => (
                                  <label
                                    key={key}
                                    className="flex items-center justify-between gap-3 text-sm rounded-md border px-3 py-2"
                                  >
                                    <span>{subtreeManagementPermissionLabels[key]}</span>
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
                            </>
                          )}
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

      <Dialog
        open={bulkAccessOpen}
        onOpenChange={(next) => {
          setBulkAccessOpen(next);
          if (!next) {
            setBulkSelectedUsers([]);
            setBulkClearSelection(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ویرایش گروهی دسترسی</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              دسترسی {formatPersianNumber(bulkSelectedUsers.length)} کاربر انتخاب‌شده با تنظیمات زیر
              جایگزین می‌شود. نقش مدیر سیستم از این لیست حذف شده است.
            </p>

            <div className="space-y-2">
              <Label>دسترسی به راستاها</Label>
              <div className="space-y-2 rounded-lg border p-3 max-h-48 overflow-y-auto">
                {campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">راستایی تعریف نشده است.</p>
                ) : (
                  campaigns.map((campaign) => (
                    <label key={campaign.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={bulkCampaignIds.includes(campaign.id)}
                        onChange={() => toggleBulkCampaign(campaign.id)}
                      />
                      {campaign.title}
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                اگر هیچ راستایی انتخاب نشود، دسترسی همه کاربران انتخاب‌شده به راستاها پاک می‌شود.
              </p>
            </div>

            <div className="space-y-2">
              <Label>دسترسی به بخش‌های پنل</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {permissionKeys.map((key) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-3 text-sm rounded-md border px-3 py-2"
                  >
                    <span>{contributorPermissionLabels[key]}</span>
                    <Switch
                      checked={bulkPermissions[key]}
                      onCheckedChange={(value) =>
                        setBulkPermissions((prev) => ({ ...prev, [key]: value }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>بخش‌های تنظیمات و مدیریت</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {panelManagementKeys.map((key) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-3 text-sm rounded-md border px-3 py-2"
                  >
                    <span>{panelManagementPermissionLabels[key]}</span>
                    <Switch
                      checked={bulkPermissions[key]}
                      onCheckedChange={(value) =>
                        setBulkPermissions((prev) => ({ ...prev, [key]: value }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>قابلیت‌های مدیریتی زیرشاخه</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subtreeManagementKeys.map((key) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-3 text-sm rounded-md border px-3 py-2"
                  >
                    <span>{subtreeManagementPermissionLabels[key]}</span>
                    <Switch
                      checked={bulkPermissions[key]}
                      onCheckedChange={(value) =>
                        setBulkPermissions((prev) => ({ ...prev, [key]: value }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={isPending || bulkSelectedUsers.length === 0}
              onClick={applyBulkAccess}
            >
              اعمال روی {formatPersianNumber(bulkSelectedUsers.length)} کاربر
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
