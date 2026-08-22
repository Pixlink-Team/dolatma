import { createHash } from "crypto";
import { execFile } from "child_process";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path, { basename } from "path";
import { promisify } from "util";
import JSZip from "jszip";
import { getBackupsDir, getUploadsDir } from "@/lib/uploads";

const execFileAsync = promisify(execFile);

const SYSTEM_BACKUP_DIR = "system";
const SYSTEM_BACKUP_FILENAME_RE =
  /^system-backup-\d{4}-\d{2}-\d{2}T[\d-]+\.zip$/i;
const DEFAULT_RETENTION = 7;
const MANIFEST_VERSION = 1;

export interface SystemBackupManifest {
  version: number;
  type: "system-backup";
  exportedAt: string;
  database: {
    path: string;
    sha256: string;
    sizeBytes: number;
  };
  uploads: {
    fileCount: number;
    totalBytes: number;
    files: Array<{ path: string; sha256: string; sizeBytes: number }>;
  };
  restoreHint: string;
}

export interface StoredSystemBackup {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  sha256: string;
  source: "manual" | "scheduled" | "unknown";
  databaseSizeBytes: number;
  uploadsFileCount: number;
  uploadsTotalBytes: number;
}

function getSystemBackupRoot(): string {
  return path.join(getBackupsDir(), SYSTEM_BACKUP_DIR);
}

function getRetentionCount(): number {
  const raw = Number(process.env.SYSTEM_BACKUP_RETENTION_COUNT ?? DEFAULT_RETENTION);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_RETENTION;
  return Math.floor(raw);
}

function buildBackupFilename(createdAt = new Date()): string {
  const date = createdAt.toISOString().slice(0, 10);
  const time = createdAt.toISOString().slice(11, 19).replace(/:/g, "-");
  return `system-backup-${date}T${time}.zip`;
}

function metaFilename(zipFilename: string): string {
  return `${zipFilename}.meta.json`;
}

function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function sha256File(absolutePath: string): Promise<string> {
  const content = await readFile(absolutePath);
  return sha256Buffer(content);
}

export function isSafeSystemBackupFilename(filename: string): boolean {
  const base = basename(filename);
  return base === filename && SYSTEM_BACKUP_FILENAME_RE.test(base);
}

async function runPgDump(): Promise<Buffer> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const { stdout } = await execFileAsync(
    "pg_dump",
    ["--no-owner", "--no-acl", "--encoding=UTF8", databaseUrl],
    {
      maxBuffer: 512 * 1024 * 1024,
      env: process.env,
    }
  );

  return Buffer.from(stdout, "utf8");
}

async function collectUploadFiles(): Promise<Array<{ relativePath: string; absolutePath: string }>> {
  const uploadsDir = getUploadsDir();
  const files: Array<{ relativePath: string; absolutePath: string }> = [];

  async function walk(currentDir: string, prefix = "uploads"): Promise<void> {
    let entries: string[] = [];
    try {
      entries = await readdir(currentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry);
      const info = await stat(absolutePath);
      const relativePath = `${prefix}/${entry}`;
      if (info.isDirectory()) {
        await walk(absolutePath, relativePath);
      } else if (info.isFile()) {
        files.push({ relativePath, absolutePath });
      }
    }
  }

  await walk(uploadsDir);
  return files;
}

export async function createSystemBackupZip(): Promise<{
  zipBuffer: Buffer;
  manifest: SystemBackupManifest;
}> {
  const exportedAt = new Date().toISOString();
  const databaseBuffer = await runPgDump();
  const databaseSha256 = sha256Buffer(databaseBuffer);

  const uploadEntries = await collectUploadFiles();
  const uploadManifestFiles: SystemBackupManifest["uploads"]["files"] = [];
  let uploadsTotalBytes = 0;

  const zip = new JSZip();
  zip.file("database.sql", databaseBuffer);

  for (const entry of uploadEntries) {
    const content = await readFile(entry.absolutePath);
    uploadsTotalBytes += content.byteLength;
    uploadManifestFiles.push({
      path: entry.relativePath,
      sha256: sha256Buffer(content),
      sizeBytes: content.byteLength,
    });
    zip.file(entry.relativePath, content);
  }

  const manifest: SystemBackupManifest = {
    version: MANIFEST_VERSION,
    type: "system-backup",
    exportedAt,
    database: {
      path: "database.sql",
      sha256: databaseSha256,
      sizeBytes: databaseBuffer.byteLength,
    },
    uploads: {
      fileCount: uploadManifestFiles.length,
      totalBytes: uploadsTotalBytes,
      files: uploadManifestFiles,
    },
    restoreHint:
      "Extract ZIP, restore database.sql with psql, then copy uploads/ to UPLOAD_DIR. Verify component sha256 values before restore.",
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  const zipBuffer = Buffer.from(
    await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } })
  );

  return { zipBuffer, manifest };
}

async function pruneOldSystemBackups(dir: string): Promise<void> {
  const retention = getRetentionCount();
  const entries = await readdir(dir);
  const zipNames = entries.filter((name) => isSafeSystemBackupFilename(name)).sort().reverse();

  for (const obsolete of zipNames.slice(retention)) {
    await unlink(path.join(dir, obsolete)).catch(() => undefined);
    await unlink(path.join(dir, metaFilename(obsolete))).catch(() => undefined);
  }
}

export async function saveSystemBackup(
  options?: { source?: "manual" | "scheduled" }
): Promise<StoredSystemBackup> {
  const { zipBuffer, manifest } = await createSystemBackupZip();
  const createdAt = new Date();
  const filename = buildBackupFilename(createdAt);
  const dir = getSystemBackupRoot();

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), zipBuffer);

  const stored: StoredSystemBackup = {
    filename,
    sizeBytes: zipBuffer.byteLength,
    createdAt: createdAt.toISOString(),
    sha256: sha256Buffer(zipBuffer),
    source: options?.source ?? "manual",
    databaseSizeBytes: manifest.database.sizeBytes,
    uploadsFileCount: manifest.uploads.fileCount,
    uploadsTotalBytes: manifest.uploads.totalBytes,
  };

  await writeFile(path.join(dir, metaFilename(filename)), JSON.stringify(stored, null, 2), "utf8");
  await pruneOldSystemBackups(dir);

  return stored;
}

async function readStoredMeta(dir: string, filename: string): Promise<StoredSystemBackup | null> {
  try {
    const raw = await readFile(path.join(dir, metaFilename(filename)), "utf8");
    const parsed = JSON.parse(raw) as StoredSystemBackup;
    if (!parsed.filename || !parsed.sha256) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function listStoredSystemBackups(): Promise<StoredSystemBackup[]> {
  const dir = getSystemBackupRoot();
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const backups: StoredSystemBackup[] = [];
  for (const filename of entries) {
    if (!isSafeSystemBackupFilename(filename)) continue;
    try {
      const info = await stat(path.join(dir, filename));
      if (!info.isFile()) continue;

      const meta =
        (await readStoredMeta(dir, filename)) ??
        ({
          filename,
          sizeBytes: info.size,
          createdAt: info.mtime.toISOString(),
          sha256: await sha256File(path.join(dir, filename)),
          source: "unknown",
          databaseSizeBytes: 0,
          uploadsFileCount: 0,
          uploadsTotalBytes: 0,
        } as StoredSystemBackup);

      backups.push({
        ...meta,
        filename,
        sizeBytes: info.size,
        createdAt: meta.createdAt || info.mtime.toISOString(),
      });
    } catch {
      // Skip unreadable files
    }
  }

  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function resolveSystemBackupPath(
  filename: string
): Promise<string | null> {
  if (!isSafeSystemBackupFilename(filename)) return null;

  const absolutePath = path.join(getSystemBackupRoot(), basename(filename));
  try {
    const info = await stat(absolutePath);
    if (!info.isFile()) return null;
    return absolutePath;
  } catch {
    return null;
  }
}

export async function deleteStoredSystemBackup(
  filename: string
): Promise<{ deleted: true; filename: string } | null> {
  const absolutePath = await resolveSystemBackupPath(filename);
  if (!absolutePath) return null;

  await unlink(absolutePath);
  await unlink(path.join(getSystemBackupRoot(), metaFilename(basename(filename)))).catch(
    () => undefined
  );

  return { deleted: true, filename: basename(filename) };
}

export async function runDailySystemBackup(): Promise<StoredSystemBackup> {
  return saveSystemBackup({ source: "scheduled" });
}
