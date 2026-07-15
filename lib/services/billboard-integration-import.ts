import { getBillboardExternalMapId } from "@/lib/billboards";
import { pgSaveBillboard } from "@/lib/db/repository";
import {
  fetchCampaignIntegration,
  mapIntegrationBillboardToBillboard,
} from "@/lib/services/billboard-api";
import { matchOwnerToUser } from "@/lib/services/owner-user-match";
import type { AdminUser, Billboard } from "@/lib/types";
import { generateId } from "@/lib/utils";

export interface IntegrationBillboardImportResult {
  imported: number;
  updated: number;
  skippedAdmin: number;
  unmatchedOwners: string[];
  matchedUsers: number;
  total: number;
}

function indexByExternalId(dbBillboards: Billboard[]): Map<string, Billboard> {
  const map = new Map<string, Billboard>();
  for (const billboard of dbBillboards) {
    const externalId = getBillboardExternalMapId(billboard);
    if (externalId && !map.has(externalId)) {
      map.set(externalId, billboard);
    }
  }
  return map;
}

export async function importIntegrationBillboards(params: {
  campaignId: string;
  externalCampaignSlug: string;
  users: AdminUser[];
  dbBillboards: Billboard[];
}): Promise<IntegrationBillboardImportResult> {
  const integration = await fetchCampaignIntegration(params.externalCampaignSlug);
  const existingByExternalId = indexByExternalId(params.dbBillboards);

  let imported = 0;
  let updated = 0;
  let skippedAdmin = 0;
  let matchedUsers = 0;
  let sortOrder = params.dbBillboards.length;
  const unmatchedOwners = new Set<string>();

  for (const item of integration.billboards) {
    if (!item.owner) {
      skippedAdmin += 1;
      continue;
    }

    const matchedUser = matchOwnerToUser(item.owner, params.users);
    if (matchedUser) {
      matchedUsers += 1;
    } else {
      unmatchedOwners.add(item.owner.name || item.owner.email || item.owner.username);
    }

    const existing = existingByExternalId.get(item.billboard_id);

    // Re-import existing billboards to refresh resolved province/city and API data.
    if (existing) {
      const mapped = mapIntegrationBillboardToBillboard(item, params.campaignId, {
        sortOrder: existing.sortOrder,
        published: existing.published,
        matchedUser,
        source: "manual",
      });

      await pgSaveBillboard({
        ...mapped,
        id: existing.id,
        source: "manual",
        ownerUserId: mapped.ownerUserId ?? existing.ownerUserId ?? null,
      });

      updated += 1;
      continue;
    }

    sortOrder += 1;
    const mapped = mapIntegrationBillboardToBillboard(item, params.campaignId, {
      sortOrder,
      published: true,
      matchedUser,
      source: "manual",
    });

    await pgSaveBillboard({
      ...mapped,
      id: generateId(),
    });

    imported += 1;
  }

  return {
    imported,
    updated,
    skippedAdmin,
    unmatchedOwners: [...unmatchedOwners].sort((a, b) => a.localeCompare(b, "fa")),
    matchedUsers,
    total: integration.billboards.length,
  };
}
