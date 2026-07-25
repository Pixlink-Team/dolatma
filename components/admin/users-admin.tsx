"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, Filter, KeyRound, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ProvinceCityFields } from "@/components/admin/province-city-fields";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { ContributorPermissionsEditor } from "@/components/admin/contributor-permissions-editor";
import { UsersMinistryTree } from "@/components/admin/users-ministry-tree";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersImportPanel } from "@/components/admin/users-import-panel";
import { getLoginUsernameFromEmail, resolveStoredUserEmail } from "@/lib/auth/user-login";
import { normalizeImportedCity, normalizeImportedProvince } from "@/lib/iran-locations";
import {
  bulkUpdateUsersAccessAction,
  deleteUserAction,
  deleteUsersAction,
  saveUserAction,
  saveUserMinistryAction,
} from "@/lib/actions/extended-actions";
import { getDeviceCeilingAction } from "@/lib/actions/device-access-actions";
import { saveDeviceAction } from "@/lib/actions/device-actions";
import { saveOrganizationAction } from "@/lib/actions/ministry-actions";
import { useSectionCreateGate } from "@/lib/hooks/use-section-create-gate";
import {
  allContributorPermissionKeys,
  defaultContributorPermissions,
  deniedContributorPermissions,
  intersectContributorPermissions,
  normalizeContributorPermissions,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import { getOrgRolePermissionPreset } from "@/lib/org-role-presets";
import { ORG_ROLE_LABELS, ORG_ROLES, type OrgRole } from "@/lib/org-roles";
import { getUserRoleDisplayLabel, isOrgUserRole } from "@/lib/user-roles";
import {
  getAuthorityBadgeLabel,
  inferDefaultAuthorityLevel,
} from "@/lib/directive-authority";
import { Badge } from "@/components/ui/badge";
import type { AdminRole, AdminUser, CampaignSettings, Ministry, MinistryOrganization } from "@/lib/types";
import { cn, formatPersianNumber } from "@/lib/utils";

const NO_MINISTRY = "__none__";
const NO_ORGANIZATION = "__none__";
const CREATE_ORGANIZATION = "__create_org__";
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

const rolesWithCampaignAccess: AdminRole[] = ["org_user", "client"];

function isSubtreeParentUser(user: AdminUser): boolean {
  return isOrgUserRole(user.role);
}

function compareUsersByName(a: AdminUser, b: AdminUser): number {
  return (a.name ?? "").localeCompare(b.name ?? "", "fa");
}

/** Flatten org tree for selects, preserving device-tree order with visual depth. */
function flattenOrganizationsForSelect(
  orgs: MinistryOrganization[],
  ministryId: string
): { id: string; name: string; depth: number; label: string }[] {
  const byParent = new Map<string, MinistryOrganization[]>();
  const ids = new Set(orgs.map((org) => org.id));

  for (const org of orgs) {
    if (!org.id) continue;
    const rawParent = org.parentId?.trim() || ministryId;
    // Treat self-parent / unknown parent as ministry root so traversal cannot loop.
    const parentKey =
      rawParent !== ministryId && rawParent !== org.id && ids.has(rawParent)
        ? rawParent
        : ministryId;
    const list = byParent.get(parentKey) ?? [];
    list.push(org);
    byParent.set(parentKey, list);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }

  const result: { id: string; name: string; depth: number; label: string }[] = [];
  const visited = new Set<string>();
  const visit = (parentKey: string, depth: number) => {
    for (const org of byParent.get(parentKey) ?? []) {
      if (visited.has(org.id)) continue;
      visited.add(org.id);
      const indent = depth > 0 ? `${"— ".repeat(depth)}` : "";
      result.push({
        id: org.id,
        name: org.name,
        depth,
        label: `${indent}${org.name}`,
      });
      visit(org.id, depth + 1);
    }
  };
  visit(ministryId, 0);
  return result;
}

interface UsersAdminProps {
  initialUsers: AdminUser[];
  campaigns: CampaignSettings[];
  ministries?: Ministry[];
  /** full = admin; ministry = client can only set ministry; sub_users = ministry parent manages children; view_subtree = read-only structure */
  mode?: "full" | "ministry" | "sub_users" | "view_subtree";
  parentUserId?: string;
  parentMinistryId?: string | null;
  /** When set, subunit managers are locked to their own org subtree (not peer ministry orgs). */
  parentOrganizationId?: string | null;
  /**
   * Max permissions a subtree manager may grant (their own campaign access).
   * Admin/full mode leaves this unset (no cap).
   */
  grantorCampaignPermissions?: Record<string, ContributorPermissions> | null;
}

export function UsersAdmin({
  initialUsers,
  campaigns,
  ministries = [],
  mode = "full",
  parentUserId,
  parentMinistryId = null,
  parentOrganizationId = null,
  grantorCampaignPermissions = null,
}: UsersAdminProps) {
  const { requestCreate, tutorialModal } = useSectionCreateGate("subsidiaries");
  const isFullMode = mode === "full";
  const isSubUsersMode = mode === "sub_users";
  const isViewSubtreeMode = mode === "view_subtree";
  const isMinistryOnlyMode = mode === "ministry";
  const canManageUsers = isFullMode || isSubUsersMode;
  const isScopedToOwnOrganization = isSubUsersMode && Boolean(parentOrganizationId);
  /** Ministry manager (no org): assign to ministry itself via checkbox, not a Select option. */
  const isScopedToOwnMinistry =
    isSubUsersMode && Boolean(parentMinistryId) && !parentOrganizationId;
  const canAssignToOwnUnit = isScopedToOwnOrganization || isScopedToOwnMinistry;
  const permissionCapActive = isSubUsersMode && Boolean(grantorCampaignPermissions);
  const [open, setOpen] = useState(false);
  /** Optional fields (phone, access, etc.) stay collapsed so create stays simple. */
  const [optionalFieldsOpen, setOptionalFieldsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rows, setRows] = useState(initialUsers);
  const [ministriesList, setMinistriesList] = useState(ministries);
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [newOrganizationName, setNewOrganizationName] = useState("");
  /** When true, user is bound to the manager's own ministry/org (not a child). */
  const [assignToOwnUnit, setAssignToOwnUnit] = useState(false);
  /** Device-tree parent for the inline "create organization" flow. */
  const [createUnderParentId, setCreateUnderParentId] = useState<string | null>(null);
  const [filterMinistryId, setFilterMinistryId] = useState(FILTER_ALL);
  const [filterOrganizationId, setFilterOrganizationId] = useState(FILTER_ALL);
  const [filterProvince, setFilterProvince] = useState(FILTER_ALL);
  const [filterCity, setFilterCity] = useState(FILTER_ALL);
  const [campaignPermissions, setCampaignPermissions] = useState<Record<string, ContributorPermissions>>({});
  /** Effective device-tree ceiling for the selected ministry/org (null = no ceiling). */
  const [deviceCeilingByCampaign, setDeviceCeilingByCampaign] = useState<
    Record<string, ContributorPermissions>
  >({});
  const [isPending, startTransition] = useTransition();
  const [bulkAccessOpen, setBulkAccessOpen] = useState(false);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState<AdminUser[]>([]);
  const [bulkClearSelection, setBulkClearSelection] = useState<(() => void) | null>(null);
  const [bulkPermissions, setBulkPermissions] = useState<ContributorPermissions>(
    defaultContributorPermissions()
  );
  const soleCampaignIds = useMemo(
    () => campaigns.map((campaign) => campaign.id).filter(Boolean),
    [campaigns]
  );
  const primaryCampaignId = soleCampaignIds[0] ?? null;

  const filterMinistryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of rows) {
      if (user.ministryId) {
        map.set(user.ministryId, user.ministryName?.trim() || "وزارتخانه");
      }
    }
    for (const ministry of ministriesList) {
      map.set(ministry.id, ministry.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }, [rows, ministriesList]);

  const filterOrganizationOptions = useMemo(() => {
    if (filterMinistryId === FILTER_ALL) return [] as { id: string; name: string; label: string }[];
    const ministryOrgs =
      ministriesList.find((ministry) => ministry.id === filterMinistryId)?.organizations ?? [];
    const flattened = flattenOrganizationsForSelect(ministryOrgs, filterMinistryId);
    const seen = new Set(flattened.map((org) => org.id));

    // Include user-only org ids that are missing from the device catalog.
    for (const user of rows) {
      if (user.ministryId !== filterMinistryId || !user.organizationId || seen.has(user.organizationId)) {
        continue;
      }
      seen.add(user.organizationId);
      const name = user.organizationName?.trim() || "زیرمجموعه";
      flattened.push({ id: user.organizationId, name, depth: 0, label: name });
    }

    return flattened;
  }, [rows, ministriesList, filterMinistryId]);

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

  /** Flat list: users belong to ministry/org, never nested under a manager. */
  const listRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const ministryCmp = (a.ministryName ?? "").localeCompare(b.ministryName ?? "", "fa");
      if (ministryCmp !== 0) return ministryCmp;
      const orgCmp = (a.organizationName ?? "").localeCompare(b.organizationName ?? "", "fa");
      if (orgCmp !== 0) return orgCmp;
      return compareUsersByName(a, b);
    });
  }, [filteredRows]);

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

  const selectedRole = form.watch("role");
  const selectedOrgRole = form.watch("orgRole");
  const selectedProvince = form.watch("province");
  const selectedCity = form.watch("city");
  const selectedMinistryId = form.watch("ministryId");
  const selectedOrganizationId = form.watch("organizationId");
  const selectedParentUserId = form.watch("parentUserId");

  const parentOptions = useMemo(() => {
    const options = rows.filter((user) => isSubtreeParentUser(user));
    if (
      selectedParentUserId &&
      !options.some((user) => user.id === selectedParentUserId)
    ) {
      const currentParent = rows.find((user) => user.id === selectedParentUserId);
      if (currentParent) options.push(currentParent);
    }
    return options;
  }, [rows, selectedParentUserId]);

  const getGrantorPermissions = (campaignId: string): ContributorPermissions | null => {
    if (!permissionCapActive || !grantorCampaignPermissions) return null;
    const raw = grantorCampaignPermissions[campaignId];
    if (!raw) return deniedContributorPermissions();
    return normalizeContributorPermissions(raw);
  };

  const getDeviceCeiling = (campaignId: string): ContributorPermissions | null => {
    const raw = deviceCeilingByCampaign[campaignId];
    return raw ? normalizeContributorPermissions(raw) : null;
  };

  /** Combined cap: grantor (subtree manager) ∩ device ceiling. */
  const getPermissionCap = (campaignId: string): ContributorPermissions | null => {
    const grantor = getGrantorPermissions(campaignId);
    const deviceCeiling = getDeviceCeiling(campaignId);
    if (grantor && deviceCeiling) {
      return intersectContributorPermissions(grantor, deviceCeiling);
    }
    return grantor ?? deviceCeiling;
  };

  const clampToGrantor = (
    campaignId: string,
    permissions: ContributorPermissions
  ): ContributorPermissions => {
    const cap = getPermissionCap(campaignId);
    if (!cap) return permissions;
    return intersectContributorPermissions(permissions, cap);
  };

  const homeDeviceIdForForm =
    selectedOrganizationId?.trim() ||
    selectedMinistryId?.trim() ||
    (isSubUsersMode ? parentOrganizationId || parentMinistryId : null) ||
    null;

  useEffect(() => {
    if (!open || !homeDeviceIdForForm || soleCampaignIds.length === 0) {
      setDeviceCeilingByCampaign({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next: Record<string, ContributorPermissions> = {};
      for (const campaignId of soleCampaignIds) {
        const result = await getDeviceCeilingAction(homeDeviceIdForForm, campaignId);
        if (result.success && result.ceiling) {
          next[campaignId] = result.ceiling;
        }
      }
      if (!cancelled) {
        setDeviceCeilingByCampaign(next);
        // Re-clamp current toggles when the home device ceiling changes.
        setCampaignPermissions((prev) => {
          const clamped: Record<string, ContributorPermissions> = {};
          for (const [campaignId, perms] of Object.entries(prev)) {
            const ceiling = next[campaignId];
            clamped[campaignId] = ceiling
              ? intersectContributorPermissions(perms, ceiling)
              : perms;
          }
          return clamped;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, homeDeviceIdForForm, soleCampaignIds]);

  const bindSoleCampaignAccess = (preset: ContributorPermissions) => {
    if (soleCampaignIds.length === 0) {
      form.setValue("campaignIds", []);
      setCampaignPermissions({});
      return;
    }
    form.setValue("campaignIds", soleCampaignIds);
    setCampaignPermissions(
      Object.fromEntries(
        soleCampaignIds.map((campaignId) => [
          campaignId,
          clampToGrantor(campaignId, { ...preset }),
        ])
      )
    );
  };

  const applyOrgRolePreset = (orgRole: OrgRole) => {
    bindSoleCampaignAccess(getOrgRolePermissionPreset(orgRole));
  };

  /** Enable every section the current actor is allowed to grant (one click). */
  const enableAllGrantablePermissions = (campaignId: string) => {
    const cap = getPermissionCap(campaignId);
    if (cap) {
      setCampaignPermissions((prev) => ({
        ...prev,
        [campaignId]: { ...cap },
      }));
      return;
    }
    const allOn = deniedContributorPermissions();
    for (const key of allContributorPermissionKeys) {
      allOn[key] = true;
    }
    setCampaignPermissions((prev) => ({
      ...prev,
      [campaignId]: allOn,
    }));
  };

  const disableAllPermissions = (campaignId: string) => {
    setCampaignPermissions((prev) => ({
      ...prev,
      [campaignId]: deniedContributorPermissions(),
    }));
  };

  const organizationOptions = useMemo(() => {
    const ministryId = selectedMinistryId || (isSubUsersMode ? parentMinistryId : null);
    if (!ministryId) return [] as NonNullable<Ministry["organizations"]>;
    // Page already scopes ministries for subunit managers; keep a defensive home-org fallback.
    const options = [
      ...(ministriesList.find((ministry) => ministry.id === ministryId)?.organizations ?? []),
    ];
    if (isScopedToOwnOrganization && parentOrganizationId) {
      if (!options.some((org) => org.id === parentOrganizationId)) {
        options.unshift({
          id: parentOrganizationId,
          ministryId,
          name: "زیرمجموعه شما",
          fullName: null,
          isActive: true,
          createdAt: new Date(0).toISOString(),
          parentId: ministryId,
        });
      }
    }
    if (
      selectedOrganizationId &&
      !options.some((org) => org.id === selectedOrganizationId)
    ) {
      const editingUser = editingId ? rows.find((row) => row.id === editingId) : null;
      if (editingUser?.organizationId === selectedOrganizationId) {
        options.push({
          id: selectedOrganizationId,
          ministryId,
          name: editingUser.organizationName?.trim() || "زیرمجموعه (نامعتبر)",
          fullName: null,
          isActive: true,
          createdAt: editingUser.createdAt,
          parentId: ministryId,
        });
      }
    }
    return options;
  }, [
    ministriesList,
    selectedMinistryId,
    isSubUsersMode,
    isScopedToOwnOrganization,
    parentMinistryId,
    parentOrganizationId,
    selectedOrganizationId,
    editingId,
    rows,
  ]);

  const ownOrganizationName = useMemo(() => {
    if (!parentOrganizationId) return null;
    return (
      organizationOptions.find((org) => org.id === parentOrganizationId)?.name?.trim() ||
      "سازمان شما"
    );
  }, [organizationOptions, parentOrganizationId]);

  const ownMinistryName = useMemo(() => {
    if (!parentMinistryId) return null;
    return (
      ministriesList.find((ministry) => ministry.id === parentMinistryId)?.name?.trim() ||
      "وزارتخانه شما"
    );
  }, [ministriesList, parentMinistryId]);

  const organizationSelectOptions = useMemo(() => {
    const ministryId = selectedMinistryId || (isSubUsersMode ? parentMinistryId : null);
    if (!ministryId) return [] as { id: string; name: string; label: string }[];
    // Scoped managers: list only descendants — never include their own organization.
    if (isScopedToOwnOrganization && parentOrganizationId) {
      return flattenOrganizationsForSelect(organizationOptions, parentOrganizationId).filter(
        (org) => org.id !== parentOrganizationId
      );
    }
    return flattenOrganizationsForSelect(organizationOptions, ministryId);
  }, [
    organizationOptions,
    selectedMinistryId,
    isSubUsersMode,
    isScopedToOwnOrganization,
    parentMinistryId,
    parentOrganizationId,
  ]);

  const activeMinistryIdForOrg =
    selectedMinistryId || (isSubUsersMode ? parentMinistryId : null) || null;

  const createUnderParentName = useMemo(() => {
    if (!createUnderParentId) return null;
    if (createUnderParentId === activeMinistryIdForOrg) {
      return ministriesList.find((item) => item.id === createUnderParentId)?.name ?? "وزارتخانه";
    }
    return (
      organizationOptions.find((org) => org.id === createUnderParentId)?.name ??
      ministriesList.find((item) => item.id === createUnderParentId)?.name ??
      null
    );
  }, [createUnderParentId, activeMinistryIdForOrg, organizationOptions, ministriesList]);

  const resetOrganizationCreate = () => {
    setCreatingOrganization(false);
    setNewOrganizationName("");
    setCreateUnderParentId(null);
  };

  const handleOrganizationSelect = (value: string) => {
    if (value === CREATE_ORGANIZATION) {
      void requestCreate(() => {
        const currentOrg = form.getValues("organizationId")?.trim() || null;
        const parentForCreate =
          currentOrg ||
          (isScopedToOwnOrganization ? parentOrganizationId : null) ||
          activeMinistryIdForOrg;
        setCreateUnderParentId(parentForCreate);
        setCreatingOrganization(true);
        setNewOrganizationName("");
      });
      return;
    }
    resetOrganizationCreate();
    form.setValue("organizationId", value === NO_ORGANIZATION ? null : value);
  };

  const createOrganizationInline = () => {
    const ministryId = activeMinistryIdForOrg;
    const name = newOrganizationName.trim();
    if (!ministryId) {
      toast.error("ابتدا وزارتخانه را انتخاب کنید");
      return;
    }
    if (!name) {
      toast.error("نام زیرمجموعه الزامی است");
      return;
    }

    const deviceParentId =
      createUnderParentId ||
      (isScopedToOwnOrganization ? parentOrganizationId : null) ||
      ministryId;

    const existing = ministriesList
      .find((ministry) => ministry.id === ministryId)
      ?.organizations?.find((org) => org.name.trim() === name);
    if (existing) {
      form.setValue("organizationId", existing.id);
      resetOrganizationCreate();
      toast.success("زیرمجموعه از لیست انتخاب شد");
      return;
    }

    startTransition(async () => {
      // Always write into the device tree so nested nodes appear under the right parent
      // (e.g. under اراضی, not flattened under the ministry root).
      const result = isScopedToOwnOrganization
        ? await saveDeviceAction({
            name,
            shortName: name,
            type: "organization",
            parentId: deviceParentId,
            status: "active",
          })
        : await saveOrganizationAction({
            ministryId,
            name,
            isActive: true,
            parentId: deviceParentId,
          });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const nextOrg: MinistryOrganization = {
        id: result.id,
        ministryId,
        ministryName: ministriesList.find((item) => item.id === ministryId)?.name ?? null,
        name,
        fullName: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        parentId: deviceParentId,
      };

      setMinistriesList((prev) =>
        prev.map((ministry) => {
          if (ministry.id !== ministryId) return ministry;
          const organizations = [...(ministry.organizations ?? []), nextOrg].sort((a, b) =>
            a.name.localeCompare(b.name, "fa")
          );
          return { ...ministry, organizations };
        })
      );
      form.setValue("organizationId", result.id);
      resetOrganizationCreate();
      toast.success(
        createUnderParentName
          ? `زیرمجموعه «${name}» زیر «${createUnderParentName}» ایجاد شد`
          : "زیرمجموعه ایجاد شد"
      );
    });
  };

  const openBulkAccess = (users: AdminUser[], clearSelection: () => void) => {
    const editable = users.filter((user) => rolesWithCampaignAccess.includes(user.role));
    if (editable.length === 0) {
      toast.error("برای کاربران انتخاب‌شده امکان تنظیم دسترسی پنل وجود ندارد");
      return;
    }
    if (soleCampaignIds.length === 0) {
      toast.error("راستایی برای اختصاص دسترسی تعریف نشده است");
      return;
    }
    setBulkSelectedUsers(editable);
    setBulkClearSelection(() => clearSelection);
    setBulkPermissions(defaultContributorPermissions());
    setBulkAccessOpen(true);
  };

  const applyBulkAccess = () => {
    if (bulkSelectedUsers.length === 0) {
      toast.error("هیچ کاربری انتخاب نشده است");
      return;
    }
    if (soleCampaignIds.length === 0) {
      toast.error("راستایی برای اختصاص دسترسی تعریف نشده است");
      return;
    }

    startTransition(async () => {
      const result = await bulkUpdateUsersAccessAction({
        userIds: bulkSelectedUsers.map((user) => user.id),
        campaignIds: soleCampaignIds,
        permissions: bulkPermissions,
      });
      if (!result.success) {
        toast.error(result.error ?? "بروزرسانی دسترسی ناموفق بود");
        return;
      }

      const sharedPermissions = Object.fromEntries(
        soleCampaignIds.map((campaignId) => [campaignId, bulkPermissions])
      ) as Record<string, ContributorPermissions>;
      const updatedIds = new Set(bulkSelectedUsers.map((user) => user.id));

      setRows((prev) =>
        prev.map((row) =>
          updatedIds.has(row.id)
            ? {
                ...row,
                campaignIds: [...soleCampaignIds],
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
        const ministry = ministriesList.find((item) => item.id === data.ministryId);
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
    const organizationId = isScopedToOwnOrganization
      ? assignToOwnUnit
        ? parentOrganizationId || null
        : data.organizationId ?? null
      : isScopedToOwnMinistry && assignToOwnUnit
        ? null
        : data.organizationId ?? null;
    const nextParentUserId = isSubUsersMode
      ? parentUserId ?? null
      : role === "org_user"
        ? data.parentUserId ?? null
        : null;

    if (isFullMode && role === "org_user" && !ministryId) {
      toast.error("برای کاربر دستگاه انتخاب وزارتخانه الزامی است");
      return;
    }
    if (isScopedToOwnOrganization && assignToOwnUnit && !organizationId) {
      toast.error("اتصال به خود سازمان ممکن نیست");
      return;
    }
    if (
      isScopedToOwnOrganization &&
      !assignToOwnUnit &&
      (!organizationId || organizationId === parentOrganizationId)
    ) {
      toast.error("یکی از زیرمجموعه‌ها را انتخاب کنید");
      return;
    }
    if (isScopedToOwnMinistry && !assignToOwnUnit && !organizationId) {
      toast.error("یکی از زیرمجموعه‌ها را انتخاب کنید");
      return;
    }

    const authorityLevel = inferDefaultAuthorityLevel({
      role,
      organizationId,
      ministryId,
    });

    startTransition(async () => {
      const nextCampaignIds = rolesWithCampaignAccess.includes(role) ? soleCampaignIds : [];
      let nextCampaignPermissions = rolesWithCampaignAccess.includes(role)
        ? campaignPermissions
        : {};
      if (permissionCapActive && rolesWithCampaignAccess.includes(role)) {
        nextCampaignPermissions = Object.fromEntries(
          nextCampaignIds.map((campaignId) => [
            campaignId,
            clampToGrantor(
              campaignId,
              normalizeContributorPermissions(
                nextCampaignPermissions[campaignId] ?? deniedContributorPermissions()
              )
            ),
          ])
        );
      }
      const existing = rows.find((row) => row.id === editingId);
      const resolvedEmail = resolveStoredUserEmail(data.email, existing?.email);
      const result = await saveUserAction({
        ...data,
        role,
        orgRole,
        email: resolvedEmail,
        id: editingId ?? undefined,
        province: data.province?.trim() || null,
        city: data.city?.trim() || null,
        phone: data.phone?.trim() || null,
        ministryId,
        organizationId,
        parentUserId: nextParentUserId,
        campaignIds: nextCampaignIds,
        campaignPermissions: rolesWithCampaignAccess.includes(role)
          ? nextCampaignPermissions
          : undefined,
      });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره نشد");
        return;
      }

      const savedId = "id" in result ? result.id : (editingId ?? crypto.randomUUID());
      const ministry = ministriesList.find((item) => item.id === ministryId);
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
        email: resolvedEmail,
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
        campaignIds: nextCampaignIds,
        campaignPermissions: nextCampaignPermissions,
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
    setOptionalFieldsOpen(false);
    resetOrganizationCreate();
    const defaultAssignOwn = canAssignToOwnUnit;
    setAssignToOwnUnit(defaultAssignOwn);
    const defaultOrgRole: OrgRole = "pr";
    if (permissionCapActive && primaryCampaignId) {
      const grantor = getGrantorPermissions(primaryCampaignId);
      // Child starts with everything the parent may grant — no one-by-one toggles required.
      bindSoleCampaignAccess(grantor ?? getOrgRolePermissionPreset(defaultOrgRole));
    } else {
      bindSoleCampaignAccess(getOrgRolePermissionPreset(defaultOrgRole));
    }
    form.reset({
      email: "",
      name: "",
      role: "org_user",
      orgRole: defaultOrgRole,
      password: "",
      province: "",
      city: "",
      phone: "",
      ministryId: isSubUsersMode ? parentMinistryId : null,
      organizationId:
        defaultAssignOwn && isScopedToOwnOrganization ? parentOrganizationId : null,
      parentUserId: parentUserId ?? null,
      campaignIds: soleCampaignIds,
    });
    setOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setOptionalFieldsOpen(false);
    resetOrganizationCreate();
    const permissions = user.campaignPermissions ?? {};
    const normalizedProvince =
      normalizeImportedProvince(user.province ?? "") ?? user.province?.trim() ?? "";
    const normalizedCity =
      normalizeImportedCity(normalizedProvince, user.city ?? "") ?? user.city?.trim() ?? "";

    const role: AdminRole =
      user.role === "admin" || user.role === "client" || user.role === "org_user"
        ? user.role
        : "org_user";
    const nextCampaignIds = rolesWithCampaignAccess.includes(role) ? soleCampaignIds : [];
    if (rolesWithCampaignAccess.includes(role) && soleCampaignIds.length > 0) {
      const fallback =
        (primaryCampaignId ? permissions[primaryCampaignId] : undefined) ??
        Object.values(permissions)[0] ??
        (role === "org_user"
          ? getOrgRolePermissionPreset(user.orgRole ?? "pr")
          : defaultContributorPermissions());
      setCampaignPermissions(
        Object.fromEntries(
          soleCampaignIds.map((campaignId) => [
            campaignId,
            clampToGrantor(
              campaignId,
              normalizeContributorPermissions(permissions[campaignId] ?? fallback)
            ),
          ])
        )
      );
    } else {
      setCampaignPermissions({});
    }
    const isOwnOrgUser =
      isScopedToOwnOrganization &&
      Boolean(parentOrganizationId) &&
      user.organizationId === parentOrganizationId;
    const isOwnMinistryUser =
      isScopedToOwnMinistry && !user.organizationId;
    setAssignToOwnUnit(isOwnOrgUser || isOwnMinistryUser);
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
      campaignIds: nextCampaignIds,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      {tutorialModal}
      <div>
        <h1 className="text-2xl font-bold">
          {isSubUsersMode || isViewSubtreeMode ? "کاربران زیرمجموعه" : "کاربران"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isFullMode
            ? "کاربران به وزارتخانه یا زیرمجموعه وصل می‌شوند؛ زیرمجموعه مال دستگاه است نه مسئول"
            : isSubUsersMode
              ? "ایجاد و مدیریت کاربران زیرمجموعه با سمت سازمانی"
              : isViewSubtreeMode
                ? "مشاهده کاربران زیرمجموعه (بدون دسترسی مدیریت)"
                : "تعیین وزارتخانه کاربران و مشاهده توزیع بر اساس دستگاه"}
        </p>
      </div>

      <Tabs defaultValue="tree">
        <TabsList>
          <TabsTrigger value="tree">نمای درختی</TabsTrigger>
          <TabsTrigger value="list">
            {isSubUsersMode || isViewSubtreeMode ? "لیست کاربران" : "لیست جدول"}
          </TabsTrigger>
          {isFullMode && <TabsTrigger value="import">ورود از Excel</TabsTrigger>}
        </TabsList>

        <TabsContent value="tree" className="mt-4 space-y-4">
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
                      label: org.label,
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
            ministries={ministriesList}
            onEdit={canManageUsers || isMinistryOnlyMode ? openEdit : undefined}
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
                      label: org.label,
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
            data={listRows}
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
                render: (item) => (
                  <span className="leading-5">{item.name}</span>
                ),
              },
              {
                key: "email",
                label: "نام کاربری",
                render: (item) => getLoginUsernameFromEmail(item.email ?? ""),
              },
              {
                key: "ministryName",
                label: "وزارتخانه",
                render: (item) => item.ministryName || "—",
              },
              {
                key: "organizationName",
                label: "زیرمجموعه",
                render: (item) => item.organizationName || "خود وزارتخانه",
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
            ]}
            onEdit={canManageUsers || isMinistryOnlyMode ? openEdit : undefined}
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
                {/* —— Essential fields only —— */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>نام سازمان</Label>
                    <Input {...form.register("name")} placeholder="نام سازمان" />
                  </div>
                  <div className="space-y-2">
                    <Label>نام کاربری</Label>
                    <Input {...form.register("email")} dir="ltr" placeholder="BAZARBAYJAN" />
                  </div>

                  {!isSubUsersMode && (
                    <>
                      <div className="space-y-2">
                        <Label>وزارتخانه</Label>
                        <Select
                          value={selectedMinistryId || NO_MINISTRY}
                          onValueChange={(value) => {
                            form.setValue("ministryId", value === NO_MINISTRY ? null : value);
                            form.setValue("organizationId", null);
                            resetOrganizationCreate();
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="انتخاب وزارتخانه" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_MINISTRY}>بدون وزارتخانه</SelectItem>
                            {ministriesList
                              .filter((ministry) => Boolean(ministry.id))
                              .map((ministry) => (
                              <SelectItem key={ministry.id} value={ministry.id}>
                                {ministry.name}
                                {ministry.fullName ? ` — ${ministry.fullName}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>زیرمجموعه</Label>
                        <Select
                          value={
                            creatingOrganization
                              ? CREATE_ORGANIZATION
                              : selectedOrganizationId || NO_ORGANIZATION
                          }
                          onValueChange={handleOrganizationSelect}
                          disabled={!selectedMinistryId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="خود وزارتخانه یا یک زیرمجموعه" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_ORGANIZATION}>خود وزارتخانه</SelectItem>
                            {organizationSelectOptions
                              .filter((org) => Boolean(org.id))
                              .map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.label}
                              </SelectItem>
                            ))}
                            <SelectItem value={CREATE_ORGANIZATION}>ایجاد زیرمجموعه جدید…</SelectItem>
                          </SelectContent>
                        </Select>
                        {creatingOrganization && (
                          <div className="space-y-2">
                            {createUnderParentName ? (
                              <p className="text-xs text-muted-foreground">
                                زیرمجموعه جدید زیر «{createUnderParentName}» در درخت دستگاه ایجاد می‌شود.
                              </p>
                            ) : null}
                            <div className="flex gap-2">
                            <Input
                              value={newOrganizationName}
                              onChange={(event) => setNewOrganizationName(event.target.value)}
                              placeholder="نام زیرمجموعه جدید"
                              disabled={isPending}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  createOrganizationInline();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={isPending || !newOrganizationName.trim()}
                              onClick={createOrganizationInline}
                            >
                              ایجاد
                            </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {isSubUsersMode && Boolean(parentMinistryId) && (
                    <div className="space-y-2">
                      {canAssignToOwnUnit && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={assignToOwnUnit}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setAssignToOwnUnit(checked);
                              resetOrganizationCreate();
                              form.setValue(
                                "organizationId",
                                checked && isScopedToOwnOrganization
                                  ? parentOrganizationId
                                  : null
                              );
                            }}
                          />
                          {isScopedToOwnOrganization ? "برای خود سازمان" : "برای خود وزارتخانه"}
                          {isScopedToOwnOrganization && ownOrganizationName ? (
                            <span className="text-muted-foreground">({ownOrganizationName})</span>
                          ) : null}
                          {isScopedToOwnMinistry && ownMinistryName ? (
                            <span className="text-muted-foreground">({ownMinistryName})</span>
                          ) : null}
                        </label>
                      )}
                      {!(assignToOwnUnit && canAssignToOwnUnit) && (
                        <>
                          <Label>زیرمجموعه</Label>
                          <Select
                            value={
                              creatingOrganization
                                ? CREATE_ORGANIZATION
                                : selectedOrganizationId || NO_ORGANIZATION
                            }
                            onValueChange={handleOrganizationSelect}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="یکی از زیرمجموعه‌ها را انتخاب کنید" />
                            </SelectTrigger>
                            <SelectContent>
                              {!selectedOrganizationId && !creatingOrganization && (
                                <SelectItem value={NO_ORGANIZATION} disabled>
                                  انتخاب زیرمجموعه…
                                </SelectItem>
                              )}
                              {organizationSelectOptions
                                .filter((org) => Boolean(org.id))
                                .map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.label}
                                </SelectItem>
                              ))}
                              <SelectItem value={CREATE_ORGANIZATION}>ایجاد زیرمجموعه جدید…</SelectItem>
                            </SelectContent>
                          </Select>
                          {creatingOrganization && (
                            <div className="space-y-2">
                              {createUnderParentName ? (
                                <p className="text-xs text-muted-foreground">
                                  زیرمجموعه جدید زیر «{createUnderParentName}» در درخت دستگاه ایجاد می‌شود.
                                </p>
                              ) : null}
                              <div className="flex gap-2">
                              <Input
                                value={newOrganizationName}
                                onChange={(event) => setNewOrganizationName(event.target.value)}
                                placeholder="نام زیرمجموعه جدید"
                                disabled={isPending}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    createOrganizationInline();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={isPending || !newOrganizationName.trim()}
                                onClick={createOrganizationInline}
                              >
                                ایجاد
                              </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {canAssignToOwnUnit && (
                        <p className="text-xs text-muted-foreground">
                          {assignToOwnUnit
                            ? isScopedToOwnOrganization
                              ? "کاربر به خود سازمان شما وصل می‌شود."
                              : "کاربر به خود وزارتخانه شما وصل می‌شود."
                            : "فقط زیرمجموعه‌ها در لیست هستند. برای ساخت زیر یک گره، ابتدا آن را انتخاب کنید."}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{editingId ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}</Label>
                    <Input type="password" {...form.register("password")} />
                  </div>

                  {(isFullMode
                    ? selectedRole === "org_user" || isSubUsersMode
                    : isSubUsersMode) && (
                    <div className="space-y-2">
                      <Label>سمت</Label>
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
                    </div>
                  )}
                </div>

                {/* —— Optional fields (collapsed by default) —— */}
                <div className="overflow-hidden rounded-xl border bg-muted/20">
                  <button
                    type="button"
                    onClick={() => setOptionalFieldsOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/40"
                    aria-expanded={optionalFieldsOpen}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium">تنظیمات اختیاری</p>
                      <p className="text-xs text-muted-foreground">
                        موبایل، استان، دسترسی‌ها و سایر جزئیات
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        optionalFieldsOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {optionalFieldsOpen ? (
                    <div className="space-y-4 border-t px-4 py-4">
                      <div className="space-y-2">
                        <Label>شماره موبایل (برای پیامک)</Label>
                        <Input
                          {...form.register("phone")}
                          dir="ltr"
                          placeholder="0912xxxxxxx"
                          inputMode="tel"
                        />
                      </div>

                      <ProvinceCityFields
                        province={selectedProvince ?? ""}
                        city={selectedCity ?? ""}
                        onProvinceChange={(value) => form.setValue("province", value)}
                        onCityChange={(value) => form.setValue("city", value)}
                      />

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
                                } else if (nextRole === "client") {
                                  form.setValue("orgRole", null);
                                  form.setValue("parentUserId", null);
                                  bindSoleCampaignAccess(defaultContributorPermissions());
                                } else {
                                  form.setValue("orgRole", null);
                                  form.setValue("parentUserId", null);
                                  form.setValue("campaignIds", []);
                                  setCampaignPermissions({});
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

                          {selectedRole === "org_user" && (
                            <div className="space-y-2">
                              <Label>کاربر والد برای دسترسی مدیریتی</Label>
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

                      {rolesWithCampaignAccess.includes(selectedRole) && primaryCampaignId ? (
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Label>دسترسی به بخش‌های پنل</Label>
                            <div className="flex flex-wrap gap-2">
                              {(selectedRole === "org_user" || isSubUsersMode) && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const orgRole = (form.getValues("orgRole") ?? "pr") as OrgRole;
                                    applyOrgRolePreset(orgRole);
                                    toast.success("پیش‌فرض سمت اعمال شد");
                                  }}
                                >
                                  پیش‌فرض سمت
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  enableAllGrantablePermissions(primaryCampaignId);
                                  toast.success("همه دسترسی‌های مجاز فعال شد");
                                }}
                              >
                                فعال‌سازی همه
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  disableAllPermissions(primaryCampaignId);
                                  toast.success("همه دسترسی‌ها خاموش شد");
                                }}
                              >
                                خاموش کردن همه
                              </Button>
                            </div>
                          </div>
                          {permissionCapActive ? (
                            <p className="text-xs text-muted-foreground">
                              فقط دسترسی‌هایی را می‌توانید بدهید که خودتان دارید؛ این محدودیت تا پایین درخت ادامه دارد.
                            </p>
                          ) : null}
                          {primaryCampaignId && getDeviceCeiling(primaryCampaignId) ? (
                            <p className="text-xs text-muted-foreground">
                              سقف دسترسی دستگاه برای این کاربر فعال است؛ نمی‌توانید بیشتر از دسترسی دستگاه بدهید.
                            </p>
                          ) : null}
                          <ContributorPermissionsEditor
                            permissions={normalizeContributorPermissions(
                              campaignPermissions[primaryCampaignId] ??
                                defaultContributorPermissions()
                            )}
                            onChange={(next) =>
                              setCampaignPermissions((prev) => ({
                                ...prev,
                                [primaryCampaignId]: clampToGrantor(primaryCampaignId, next),
                              }))
                            }
                            ceiling={getPermissionCap(primaryCampaignId)}
                            showPanelManagement={selectedRole === "org_user"}
                            showSubtreeManagement={selectedRole === "org_user"}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">نام سازمان: </span>
                    {form.getValues("name") || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">نام کاربری: </span>
                    <span dir="ltr">{form.getValues("email") || "—"}</span>
                  </p>
                </div>

                {!isSubUsersMode && (
                  <>
                    <div className="space-y-2">
                      <Label>وزارتخانه</Label>
                      <Select
                        value={selectedMinistryId || NO_MINISTRY}
                        onValueChange={(value) => {
                          form.setValue("ministryId", value === NO_MINISTRY ? null : value);
                          form.setValue("organizationId", null);
                          resetOrganizationCreate();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب وزارتخانه" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_MINISTRY}>بدون وزارتخانه</SelectItem>
                          {ministriesList
                            .filter((ministry) => Boolean(ministry.id))
                            .map((ministry) => (
                            <SelectItem key={ministry.id} value={ministry.id}>
                              {ministry.name}
                              {ministry.fullName ? ` — ${ministry.fullName}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>زیرمجموعه</Label>
                      <Select
                        value={
                          creatingOrganization
                            ? CREATE_ORGANIZATION
                            : selectedOrganizationId || NO_ORGANIZATION
                        }
                        onValueChange={handleOrganizationSelect}
                        disabled={!selectedMinistryId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="خود وزارتخانه یا یک زیرمجموعه" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_ORGANIZATION}>خود وزارتخانه</SelectItem>
                          {organizationSelectOptions
                            .filter((org) => Boolean(org.id))
                            .map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.label}
                            </SelectItem>
                          ))}
                          <SelectItem value={CREATE_ORGANIZATION}>ایجاد زیرمجموعه جدید…</SelectItem>
                        </SelectContent>
                      </Select>
                      {creatingOrganization && (
                        <div className="space-y-2">
                          {createUnderParentName ? (
                            <p className="text-xs text-muted-foreground">
                              زیرمجموعه جدید زیر «{createUnderParentName}» در درخت دستگاه ایجاد می‌شود.
                            </p>
                          ) : null}
                          <div className="flex gap-2">
                          <Input
                            value={newOrganizationName}
                            onChange={(event) => setNewOrganizationName(event.target.value)}
                            placeholder="نام زیرمجموعه جدید"
                            disabled={isPending}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                createOrganizationInline();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isPending || !newOrganizationName.trim()}
                            onClick={createOrganizationInline}
                          >
                            ایجاد
                          </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label>دسترسی به بخش‌های پنل</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allOn = deniedContributorPermissions();
                      for (const key of allContributorPermissionKeys) {
                        allOn[key] = true;
                      }
                      setBulkPermissions(allOn);
                      toast.success("همه دسترسی‌ها فعال شد");
                    }}
                  >
                    فعال‌سازی همه
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkPermissions(deniedContributorPermissions());
                      toast.success("همه دسترسی‌ها خاموش شد");
                    }}
                  >
                    خاموش کردن همه
                  </Button>
                </div>
              </div>
              <ContributorPermissionsEditor
                permissions={bulkPermissions}
                onChange={setBulkPermissions}
                showPanelManagement
                showSubtreeManagement
              />
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
