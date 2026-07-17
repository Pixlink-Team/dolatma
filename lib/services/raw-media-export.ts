import { readFile } from "fs/promises";
import JSZip from "jszip";
import { formatPlanLabelDisplay, normalizePlanLabels } from "@/lib/content-topics";
import * as pg from "@/lib/db/repository";
import { getMockStoreForCampaign } from "@/lib/mock-data";
import { DEFAULT_ADMIN_OWNER_LABEL, resolveAdminOwnerLabel } from "@/lib/owner-groups";
import type { RawMediaUpload } from "@/lib/types";
import { getUploadsDir } from "@/lib/uploads";
import { isPostgresConfigured } from "@/lib/utils";

function extractFilenameFromUrl(url: string): string | null {
  const match = url.match(/\/api\/files\/([^/?#]+)/);
  return match?.[1] ?? null;
}

/** Sanitize a single zip path segment for Windows / zip compatibility. */
export function sanitizeZipPathSegment(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 100);
  return cleaned || "بدون-نام";
}

function resolveOwnerFolder(item: RawMediaUpload, adminLabel: string): string {
  if (item.ownerUserId) {
    return sanitizeZipPathSegment(item.ownerName?.trim() || "کاربر");
  }
  return sanitizeZipPathSegment(resolveAdminOwnerLabel(adminLabel));
}

function resolveTopicFolder(item: RawMediaUpload): string {
  const labels = normalizePlanLabels(item.planLabels, item.planLabel);
  if (labels.length === 0) return "بدون-موضوع";
  const display = labels.map((label) => formatPlanLabelDisplay(label)).join("، ");
  return sanitizeZipPathSegment(display);
}

function uniqueZipFileName(usedNames: Set<string>, folderPath: string, fileName: string, id: string): string {
  const safeName = sanitizeZipPathSegment(fileName) || `file-${id.slice(0, 8)}`;
  let candidate = `${folderPath}/${safeName}`;
  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return safeName;
  }

  const dot = safeName.lastIndexOf(".");
  const base = dot > 0 ? safeName.slice(0, dot) : safeName;
  const ext = dot > 0 ? safeName.slice(dot) : "";
  const withId = `${base}-${id.slice(0, 8)}${ext}`;
  candidate = `${folderPath}/${withId}`;
  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return withId;
  }

  let index = 2;
  while (usedNames.has(`${folderPath}/${base}-${index}${ext}`)) {
    index += 1;
  }
  const numbered = `${base}-${index}${ext}`;
  usedNames.add(`${folderPath}/${numbered}`);
  return numbered;
}

async function loadRawMediaForExport(
  campaignId: string,
  ownerUserId?: string | null
): Promise<{ items: RawMediaUpload[]; adminOwnerLabel: string; campaignSlug: string }> {
  if (isPostgresConfigured()) {
    const campaign = await pg.pgGetCampaignById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    const data = await pg.pgGetAdminData(campaignId, ownerUserId);
    return {
      items: data.rawMedia ?? [],
      adminOwnerLabel: campaign.adminOwnerLabel ?? DEFAULT_ADMIN_OWNER_LABEL,
      campaignSlug: campaign.slug,
    };
  }

  const store = getMockStoreForCampaign(campaignId);
  const items = (((store as { rawMedia?: RawMediaUpload[] }).rawMedia ?? []) as RawMediaUpload[]).filter(
    (item) => {
      if (ownerUserId === undefined) return true;
      return (item.ownerUserId ?? null) === ownerUserId;
    }
  );
  return {
    items,
    adminOwnerLabel: store.settings?.adminOwnerLabel ?? DEFAULT_ADMIN_OWNER_LABEL,
    campaignSlug: store.settings?.slug ?? campaignId,
  };
}

export interface RawMediaExportResult {
  buffer: Buffer;
  fileCount: number;
  skippedCount: number;
  campaignSlug: string;
}

/**
 * Build a ZIP of raw media files grouped as:
 * `{owner}/{topic}/{fileName}`
 */
export async function createRawMediaExportZip(
  campaignId: string,
  ownerUserId?: string | null
): Promise<RawMediaExportResult> {
  const { items, adminOwnerLabel, campaignSlug } = await loadRawMediaForExport(
    campaignId,
    ownerUserId
  );

  const zip = new JSZip();
  const uploadsDir = getUploadsDir();
  const usedNames = new Set<string>();
  let fileCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    const diskName = extractFilenameFromUrl(item.fileUrl);
    if (!diskName) {
      skippedCount += 1;
      continue;
    }

    const ownerFolder = resolveOwnerFolder(item, adminOwnerLabel);
    const topicFolder = resolveTopicFolder(item);
    const folderPath = `${ownerFolder}/${topicFolder}`;
    const zipFileName = uniqueZipFileName(usedNames, folderPath, item.fileName || diskName, item.id);

    try {
      const content = await readFile(`${uploadsDir}/${diskName}`);
      zip.folder(folderPath)?.file(zipFileName, content);
      fileCount += 1;
    } catch {
      skippedCount += 1;
    }
  }

  if (fileCount === 0) {
    throw new Error(skippedCount > 0 ? "No readable raw media files found" : "No raw media files to export");
  }

  const buffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  return { buffer, fileCount, skippedCount, campaignSlug };
}
