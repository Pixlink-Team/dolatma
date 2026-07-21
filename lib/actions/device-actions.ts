"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgDeleteDevice,
  pgDeleteDeviceCapacity,
  pgEndDeviceOfficial,
  pgEnsureDefaultDevices,
  pgGetDevicePassport,
  pgListDevices,
  pgSaveDevice,
  pgSaveDeviceCapacity,
  pgSaveDeviceOfficial,
} from "@/lib/db/repository-devices";
import { isPostgresConfigured } from "@/lib/utils";
import type {
  DeviceActivityScope,
  DeviceCapacityType,
  DeviceOfficialRole,
  DeviceSocialLinks,
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
  if (!session) return { success: false as const, error: "Unauthorized", devices: [] };
  if (!isPostgresConfigured()) return { success: true as const, devices: [] };
  const devices = await pgListDevices(options);
  return { success: true as const, devices };
}

export async function getDevicePassportAction(deviceId: string) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized", passport: null };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required", passport: null };
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
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const result = await pgSaveDevice(data);
  if (result.success) await revalidateDevicePages(result.id);
  return result;
}

export async function deleteDeviceAction(id: string) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

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
