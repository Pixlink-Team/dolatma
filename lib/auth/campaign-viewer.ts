import type { AuthSession } from "@/lib/types";
import { pgGetUserById } from "@/lib/db/repository-extended";
import { isPostgresConfigured } from "@/lib/utils";

export type CampaignAuthViewer = {
  name: string;
  hasProfile: boolean;
};

export async function resolveCampaignAuthViewer(
  session: AuthSession | null
): Promise<CampaignAuthViewer | null> {
  if (!session) return null;

  if (session.type === "db_user" && session.userId && isPostgresConfigured()) {
    const user = await pgGetUserById(session.userId);
    const name = user?.name?.trim() || user?.email?.trim() || "کاربر";
    return {
      name,
      hasProfile: true,
    };
  }

  return {
    name: session.name?.trim() || "مدیر سیستم",
    hasProfile: Boolean(session.userId),
  };
}
