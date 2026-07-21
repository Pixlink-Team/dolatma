"use server";

import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgListCalendarCampaigns,
  pgListCalendarDirectives,
} from "@/lib/db/repository-directives";
import { detectCalendarConflict } from "@/lib/directive-funnel";
import { isPostgresConfigured } from "@/lib/utils";
import * as pgExt from "@/lib/db/repository-extended";

export async function getNationalCalendarAction(campaignId?: string | null) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false as const, error: "Unauthorized", campaigns: [], directives: [], conflicts: [] };
  }
  if (!isFullAdmin(session) && session.role !== "client") {
    if (!session.userId || !isPostgresConfigured()) {
      return {
        success: false as const,
        error: "Unauthorized",
        campaigns: [],
        directives: [],
        conflicts: [],
      };
    }
    // All panel users can view calendar; membership optional for global view.
  }
  if (!isPostgresConfigured()) {
    return {
      success: false as const,
      error: "Database required",
      campaigns: [],
      directives: [],
      conflicts: [],
    };
  }

  const [campaigns, directives] = await Promise.all([
    pgListCalendarCampaigns(),
    pgListCalendarDirectives(campaignId),
  ]);

  const conflicts: Array<{
    aId: string;
    aTitle: string;
    aKind: "campaign" | "directive";
    bId: string;
    bTitle: string;
    bKind: "campaign" | "directive";
  }> = [];

  // Directive ↔ directive conflicts (same device + province + topic + dates)
  for (let i = 0; i < directives.length; i++) {
    for (let j = i + 1; j < directives.length; j++) {
      const a = directives[i];
      const b = directives[j];
      if (
        detectCalendarConflict({
          deviceId: a.deviceId,
          provinces: a.provinces,
          topic: a.topic,
          startDate: a.startDate,
          endDate: a.endDate,
          other: {
            deviceId: b.deviceId,
            provinces: b.provinces,
            topic: b.topic,
            startDate: b.startDate,
            endDate: b.endDate,
          },
        })
      ) {
        conflicts.push({
          aId: a.id,
          aTitle: a.title,
          aKind: "directive",
          bId: b.id,
          bTitle: b.title,
          bKind: "directive",
        });
      }
    }
  }

  return { success: true as const, campaigns, directives, conflicts };
}

export async function checkDirectiveCalendarConflictAction(input: {
  campaignId: string;
  excludeId?: string | null;
  deviceId?: string | null;
  provinces?: string[];
  topic?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}) {
  const session = await getAuthSession();
  if (!session) return { success: false as const, conflicts: [], error: "Unauthorized" };
  if (!isPostgresConfigured()) {
    return { success: false as const, conflicts: [], error: "Database required" };
  }
  if (!isFullAdmin(session) && session.userId) {
    const membership = await pgExt.pgGetUserPermissionsForCampaign(
      session.userId,
      input.campaignId
    );
    if (!membership && session.role !== "client") {
      return { success: false as const, conflicts: [], error: "دسترسی ندارید" };
    }
  }

  const directives = await pgListCalendarDirectives(input.campaignId);
  const conflicts = directives
    .filter((item) => item.id !== input.excludeId)
    .filter((item) =>
      detectCalendarConflict({
        deviceId: input.deviceId,
        provinces: input.provinces,
        topic: input.topic,
        startDate: input.startDate,
        endDate: input.endDate,
        other: {
          deviceId: item.deviceId,
          provinces: item.provinces,
          topic: item.topic,
          startDate: item.startDate,
          endDate: item.endDate,
        },
      })
    )
    .map((item) => ({ id: item.id, title: item.title }));

  return { success: true as const, conflicts };
}
