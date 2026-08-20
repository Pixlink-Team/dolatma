"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgDeleteUserCapacity,
  pgListNationalCapacityMap,
  pgListUserCapacities,
  pgSaveUserCapacity,
} from "@/lib/db/repository-user-capacities";
import { buildAssetsReport, type AssetsSortBy, type AssetsSortOrder } from "@/lib/assets-report";
import type { DeviceCapacityType } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

export async function listMyCapacitiesAction() {
  const session = await getAuthSession();
  if (!session?.userId) {
    return { success: false as const, error: "Unauthorized", capacities: [] };
  }
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required", capacities: [] };
  }
  const capacities = await pgListUserCapacities(session.userId);
  return { success: true as const, capacities };
}

export async function saveMyCapacityAction(data: {
  id?: string;
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
  if (!session?.userId) return { success: false as const, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const result = await pgSaveUserCapacity({
    ...data,
    userId: session.userId,
  });
  if (result.success) {
    revalidatePath("/admin/profile");
    revalidatePath("/admin/capacity-map");
  }
  return result;
}

export async function deleteMyCapacityAction(id: string) {
  const session = await getAuthSession();
  if (!session?.userId) return { success: false as const, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const result = await pgDeleteUserCapacity(id, session.userId);
  if (result.success) {
    revalidatePath("/admin/profile");
    revalidatePath("/admin/capacity-map");
  }
  return result;
}

export async function getNationalCapacityMapAction(filters?: {
  province?: string | null;
  city?: string | null;
  deviceId?: string | null;
  capacityType?: DeviceCapacityType | null;
  page?: number;
  pageSize?: number;
  sortBy?: AssetsSortBy;
  sortOrder?: AssetsSortOrder;
  q?: string | null;
}) {
  const session = await getAuthSession();
  if (!session) {
    return {
      success: false as const,
      error: "Unauthorized",
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    };
  }
  const isAdmin = isFullAdmin(session);
  const isClient = session.role === "client";
  if (!isAdmin && !isClient) {
    return {
      success: false as const,
      error: "دسترسی ندارید",
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    };
  }
  if (!isPostgresConfigured()) {
    return {
      success: false as const,
      error: "Database required",
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    };
  }
  const items = await pgListNationalCapacityMap(filters);
  const report = buildAssetsReport(items, {
    page: filters?.page,
    pageSize: filters?.pageSize,
    sortBy: filters?.sortBy,
    sortOrder: filters?.sortOrder,
    q: filters?.q,
  });
  return { success: true as const, ...report };
}
