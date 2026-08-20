"use server";

import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgGetUserPermissionsForCampaign } from "@/lib/db/repository-extended";
import { pgListPublishableProductions } from "@/lib/db/repository-production-source";
import {
  assertProductionSourceAllowed,
  type PublishableProductionItem,
  type ProductionSourceFields,
} from "@/lib/production-source";
import type { AuthSession } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

async function assertCampaignAccess(campaignId: string): Promise<
  | { session: AuthSession; error: null }
  | { session: null; error: string }
> {
  const session = await getAuthSession();
  if (!session) return { session: null, error: "Unauthorized" };

  if (isFullAdmin(session) || session.role === "client" || session.role === "reis") {
    return { session, error: null };
  }

  if (!session.userId || !isPostgresConfigured()) {
    return { session: null, error: "Unauthorized" };
  }

  const permissions = await pgGetUserPermissionsForCampaign(session.userId, campaignId);
  if (!permissions) return { session: null, error: "دسترسی به این کمپین ندارید" };

  return { session, error: null };
}

/** Thin helper for forms that already have a session — re-exports assertProductionSourceAllowed. */
export async function assertProductionSourceAllowedForSession(
  session: AuthSession,
  campaignId: string,
  data: ProductionSourceFields & { id?: string }
) {
  return assertProductionSourceAllowed(session, campaignId, data);
}

export async function listPublishableProductionsAction(
  campaignId: string
): Promise<{ success: boolean; items: PublishableProductionItem[]; error?: string }> {
  const access = await assertCampaignAccess(campaignId);
  if (access.error || !access.session) {
    return { success: false, items: [], error: access.error };
  }

  if (!isPostgresConfigured()) {
    return { success: false, items: [], error: "Database required" };
  }

  const session = access.session;
  const includeAllOwners =
    isFullAdmin(session) || session.role === "client" || session.role === "reis";

  const items = await pgListPublishableProductions(
    campaignId,
    includeAllOwners ? null : session.userId,
    { includeAllOwners }
  );

  return { success: true, items };
}
