"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import * as pg from "@/lib/db/repository";
import {
  deleteAnalyticsMetric,
  deleteBillboard,
  deleteCampaign,
  deleteCampaignFile,
  deleteMediaCategory,
  deletePoster,
  deletePosterVersion,
  deleteSubmission,
  deleteVideo,
  deleteVideoVersion,
  saveAnalyticsMetric,
  saveBillboard,
  saveCampaign,
  saveCampaignFile,
  saveMediaCategory,
  savePoster,
  savePosterVersion,
  saveVideo,
  saveVideoVersion,
  updateCampaignSettings,
  updateSubmission,
} from "@/lib/data-access/admin";
import type {
  AnalyticsMetric,
  Billboard,
  CampaignFile,
  CampaignSettings,
  MediaCategory,
  Poster,
  PosterVersion,
  Video,
  VideoVersion,
} from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

async function revalidateAll(slug?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/campaigns");
  revalidatePath("/admin/billboards");
  revalidatePath("/admin/posters");
  revalidatePath("/admin/videos");
  revalidatePath("/admin/analytics");
  revalidatePath("/admin/social-posts");
  revalidatePath("/admin/broadcast");
  revalidatePath("/admin/submissions");
  revalidatePath("/admin/files");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/users");
  if (slug) revalidatePath(`/campaign/${slug}`);
}

async function withOwnerScope<T extends { ownerUserId?: string | null }>(data: T): Promise<T> {
  const session = await getAuthSession();
  if (!session || isFullAdmin(session)) return data;
  return { ...data, ownerUserId: session.userId };
}

async function assertContributorOwnsBillboard(
  billboardId: string
): Promise<{ success: false; error: string } | null> {
  const session = await getAuthSession();
  if (!session || isFullAdmin(session)) return null;
  if (!isPostgresConfigured()) return null;

  const billboard = await pg.pgGetBillboardById(billboardId);
  if (!billboard) return { success: false, error: "بیلبورد یافت نشد" };
  if (billboard.ownerUserId !== session.userId) {
    return { success: false, error: "دسترسی ندارید" };
  }
  return null;
}

export async function saveCampaignAction(data: Partial<CampaignSettings> & { id?: string }) {
  const result = await saveCampaign(data);
  await revalidateAll(data.slug);
  return result;
}

export async function deleteCampaignAction(id: string) {
  try {
    const result = await deleteCampaign(id);
    await revalidateAll();
    return result;
  } catch (error) {
    console.error("deleteCampaignAction failed:", error);
    return { success: false, error: "حذف کمپین با خطا مواجه شد" };
  }
}

export async function updateSettingsAction(data: Partial<CampaignSettings>) {
  const result = await updateCampaignSettings(data);
  await revalidateAll(data.slug);
  return result;
}

export async function saveBillboardAction(data: Partial<Billboard> & { id?: string }) {
  if (data.id) {
    const denied = await assertContributorOwnsBillboard(data.id);
    if (denied) return denied;
  }
  const result = await saveBillboard(await withOwnerScope(data));
  await revalidateAll();
  return result;
}

export async function deleteBillboardAction(id: string) {
  const denied = await assertContributorOwnsBillboard(id);
  if (denied) return denied;
  const result = await deleteBillboard(id);
  await revalidateAll();
  return result;
}

export async function saveCategoryAction(data: Partial<MediaCategory> & { id?: string }) {
  const result = await saveMediaCategory(data);
  await revalidateAll();
  return result;
}

export async function deleteCategoryAction(id: string, type: "poster" | "video") {
  const result = await deleteMediaCategory(id, type);
  await revalidateAll();
  return result;
}

export async function savePosterAction(data: Partial<Poster> & { id?: string }) {
  const result = await savePoster(await withOwnerScope(data));
  await revalidateAll();
  return result;
}

export async function deletePosterAction(id: string) {
  const result = await deletePoster(id);
  await revalidateAll();
  return result;
}

export async function savePosterVersionAction(
  data: Partial<PosterVersion> & { id?: string; posterId: string }
) {
  const result = await savePosterVersion(data);
  await revalidateAll();
  return result;
}

export async function deletePosterVersionAction(id: string) {
  const result = await deletePosterVersion(id);
  await revalidateAll();
  return result;
}

export async function saveVideoAction(data: Partial<Video> & { id?: string }) {
  const result = await saveVideo(await withOwnerScope(data));
  await revalidateAll();
  return result;
}

export async function deleteVideoAction(id: string) {
  const result = await deleteVideo(id);
  await revalidateAll();
  return result;
}

export async function saveVideoVersionAction(
  data: Partial<VideoVersion> & { id?: string; videoId: string }
) {
  const result = await saveVideoVersion(data);
  await revalidateAll();
  return result;
}

export async function deleteVideoVersionAction(id: string) {
  const result = await deleteVideoVersion(id);
  await revalidateAll();
  return result;
}

export async function saveAnalyticsAction(data: Partial<AnalyticsMetric> & { id?: string }) {
  const result = await saveAnalyticsMetric(await withOwnerScope(data));
  await revalidateAll();
  return result;
}

export async function deleteAnalyticsAction(id: string) {
  const result = await deleteAnalyticsMetric(id);
  await revalidateAll();
  return result;
}

export async function updateSubmissionAction(
  id: string,
  data: { status?: "pending" | "approved" | "rejected"; published?: boolean }
) {
  const result = await updateSubmission(id, data);
  await revalidateAll();
  return result;
}

export async function deleteSubmissionAction(id: string) {
  const result = await deleteSubmission(id);
  await revalidateAll();
  return result;
}

export async function saveCampaignFileAction(data: Partial<CampaignFile> & { id?: string }) {
  const result = await saveCampaignFile(await withOwnerScope(data));
  await revalidateAll();
  return result;
}

export async function deleteCampaignFileAction(id: string) {
  const result = await deleteCampaignFile(id);
  await revalidateAll();
  return result;
}
