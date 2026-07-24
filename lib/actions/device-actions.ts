"use server";

import { revalidatePath } from "next/cache";
import {
  canAccessDevicesPage,
  canCreateDeviceUnder,
  canMutateDevice,
  getSessionHomeDeviceId,
  isDeviceTreeScopedRole,
  listAccessibleDevices,
} from "@/lib/auth/device-access";
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
} from "@/lib/db/repository-devices";
import { isPostgresConfigured } from "@/lib/utils";
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

async function revalidateDevicePages(deviceId?: string) {
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/devices");
  revalidatePath("/admin/users");
  revalidatePath("/admin/directives");
  if (deviceId) revalidatePath(`/admin/devices/${deviceId}`);
}

export async function listDevicesAction(options?: {
  parentId?: string | null;
  rootsOnly?: boolean;
}) {
  const session = await getAuthSession();
  if (!session || !canAccessDevicesPage(session)) {
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
    const allowed = await canMutateDevice(session, deviceId);
    if (!allowed) {
      return { success: false as const, error: "دسترسی به این دستگاه ندارید", passport: null };
    }
  }
  const passport = await pgGetDevicePassport(deviceId);
  if (!passport) return { success: false as const, error: "دستگاه یافت نشد", passport: null };
  return { success: true as const, passport };
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

  if (isFullAdmin(session)) {
    const result = await pgSaveDevice(data);
    if (result.success) await revalidateDevicePages(result.id);
    return result;
  }

  // Scoped roles: only their subtree; no new root ministries.
  if (!isDeviceTreeScopedRole(session)) {
    return { success: false as const, error: "Unauthorized" };
  }

  if (data.type === "ministry" && !parentId) {
    return {
      success: false as const,
      error: "فقط مدیر می‌تواند وزارتخانه ریشه ایجاد کند",
    };
  }

  if (isUpdate && data.id) {
    const allowed = await canMutateDevice(session, data.id);
    if (!allowed) {
      return { success: false as const, error: "دسترسی به این دستگاه ندارید" };
    }

    const existing = await pgGetDeviceById(data.id);
    if (!existing) {
      return { success: false as const, error: "دستگاه یافت نشد" };
    }

    // Keep placement inside the caller's tree; do not allow orphaning to root.
    const nextParentId = parentId ?? existing.parentId;
    if (!nextParentId) {
      // Editing the home/root node of their tree is OK (ministry_parent on ministry).
      const homeId = await getSessionHomeDeviceId(session);
      if (homeId !== data.id) {
        return {
          success: false as const,
          error: "نمی‌توانید این دستگاه را به ریشه منتقل کنید",
        };
      }
    } else {
      const parentAllowed = await canMutateDevice(session, nextParentId);
      if (!parentAllowed) {
        return { success: false as const, error: "والد خارج از محدوده دسترسی شماست" };
      }
    }

    const result = await pgSaveDevice({
      ...data,
      parentId: nextParentId,
      // Scoped users cannot promote a node into a root ministry type without parent.
      type: nextParentId ? (data.type === "ministry" ? "organization" : data.type) : existing.type,
    });
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

  const result = await pgSaveDevice({
    ...data,
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

  const result = await pgDeleteDevice(id);
  if (result.success) await revalidateDevicePages();
  return result;
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
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const result = await pgSaveDeviceOfficial(data);
  if (result.success) await revalidateDevicePages(data.deviceId);
  return result;
}

export async function endDeviceOfficialAction(id: string, deviceId: string) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

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
  const session = await getAuthSession();
  if (!session || !canAccessDevicesPage(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  if (!isFullAdmin(session)) {
    const allowed = await canMutateDevice(session, data.deviceId);
    if (!allowed) {
      return { success: false as const, error: "دسترسی به این دستگاه ندارید" };
    }
  }

  const result = await pgSaveDeviceStaff(data);
  if (result.success) await revalidateDevicePages(data.deviceId);
  return result;
}

export async function deleteDeviceStaffAction(id: string, deviceId: string) {
  const session = await getAuthSession();
  if (!session || !canAccessDevicesPage(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  if (!isFullAdmin(session)) {
    const allowed = await canMutateDevice(session, deviceId);
    if (!allowed) {
      return { success: false as const, error: "دسترسی به این دستگاه ندارید" };
    }
  }

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
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const result = await pgSaveDeviceCapacity(data);
  if (result.success) await revalidateDevicePages(data.deviceId);
  return result;
}

export async function deleteDeviceCapacityAction(id: string, deviceId: string) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

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
