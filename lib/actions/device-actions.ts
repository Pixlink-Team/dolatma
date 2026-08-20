"use server";

import { revalidatePath } from "next/cache";
import {
  canAccessDevicesPage,
  canCreateDeviceUnder,
  canEditDevicePassport,
  canMutateDevice,
  canViewDevice,
  filterUsersVisibleToSession,
  getSessionHomeDeviceId,
  isDeviceTreeScopedRole,
  listAccessibleDevices,
} from "@/lib/auth/device-access";
import { canManageSubtreeDevices } from "@/lib/auth/access";
import { assertContributorTutorialCompleted } from "@/lib/auth/require-tutorial-completion";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgDeleteDevice,
  pgDeleteDeviceCapacity,
  pgDeleteDeviceStaff,
  pgEndDeviceOfficial,
  pgEnsureDefaultDevices,
  pgGetDeviceById,
  pgGetDevicePassport,
  pgListDevices,
  pgSaveDevice,
  pgSaveDeviceCapacity,
  pgSaveDeviceOfficial,
  pgSaveDeviceStaff,
  pgUpdateDevicePublicPage,
} from "@/lib/db/repository-devices";
import { hashPassword } from "@/lib/auth/password";
import { isPostgresConfigured } from "@/lib/utils";
import { stripFileAccessToken, withFileAccessTokensDeep } from "@/lib/uploads";
import type {
  DeviceActivityScope,
  DeviceCapacityType,
  DeviceOfficialRole,
  DeviceSocialLinks,
  DeviceStaffEducation,
  DeviceStaffGender,
  DeviceStatus,
  DeviceType,
} from "@/lib/types";

async function revalidateDevicePages(deviceId?: string, publicSlug?: string | null) {
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/devices");
  revalidatePath("/admin/users");
  revalidatePath("/admin/directives");
  if (deviceId) revalidatePath(`/admin/devices/${deviceId}`);
  if (publicSlug) revalidatePath(`/device/${publicSlug}`);
}

/** Only the device's own user (or full admin) may edit passport content. */
async function requireDevicePassportEditAccess(deviceId: string) {
  const session = await getAuthSession();
  if (!session || !canAccessDevicesPage(session)) {
    return { ok: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { ok: false as const, error: "Database required" };
  }
  if (!isFullAdmin(session)) {
    const allowed = await canEditDevicePassport(session, deviceId);
    if (!allowed) {
      return {
        ok: false as const,
        error: "فقط مسئول همین دستگاه می‌تواند شناسنامه را تکمیل کند",
      };
    }
  }
  return { ok: true as const, session };
}

export async function listDevicesAction(options?: {
  parentId?: string | null;
  rootsOnly?: boolean;
}) {
  const session = await getAuthSession();
  if (!session || !canManageSubtreeDevices(session)) {
    return { success: false as const, error: "Unauthorized", devices: [] };
  }
  if (!isPostgresConfigured()) return { success: true as const, devices: [] };

  if (isFullAdmin(session)) {
    const devices = await pgListDevices(options);
    return { success: true as const, devices };
  }

  const devices = await listAccessibleDevices(session);
  return { success: true as const, devices };
}

export async function getDevicePassportAction(deviceId: string) {
  const session = await getAuthSession();
  if (!session || !canAccessDevicesPage(session)) {
    return { success: false as const, error: "Unauthorized", passport: null };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required", passport: null };
  }
  if (!isFullAdmin(session)) {
    const allowed = await canViewDevice(session, deviceId);
    if (!allowed) {
      return { success: false as const, error: "دسترسی به این دستگاه ندارید", passport: null };
    }
  }
  const passport = await pgGetDevicePassport(deviceId);
  if (!passport) return { success: false as const, error: "دستگاه یافت نشد", passport: null };
  const users = await filterUsersVisibleToSession(session, passport.users);
  return {
    success: true as const,
    passport: withFileAccessTokensDeep({ ...passport, users }),
  };
}

export async function saveDeviceAction(data: {
  id?: string;
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  type: DeviceType;
  parentId?: string | null;
  province?: string | null;
  city?: string | null;
  activityScope?: DeviceActivityScope;
  mission?: string | null;
  address?: string | null;
  phones?: string[];
  website?: string | null;
  socialLinks?: DeviceSocialLinks;
  status?: DeviceStatus;
}) {
  const session = await getAuthSession();
  if (!session || !canAccessDevicesPage(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const parentId = data.parentId?.trim() || null;
  const isUpdate = Boolean(data.id);
  const logoUrl =
    data.logoUrl === undefined
      ? undefined
      : data.logoUrl?.trim()
        ? stripFileAccessToken(data.logoUrl) || null
        : null;
  const payload = { ...data, logoUrl };

  if (isFullAdmin(session)) {
    const result = await pgSaveDevice(payload);
    if (result.success) await revalidateDevicePages(result.id);
    return result;
  }

  // Scoped roles: only their subtree; no new root ministries.
  if (!isDeviceTreeScopedRole(session)) {
    return { success: false as const, error: "Unauthorized" };
  }

  // Creating a new root ministry is admin-only. Updating an existing root
  // (e.g. ministry manager editing own province/city) must still be allowed.
  if (!isUpdate && data.type === "ministry" && !parentId) {
    return {
      success: false as const,
      error: "فقط مدیر می‌تواند وزارتخانه ریشه ایجاد کند",
    };
  }

  if (isUpdate && data.id) {
    const canEditPassport = await canEditDevicePassport(session, data.id);
    const allowedTree = await canMutateDevice(session, data.id);
    if (!canEditPassport && !allowedTree) {
      return { success: false as const, error: "دسترسی به این دستگاه ندارید" };
    }

    const existing = await pgGetDeviceById(data.id);
    if (!existing) {
      return { success: false as const, error: "دستگاه یافت نشد" };
    }

    // Own-device passport owners may edit all content but never reparent (ministry placement).
    const lockMinistryPlacement = canEditPassport;
    if (
      lockMinistryPlacement &&
      parentId !== null &&
      parentId !== existing.parentId
    ) {
      return {
        success: false as const,
        error: "نمی‌توانید وزارتخانه یا محل قرارگیری دستگاه خود را تغییر دهید",
      };
    }

    // Keep placement inside the caller's tree; do not allow orphaning to root.
    const nextParentId = lockMinistryPlacement
      ? existing.parentId
      : parentId ?? existing.parentId;
    if (!nextParentId) {
      // Editing the home/root node of their tree is OK (ministry_parent on ministry).
      const homeId = await getSessionHomeDeviceId(session);
      if (homeId !== data.id) {
        return {
          success: false as const,
          error: "نمی‌توانید این دستگاه را به ریشه منتقل کنید",
        };
      }
    } else if (!lockMinistryPlacement) {
      const parentAllowed = await canMutateDevice(session, nextParentId);
      if (!parentAllowed) {
        return { success: false as const, error: "والد خارج از محدوده دسترسی شماست" };
      }
    }

    // Upstream managers may only change tree metadata, not passport content.
    // Root/ministry nodes keep type locked; child nodes may change type except to ministry.
    const nextType = nextParentId
      ? data.type === "ministry"
        ? "organization"
        : data.type
      : existing.type;
    const result = await pgSaveDevice(
      canEditPassport
        ? {
            ...payload,
            parentId: nextParentId,
            type: nextType,
          }
        : {
            id: data.id,
            name: data.name,
            shortName: data.shortName,
            type: nextType,
            parentId: nextParentId,
            status: data.status ?? existing.status,
            logoUrl: existing.logoUrl,
            province: existing.province,
            city: existing.city,
            activityScope: existing.activityScope,
            mission: existing.mission,
            address: existing.address,
            phones: existing.phones,
            website: existing.website,
            socialLinks: existing.socialLinks,
          }
    );
    if (result.success) await revalidateDevicePages(result.id);
    return result;
  }

  const canCreate = await canCreateDeviceUnder(session, parentId);
  if (!canCreate || !parentId) {
    return {
      success: false as const,
      error: "فقط می‌توانید زیرمجموعه زیر درخت خودتان ایجاد کنید",
    };
  }

  const tutorialDenied = await assertContributorTutorialCompleted("subsidiaries");
  if (tutorialDenied) return tutorialDenied;

  const result = await pgSaveDevice({
    ...payload,
    parentId,
    type: data.type === "ministry" ? "organization" : data.type,
  });
  if (result.success) await revalidateDevicePages(result.id);
  return result;
}

export async function deleteDeviceAction(id: string) {
  const session = await getAuthSession();
  if (!session || !canAccessDevicesPage(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  if (!isFullAdmin(session)) {
    const allowed = await canMutateDevice(session, id);
    if (!allowed) {
      return { success: false as const, error: "دسترسی به این دستگاه ندارید" };
    }
    const homeId = await getSessionHomeDeviceId(session);
    if (homeId === id) {
      return {
        success: false as const,
        error: "نمی‌توانید دستگاه اصلی خودتان را حذف کنید",
      };
    }
  }

  try {
    const existing = await pgGetDeviceById(id);
    const result = await pgDeleteDevice(id);
    if (result.success) {
      await revalidateDevicePages(undefined, existing?.publicSlug);
    }
    return result;
  } catch (error) {
    console.error("[devices] deleteDeviceAction failed", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "حذف دستگاه ناموفق بود",
    };
  }
}

/** Save public slug and/or page password for a device. */
export async function saveDevicePublicPageAction(input: {
  deviceId: string;
  publicSlug?: string | null;
  password?: string;
  removePassword?: boolean;
}) {
  const session = await getAuthSession();
  if (!session || !canAccessDevicesPage(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }

  if (!isFullAdmin(session)) {
    const canEdit =
      (await canEditDevicePassport(session, input.deviceId)) ||
      (await canMutateDevice(session, input.deviceId));
    if (!canEdit) {
      return { success: false as const, error: "دسترسی به این دستگاه ندارید" };
    }
  }

  const existing = await pgGetDeviceById(input.deviceId);
  if (!existing) {
    return { success: false as const, error: "دستگاه یافت نشد" };
  }

  let passwordHash: string | undefined;
  if (input.removePassword) {
    passwordHash = undefined;
  } else if (input.password !== undefined) {
    const password = input.password.trim();
    if (!password) {
      return { success: false as const, error: "رمز الزامی است" };
    }
    if (password.length < 4) {
      return { success: false as const, error: "رمز باید حداقل ۴ کاراکتر باشد" };
    }
    passwordHash = await hashPassword(password);
  }

  const result = await pgUpdateDevicePublicPage({
    id: input.deviceId,
    publicSlug: input.publicSlug,
    passwordHash,
    removePassword: input.removePassword,
  });

  if (!result.success) return result;

  const nextSlug =
    input.publicSlug !== undefined
      ? (input.publicSlug?.trim().toLowerCase() || null)
      : existing.publicSlug;
  await revalidateDevicePages(input.deviceId, nextSlug);
  if (existing.publicSlug && existing.publicSlug !== nextSlug) {
    revalidatePath(`/device/${existing.publicSlug}`);
  }
  return { success: true as const };
}

export async function saveDeviceOfficialAction(data: {
  id?: string;
  deviceId: string;
  roleType: DeviceOfficialRole;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  contactNote?: string | null;
  userId?: string | null;
  startedAt?: string | null;
}) {
  const access = await requireDevicePassportEditAccess(data.deviceId);
  if (!access.ok) return { success: false as const, error: access.error };

  const result = await pgSaveDeviceOfficial(data);
  if (result.success) await revalidateDevicePages(data.deviceId);
  return result;
}

export async function endDeviceOfficialAction(id: string, deviceId: string) {
  const access = await requireDevicePassportEditAccess(deviceId);
  if (!access.ok) return { success: false as const, error: access.error };

  const result = await pgEndDeviceOfficial(id);
  if (result.success) await revalidateDevicePages(deviceId);
  return result;
}

export async function saveDeviceStaffAction(data: {
  id?: string;
  deviceId: string;
  firstName: string;
  lastName: string;
  mobile: string;
  gender: DeviceStaffGender;
  birthDate?: string | null;
  position: string;
  education: DeviceStaffEducation;
  isActive?: boolean;
}) {
  const access = await requireDevicePassportEditAccess(data.deviceId);
  if (!access.ok) return { success: false as const, error: access.error };

  const result = await pgSaveDeviceStaff(data);
  if (result.success) await revalidateDevicePages(data.deviceId);
  return result;
}

export async function deleteDeviceStaffAction(id: string, deviceId: string) {
  const access = await requireDevicePassportEditAccess(deviceId);
  if (!access.ok) return { success: false as const, error: access.error };

  const result = await pgDeleteDeviceStaff(id);
  if (result.success) await revalidateDevicePages(deviceId);
  return result;
}

export async function saveDeviceCapacityAction(data: {
  id?: string;
  deviceId: string;
  capacityType: DeviceCapacityType;
  title: string;
  description?: string | null;
  isActive?: boolean;
  ownerName?: string | null;
  coverageScope?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  details?: Record<string, unknown> | null;
}) {
  const access = await requireDevicePassportEditAccess(data.deviceId);
  if (!access.ok) return { success: false as const, error: access.error };

  const result = await pgSaveDeviceCapacity(data);
  if (result.success) await revalidateDevicePages(data.deviceId);
  return result;
}

export async function deleteDeviceCapacityAction(id: string, deviceId: string) {
  const access = await requireDevicePassportEditAccess(deviceId);
  if (!access.ok) return { success: false as const, error: access.error };

  const result = await pgDeleteDeviceCapacity(id);
  if (result.success) await revalidateDevicePages(deviceId);
  return result;
}

export async function ensureDefaultDevicesAction() {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };
  await pgEnsureDefaultDevices();
  await revalidateDevicePages();
  return { success: true as const };
}
