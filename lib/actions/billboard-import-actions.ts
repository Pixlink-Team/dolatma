"use server";

import { revalidatePath } from "next/cache";
import { saveBillboard } from "@/lib/data-access/admin";
import {
  fetchAllExternalBillboards,
  fetchExternalCampaigns,
  mapExternalBillboardToLocal,
} from "@/lib/services/billboard-api";
import { getExternalBillboardTag } from "@/lib/models/billboard-api";
import type { ExternalBillboard, ExternalCampaign } from "@/lib/models/billboard-api";
import type { Billboard } from "@/lib/types";

export async function fetchExternalCampaignsAction(): Promise<{
  success: boolean;
  campaigns?: ExternalCampaign[];
  error?: string;
}> {
  try {
    const campaigns = await fetchExternalCampaigns();
    return { success: true, campaigns };
  } catch (error) {
    console.error("fetchExternalCampaignsAction failed:", error);
    return { success: false, error: "دریافت کمپین‌ها از Map Bilboard با خطا مواجه شد" };
  }
}

export async function fetchExternalBillboardsAction(externalCampaignId: string): Promise<{
  success: boolean;
  billboards?: ExternalBillboard[];
  error?: string;
}> {
  try {
    const billboards = await fetchAllExternalBillboards(externalCampaignId);
    return { success: true, billboards };
  } catch (error) {
    console.error("fetchExternalBillboardsAction failed:", error);
    return { success: false, error: "دریافت بیلبوردها با خطا مواجه شد" };
  }
}

function isAlreadyImported(existing: Billboard[], externalId: string): boolean {
  const tag = getExternalBillboardTag(externalId);
  return existing.some((billboard) => billboard.tags.includes(tag));
}

export async function importExternalBillboardsAction(input: {
  campaignId: string;
  externalCampaignId: string;
  externalBillboardIds: string[];
  existingBillboards: Billboard[];
  campaignEndDate?: string;
}): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  error?: string;
}> {
  const { campaignId, externalCampaignId, externalBillboardIds, existingBillboards, campaignEndDate } =
    input;

  if (!campaignId || !externalCampaignId || externalBillboardIds.length === 0) {
    return { success: false, imported: 0, skipped: 0, error: "اطلاعات ورودی ناقص است" };
  }

  try {
    const externalBillboards = await fetchAllExternalBillboards(externalCampaignId);
    const selected = externalBillboards.filter((item) => externalBillboardIds.includes(item.id));

    let imported = 0;
    let skipped = 0;
    let sortOrder = existingBillboards.length;

    for (const external of selected) {
      if (isAlreadyImported(existingBillboards, external.id)) {
        skipped += 1;
        continue;
      }

      sortOrder += 1;
      const payload = mapExternalBillboardToLocal(external, campaignId, {
        date: campaignEndDate,
        sortOrder,
        published: true,
      });

      await saveBillboard(payload);
      imported += 1;
    }

    revalidatePath("/admin/billboards");
    revalidatePath("/");

    return { success: true, imported, skipped };
  } catch (error) {
    console.error("importExternalBillboardsAction failed:", error);
    return {
      success: false,
      imported: 0,
      skipped: 0,
      error: "واردات بیلبوردها با خطا مواجه شد",
    };
  }
}
