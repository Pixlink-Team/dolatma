"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgDeleteMinistry,
  pgListMinistries,
  pgSaveMinistry,
} from "@/lib/db/repository-ministries";
import { isPostgresConfigured } from "@/lib/utils";

async function revalidateMinistryPages() {
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/users");
}

export async function listMinistriesAction() {
  const session = await getAuthSession();
  if (!session) return { success: false as const, error: "Unauthorized", ministries: [] };
  if (!isPostgresConfigured()) return { success: true as const, ministries: [] };
  const ministries = await pgListMinistries();
  return { success: true as const, ministries };
}

export async function saveMinistryAction(data: { id?: string; name: string }) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const result = await pgSaveMinistry(data);
  if (result.success) await revalidateMinistryPages();
  return result;
}

export async function deleteMinistryAction(id: string) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const result = await pgDeleteMinistry(id);
  if (result.success) await revalidateMinistryPages();
  return result;
}
