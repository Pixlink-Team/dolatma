"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/lib/auth/get-session";
import { pgMarkNotificationReads } from "@/lib/db/repository-extended";

export async function markNotificationsSeenAction(
  campaignId: string,
  contentKeys: string[],
  confirmed = false
) {
  const session = await getAuthSession();
  if (!session?.userId && session?.type !== "env_admin") {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.userId ?? "env_admin";
  await pgMarkNotificationReads(userId, contentKeys, confirmed);
  revalidatePath("/admin/notifications");
  return { success: true };
}
