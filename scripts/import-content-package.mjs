#!/usr/bin/env node
/**
 * Import a content package (فهرست.xlsx + images/) as a contributor user and publish items.
 *
 * Usage:
 *   set DATABASE_URL=postgres://...
 *   set CAMPAIGN_SLUG=your-campaign-slug
 *   node scripts/import-content-package.mjs "C:\Users\Pix-01\Downloads\بسته"
 *
 * Optional env:
 *   USER_NAME=سازمان انرژی اتمی
 *   USER_USERNAME=aeoi
 *   USER_PASSWORD=Aeoi1405!
 *   UPLOAD_DIR=./data/uploads
 *   PROVINCE=تهران
 *   CITY=تهران
 */
import { createHash, randomUUID } from "crypto";
import { copyFile, mkdir, readFile } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import * as XLSX from "xlsx";

const DATABASE_URL = process.env.DATABASE_URL;
const CAMPAIGN_SLUG = (process.env.CAMPAIGN_SLUG || "").trim();
const PACKAGE_DIR = path.resolve(process.argv[2] || process.env.PACKAGE_DIR || "");
const USER_NAME = (process.env.USER_NAME || "سازمان انرژی اتمی").trim();
const USER_USERNAME = (process.env.USER_USERNAME || "aeoi").trim().toLowerCase();
const USER_PASSWORD = process.env.USER_PASSWORD || "Aeoi1405!";
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");
const PROVINCE = (process.env.PROVINCE || "تهران").trim();
const CITY = (process.env.CITY || "تهران").trim();
const TODAY = new Date().toISOString().slice(0, 10);

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
if (!CAMPAIGN_SLUG) {
  console.error("CAMPAIGN_SLUG is required");
  process.exit(1);
}
if (!PACKAGE_DIR) {
  console.error("Package directory argument is required");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

const defaultPermissions = {
  billboards: true,
  posters: true,
  videos: true,
  files: true,
  rawMedia: true,
  analytics: true,
  socialPosts: true,
  sitePublications: true,
  broadcast: true,
  meetings: true,
  activities: true,
  submissions: true,
  directives: true,
};

function normalizeEmail(usernameOrEmail) {
  const value = usernameOrEmail.trim().toLowerCase();
  if (!value) return value;
  if (value.includes("@")) return value;
  return `${value}@example.com`;
}

function extOf(fileName) {
  const match = fileName.match(/(\.[a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : ".jpg";
}

function detectSocialPlatform(location) {
  const text = location || "";
  if (/اینستاگرام|instagram/i.test(text)) return "instagram";
  if (/تلگرام|telegram/i.test(text)) return "telegram";
  if (/\bایکس\b|\bx\b|توییتر|twitter/i.test(text)) return "x";
  if (/بله|bale/i.test(text)) return "bale";
  if (/سایت|پورتال|website|intranet/i.test(text)) return "site";
  if (/ویراست/i.test(text)) return "other";
  return "other";
}

function mapType(raw) {
  const value = String(raw || "").trim();
  if (value.includes("بیلبورد")) return "billboard";
  if (value.includes("شبکه")) return "social";
  if (value.includes("اقدام")) return "activity";
  return null;
}

async function copyUpload(sourcePath, originalName) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = `${randomUUID()}${extOf(originalName)}`;
  const dest = path.join(UPLOAD_DIR, storedName);
  await copyFile(sourcePath, dest);
  return `/api/files/${storedName}`;
}

function readRows(excelPath) {
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
  if (!matrix.length) return [];

  const header = matrix[0].map((cell) => String(cell).trim());
  const indexOf = (label) => header.findIndex((h) => h === label || h.includes(label));

  const titleIdx = indexOf("عنوان");
  const locationIdx = indexOf("مکان");
  const typeIdx = indexOf("نوع");
  const fileIdx = indexOf("نام_فایل_عکس");
  const deviceIdx = indexOf("دستگاه");

  const rows = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const line = matrix[i];
    if (!Array.isArray(line)) continue;
    const title = String(line[titleIdx] ?? "").trim();
    const location = String(line[locationIdx] ?? "").trim();
    const type = mapType(line[typeIdx]);
    const fileName = String(line[fileIdx] ?? "").trim();
    const device = deviceIdx >= 0 ? String(line[deviceIdx] ?? "").trim() : "";
    if (!title || !type || !fileName) continue;
    rows.push({ title, location, type, fileName, device });
  }
  return rows;
}

async function ensureUser() {
  const email = normalizeEmail(USER_USERNAME);
  const existing = await sql`SELECT id, name FROM users WHERE email = ${email} LIMIT 1`;
  if (existing[0]) {
    console.log(`User exists: ${existing[0].name} (${email})`);
    return String(existing[0].id);
  }

  const id = randomUUID().replace(/-/g, "").slice(0, 24);
  const passwordHash = await bcrypt.hash(USER_PASSWORD, 10);
  const now = new Date().toISOString();
  await sql`
    INSERT INTO users (id, email, password_hash, name, role, province, city, created_at)
    VALUES (${id}, ${email}, ${passwordHash}, ${USER_NAME}, 'contributor', ${PROVINCE}, ${CITY}, ${now})
  `;
  console.log(`Created user: ${USER_NAME} / ${USER_USERNAME} / ${USER_PASSWORD}`);
  return id;
}

async function ensureCampaignAccess(userId, campaignId) {
  const now = new Date().toISOString();
  await sql`
    INSERT INTO user_campaign_access (user_id, campaign_id, permissions, created_at)
    VALUES (
      ${userId},
      ${campaignId},
      ${sql.json(defaultPermissions)},
      ${now}
    )
    ON CONFLICT (user_id, campaign_id) DO UPDATE SET
      permissions = EXCLUDED.permissions
  `;
}

async function main() {
  const excelPath = path.join(PACKAGE_DIR, "فهرست.xlsx");
  const imagesDir = path.join(PACKAGE_DIR, "images");
  const rows = readRows(excelPath);
  if (rows.length === 0) {
    throw new Error("No valid rows found in فهرست.xlsx");
  }

  const campaigns = await sql`
    SELECT id, title, slug FROM campaign_settings WHERE slug = ${CAMPAIGN_SLUG} LIMIT 1
  `;
  if (!campaigns[0]) {
    throw new Error(`Campaign slug not found: ${CAMPAIGN_SLUG}`);
  }
  const campaignId = String(campaigns[0].id);
  console.log(`Campaign: ${campaigns[0].title} (${campaigns[0].slug})`);

  const userId = await ensureUser();
  await ensureCampaignAccess(userId, campaignId);

  let billboards = 0;
  let social = 0;
  let activities = 0;

  for (const row of rows) {
    const source = path.join(imagesDir, row.fileName);
    const publicUrl = await copyUpload(source, row.fileName);
    const id = randomUUID().replace(/-/g, "").slice(0, 24);
    const now = new Date().toISOString();
    const itemTitle = row.location ? `${row.title} — ${row.location}` : row.title;

    if (row.type === "billboard") {
      const countRows = await sql`
        SELECT COUNT(*)::int AS count FROM billboards WHERE campaign_id = ${campaignId}
      `;
      const sortOrder = (Number(countRows[0]?.count) || 0) + 1;
      await sql`
        INSERT INTO billboards (
          id, campaign_id, title, description, province, city, location, date,
          thumbnail_url, image_url, external_url, source, status, tags, notes,
          published, sort_order, owner_user_id, plan_labels, created_at, updated_at
        ) VALUES (
          ${id},
          ${campaignId},
          ${itemTitle},
          ${"نصب طرح گرافیکی"},
          ${PROVINCE},
          ${CITY},
          ${row.location || CITY},
          ${TODAY},
          ${publicUrl},
          ${publicUrl},
          ${""},
          ${"manual"},
          ${"published"},
          ${sql.array(["سازمان انرژی اتمی"])},
          ${null},
          ${true},
          ${sortOrder},
          ${userId},
          ${sql.json([])},
          ${now},
          ${now}
        )
      `;
      billboards += 1;
      continue;
    }

    if (row.type === "social") {
      const platform = detectSocialPlatform(row.location);
      const countRows = await sql`
        SELECT COUNT(*)::int AS count FROM social_media_posts WHERE campaign_id = ${campaignId}
      `;
      const sortOrder = (Number(countRows[0]?.count) || 0) + 1;
      await sql`
        INSERT INTO social_media_posts (
          id, campaign_id, owner_user_id, platform, title, cover_image_url,
          views, likes, comments, shares, link, content_type, media_url, description,
          published_date, published, sort_order, plan_labels, created_at, updated_at
        ) VALUES (
          ${id},
          ${campaignId},
          ${userId},
          ${platform},
          ${itemTitle},
          ${publicUrl},
          ${0}, ${0}, ${0}, ${0},
          ${""},
          ${"image"},
          ${publicUrl},
          ${row.location || null},
          ${TODAY},
          ${true},
          ${sortOrder},
          ${sql.json([])},
          ${now},
          ${now}
        )
      `;
      social += 1;
      continue;
    }

    if (row.type === "activity") {
      const countRows = await sql`
        SELECT COUNT(*)::int AS count FROM campaign_activities WHERE campaign_id = ${campaignId}
      `;
      const sortOrder = (Number(countRows[0]?.count) || 0) + 1;
      const mediaItems = [{ id: randomUUID(), type: "image", url: publicUrl }];
      await sql`
        INSERT INTO campaign_activities (
          id, campaign_id, owner_user_id, title, activity_type, activity_date,
          location, link, image_url, video_url, media_items, description,
          published, sort_order, plan_labels, created_at, updated_at
        ) VALUES (
          ${id},
          ${campaignId},
          ${userId},
          ${itemTitle},
          ${"field"},
          ${TODAY},
          ${row.location || CITY},
          ${""},
          ${publicUrl},
          ${null},
          ${sql.json(mediaItems)},
          ${"انتشار طرح گرافیکی"},
          ${true},
          ${sortOrder},
          ${sql.json([])},
          ${now},
          ${now}
        )
      `;
      activities += 1;
    }
  }

  const fingerprint = createHash("sha1")
    .update(rows.map((r) => r.fileName).join("|"))
    .digest("hex")
    .slice(0, 8);

  console.log("---");
  console.log(`Import done (${fingerprint})`);
  console.log(`Billboards: ${billboards}`);
  console.log(`Social posts: ${social}`);
  console.log(`Activities: ${activities}`);
  console.log(`Owner user: ${USER_NAME} / login: ${USER_USERNAME} / pass: ${USER_PASSWORD}`);
  console.log(`Uploads written to: ${UPLOAD_DIR}`);
  console.log("NOTE: If DB is remote, copy UPLOAD_DIR files to the server upload volume.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
