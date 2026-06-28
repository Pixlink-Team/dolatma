"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, getOwnerFilter, isFullAdmin } from "@/lib/auth/get-session";
import * as pgExt from "@/lib/db/repository-extended";
import type { BroadcastReport, SocialMediaPost } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

async function revalidateExtended(slug?: string) {
  revalidatePath("/admin/social-posts");
  revalidatePath("/admin/broadcast");
  revalidatePath("/admin/users");
  if (slug) revalidatePath(`/campaign/${slug}`);
}

export async function saveSocialPostAction(data: Partial<SocialMediaPost> & { id?: string }) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const ownerUserId = isFullAdmin(session) ? (data.ownerUserId ?? null) : session.userId;
  const payload = { ...data, ownerUserId };

  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  const result = await pgExt.pgSaveSocialPost(payload);
  await revalidateExtended();
  return result;
}

export async function deleteSocialPostAction(id: string) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };
  await pgExt.pgDeleteSocialPost(id);
  await revalidateExtended();
  return { success: true };
}

export async function saveBroadcastReportAction(data: Partial<BroadcastReport> & { id?: string }) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const ownerUserId = isFullAdmin(session) ? (data.ownerUserId ?? null) : session.userId;
  const payload = { ...data, ownerUserId };

  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  const result = await pgExt.pgSaveBroadcastReport(payload);
  await revalidateExtended();
  return result;
}

export async function deleteBroadcastReportAction(id: string) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };
  await pgExt.pgDeleteBroadcastReport(id);
  await revalidateExtended();
  return { success: true };
}

export async function saveUserAction(data: {
  id?: string;
  email: string;
  name: string;
  role: "admin" | "contributor";
  password?: string;
  campaignIds?: string[];
}) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };
  const result = await pgExt.pgSaveUser(data);
  await revalidateExtended();
  return result;
}

export async function deleteUserAction(id: string) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false, error: "Database required" };
  await pgExt.pgDeleteUser(id);
  await revalidateExtended();
  return { success: true };
}

export async function getSessionContextAction() {
  const session = await getAuthSession();
  if (!session) return null;

  if (session.type === "db_user" && session.userId) {
    const user = await pgExt.pgGetUserById(session.userId);
    return {
      ...session,
      email: user?.email,
      name: user?.name,
      campaignIds: user?.campaignIds ?? [],
    };
  }

  return {
    ...session,
    email: process.env.ADMIN_EMAIL ?? "admin",
    name: "مدیر سیستم",
    campaignIds: [] as string[],
  };
}

export { getOwnerFilter, isFullAdmin };
