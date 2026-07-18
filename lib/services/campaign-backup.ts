import { mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path, { basename } from "path";
import JSZip from "jszip";
import { pgGetCampaignBackupData } from "@/lib/db/repository-extended";
import { getSql } from "@/lib/db/client";
import * as pg from "@/lib/db/repository";
import { getBackupsDir, getUploadsDir, getUploadPublicUrl } from "@/lib/uploads";
import { generateId } from "@/lib/utils";

const BACKUP_FILENAME_RE = /^backup-[a-z0-9_-]+-\d{4}-\d{2}-\d{2}(?:T[\d-]+)?\.zip$/i;
const DEFAULT_RETENTION = 14;

export interface StoredCampaignBackup {
  filename: string;
  campaignId: string;
  campaignSlug: string;
  sizeBytes: number;
  createdAt: string;
  source: "manual" | "scheduled" | "unknown";
}

function getRetentionCount(): number {
  const raw = Number(process.env.BACKUP_RETENTION_COUNT ?? DEFAULT_RETENTION);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_RETENTION;
  return Math.floor(raw);
}

function sanitizeSlug(slug: string): string {
  const cleaned = slug.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return cleaned.replace(/^-+|-+$/g, "") || "campaign";
}

function campaignBackupDir(campaignSlug: string): string {
  return path.join(getBackupsDir(), sanitizeSlug(campaignSlug));
}

function buildBackupFilename(slug: string, createdAt = new Date()): string {
  const safeSlug = sanitizeSlug(slug);
  const date = createdAt.toISOString().slice(0, 10);
  const time = createdAt.toISOString().slice(11, 19).replace(/:/g, "-");
  return `backup-${safeSlug}-${date}T${time}.zip`;
}

export function isSafeBackupFilename(filename: string): boolean {
  const base = basename(filename);
  return base === filename && BACKUP_FILENAME_RE.test(base);
}

function extractFilenameFromUrl(url: string): string | null {
  const match = url.match(/\/api\/files\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export async function createCampaignBackupZip(campaignId: string): Promise<Buffer> {
  const backup = await pgGetCampaignBackupData(campaignId);
  if (!backup) {
    throw new Error("Campaign not found");
  }

  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(backup, null, 2));

  const uploadsDir = getUploadsDir();
  const fileUrls = new Set<string>();

  const collectUrl = (url?: string | null) => {
    if (!url) return;
    const filename = extractFilenameFromUrl(url);
    if (filename) fileUrls.add(filename);
  };

  for (const row of backup.billboards) {
    collectUrl(row.thumbnail_url);
    collectUrl(row.image_url);
  }
  for (const row of backup.posterVersions) {
    collectUrl(row.image_url);
    collectUrl(row.thumbnail_url);
  }
  for (const row of backup.videoVersions) {
    collectUrl(row.video_url);
    collectUrl(row.thumbnail_url);
  }
  for (const row of backup.files) {
    collectUrl(row.file_url);
  }
  for (const row of backup.socialPosts) {
    collectUrl(row.cover_image_url);
    collectUrl(row.media_url);
  }
  for (const row of backup.broadcastReports) {
    collectUrl(row.pdf_url);
  }

  const filesFolder = zip.folder("uploads");
  for (const filename of fileUrls) {
    try {
      const content = await readFile(`${uploadsDir}/${filename}`);
      filesFolder?.file(filename, content);
    } catch {
      // Skip missing files
    }
  }

  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

export async function importCampaignBackupZip(buffer: Buffer, targetCampaignId?: string) {
  const zip = await JSZip.loadAsync(buffer);
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error("manifest.json not found in backup");
  }

  const manifest = JSON.parse(await manifestFile.async("string"));
  const sql = getSql();
  const uploadsDir = getUploadsDir();
  const urlMap = new Map<string, string>();

  const uploadEntries = Object.keys(zip.files).filter((name) => name.startsWith("uploads/"));
  for (const entryName of uploadEntries) {
    const entry = zip.files[entryName];
    if (!entry.dir) {
      const originalName = basename(entryName);
      const newName = `${generateId()}${originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : ""}`;
      const content = await entry.async("nodebuffer");
      const { writeFile, mkdir } = await import("fs/promises");
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(`${uploadsDir}/${newName}`, content);
      urlMap.set(originalName, getUploadPublicUrl(newName));
    }
  }

  const remapUrl = (url?: string | null): string => {
    if (!url) return "";
    const filename = extractFilenameFromUrl(url);
    if (!filename) return url;
    return urlMap.get(filename) ?? url;
  };

  const campaignRow = manifest.campaign;
  const campaignId = targetCampaignId ?? generateId();

  await sql`
    INSERT INTO campaign_settings (
      id, slug, title, description, status, start_date, end_date,
      cover_image_url, published, features, analytics_config, billboard_config, updated_at
    ) VALUES (
      ${campaignId},
      ${targetCampaignId ? campaignRow.slug + "-imported" : campaignRow.slug},
      ${campaignRow.title},
      ${campaignRow.description ?? ""},
      ${campaignRow.status ?? "draft"},
      ${campaignRow.start_date},
      ${campaignRow.end_date},
      ${remapUrl(campaignRow.cover_image_url) || null},
      ${campaignRow.published ?? false},
      ${sql.json(campaignRow.features ?? {})},
      ${sql.json(campaignRow.analytics_config ?? {})},
      ${sql.json(campaignRow.billboard_config ?? {})},
      ${new Date().toISOString()}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      updated_at = EXCLUDED.updated_at
  `;

  const idMap = new Map<string, string>();
  const remapId = (oldId: string) => {
    if (!idMap.has(oldId)) idMap.set(oldId, generateId());
    return idMap.get(oldId)!;
  };

  for (const row of manifest.posterCategories ?? []) {
    const newId = remapId(row.id);
    await sql`
      INSERT INTO media_categories (id, campaign_id, type, title, description, sort_order, published, created_at)
      VALUES (${newId}, ${campaignId}, 'poster', ${row.title}, ${row.description}, ${row.sort_order ?? 0}, ${row.published ?? false}, ${row.created_at ?? new Date().toISOString()})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  for (const row of manifest.videoCategories ?? []) {
    const newId = remapId(row.id);
    await sql`
      INSERT INTO media_categories (id, campaign_id, type, title, description, sort_order, published, created_at)
      VALUES (${newId}, ${campaignId}, 'video', ${row.title}, ${row.description}, ${row.sort_order ?? 0}, ${row.published ?? false}, ${row.created_at ?? new Date().toISOString()})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  for (const row of manifest.billboards ?? []) {
    await sql`
      INSERT INTO billboards (
        id, campaign_id, title, description, city, location, date,
        thumbnail_url, image_url, external_url, published, sort_order, created_at, updated_at
      ) VALUES (
        ${generateId()}, ${campaignId}, ${row.title}, ${row.description}, ${row.city}, ${row.location}, ${row.date},
        ${remapUrl(row.thumbnail_url)}, ${remapUrl(row.image_url)}, ${row.external_url ?? ""},
        ${row.published ?? false}, ${row.sort_order ?? 0}, ${row.created_at ?? new Date().toISOString()}, ${new Date().toISOString()}
      )
    `;
  }

  for (const row of manifest.socialPosts ?? []) {
    await sql`
      INSERT INTO social_media_posts (
        id, campaign_id, platform, title, cover_image_url, views, likes, comments, shares,
        link, content_type, media_url, description, published_date, published, sort_order, created_at, updated_at
      ) VALUES (
        ${generateId()}, ${campaignId}, ${row.platform}, ${row.title}, ${remapUrl(row.cover_image_url)},
        ${row.views ?? 0}, ${row.likes ?? 0}, ${row.comments ?? 0}, ${row.shares ?? 0},
        ${row.link ?? ""}, ${row.content_type ?? "image"}, ${remapUrl(row.media_url)}, ${row.description},
        ${row.published_date ?? new Date().toISOString().split("T")[0]}, ${row.published ?? false},
        ${row.sort_order ?? 0}, ${new Date().toISOString()}, ${new Date().toISOString()}
      )
    `;
  }

  for (const row of manifest.broadcastReports ?? []) {
    await sql`
      INSERT INTO broadcast_reports (
        id, campaign_id, title, report_date, pdf_url, file_name, summary_data, published, sort_order, created_at, updated_at
      ) VALUES (
        ${generateId()}, ${campaignId}, ${row.title}, ${row.report_date},
        ${remapUrl(row.pdf_url)}, ${row.file_name}, ${sql.json(row.summary_data ?? {})},
        ${row.published ?? false}, ${row.sort_order ?? 0}, ${new Date().toISOString()}, ${new Date().toISOString()}
      )
    `;
  }

  return { success: true, campaignId };
}

async function pruneOldBackups(dir: string): Promise<void> {
  const retention = getRetentionCount();
  const entries = await readdir(dir);
  const zipNames = entries.filter((name) => isSafeBackupFilename(name)).sort().reverse();
  for (const obsolete of zipNames.slice(retention)) {
    await unlink(path.join(dir, obsolete)).catch(() => undefined);
  }
}

export async function saveCampaignBackupZip(
  campaignId: string,
  options?: { source?: "manual" | "scheduled" }
): Promise<StoredCampaignBackup> {
  const campaign = await pg.pgGetCampaignById(campaignId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const zipBuffer = await createCampaignBackupZip(campaignId);
  const createdAt = new Date();
  const filename = buildBackupFilename(campaign.slug, createdAt);
  const dir = campaignBackupDir(campaign.slug);

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), zipBuffer);
  await pruneOldBackups(dir);

  return {
    filename,
    campaignId: campaign.id,
    campaignSlug: campaign.slug,
    sizeBytes: zipBuffer.byteLength,
    createdAt: createdAt.toISOString(),
    source: options?.source ?? "manual",
  };
}

export async function listStoredCampaignBackups(
  campaignId: string
): Promise<StoredCampaignBackup[]> {
  const campaign = await pg.pgGetCampaignById(campaignId);
  if (!campaign) return [];

  const dir = campaignBackupDir(campaign.slug);
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const backups: StoredCampaignBackup[] = [];
  for (const filename of entries) {
    if (!isSafeBackupFilename(filename)) continue;
    try {
      const info = await stat(path.join(dir, filename));
      if (!info.isFile()) continue;
      backups.push({
        filename,
        campaignId: campaign.id,
        campaignSlug: campaign.slug,
        sizeBytes: info.size,
        createdAt: info.mtime.toISOString(),
        source: "unknown",
      });
    } catch {
      // Skip unreadable files
    }
  }

  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function resolveStoredBackupPath(
  campaignId: string,
  filename: string
): Promise<{ absolutePath: string; campaignSlug: string } | null> {
  if (!isSafeBackupFilename(filename)) return null;

  const campaign = await pg.pgGetCampaignById(campaignId);
  if (!campaign) return null;

  const absolutePath = path.join(campaignBackupDir(campaign.slug), basename(filename));
  try {
    const info = await stat(absolutePath);
    if (!info.isFile()) return null;
  } catch {
    return null;
  }

  return { absolutePath, campaignSlug: campaign.slug };
}

export async function runDailyCampaignBackups(): Promise<{
  created: StoredCampaignBackup[];
  failed: Array<{ campaignId: string; slug: string; error: string }>;
}> {
  const campaigns = await pg.pgGetAllCampaigns();
  const created: StoredCampaignBackup[] = [];
  const failed: Array<{ campaignId: string; slug: string; error: string }> = [];

  for (const campaign of campaigns) {
    try {
      const backup = await saveCampaignBackupZip(campaign.id, { source: "scheduled" });
      created.push(backup);
    } catch (error) {
      failed.push({
        campaignId: campaign.id,
        slug: campaign.slug,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { created, failed };
}
