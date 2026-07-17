"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgDeleteMinistry,
  pgEnsureDefaultMinistries,
  pgListMinistries,
  pgSaveMinistry,
} from "@/lib/db/repository-ministries";
import { isPostgresConfigured } from "@/lib/utils";

async function revalidateMinistryPages() {
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/users");
  revalidatePath("/admin/directives");
}

export async function listMinistriesAction() {
  const session = await getAuthSession();
  if (!session) return { success: false as const, error: "Unauthorized", ministries: [] };
  if (!isPostgresConfigured()) return { success: true as const, ministries: [] };
  const ministries = await pgListMinistries();
  return { success: true as const, ministries };
}

export async function saveMinistryAction(data: {
  id?: string;
  name: string;
  fullName?: string | null;
  description?: string | null;
  isActive?: boolean;
}) {
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

export async function ensureDefaultMinistriesAction() {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };
  await pgEnsureDefaultMinistries();
  await revalidateMinistryPages();
  return { success: true as const };
}
