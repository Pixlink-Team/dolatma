/**
 * One-shot migration: pull published calendar data from legacy Laravel taghvim API
 * into local dolatma Postgres taghvim_* tables.
 *
 * Usage:
 *   node scripts/migrate-taghvim-from-laravel.mjs
 *
 * Env:
 *   DATABASE_URL              (required)
 *   TAGHVIM_LEGACY_API_URL    default https://taghvim.pixlink.ir
 *   TAGHVIM_SERVICE_USERNAME  default admin
 *   TAGHVIM_SERVICE_PASSWORD  default Admin@12345
 *   UPLOAD_DIR                optional local uploads dir
 */
import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const apiBase = (
  process.env.TAGHVIM_LEGACY_API_URL || "https://taghvim.pixlink.ir"
).replace(/\/$/, "");
const username = process.env.TAGHVIM_SERVICE_USERNAME || "admin";
const password = process.env.TAGHVIM_SERVICE_PASSWORD || "Admin@12345";
const uploadsDir =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");

const sql = postgres(databaseUrl, { max: 1, prepare: false });

async function ensureSchema() {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  // Minimal tables — full ensure happens in app runtime too.
  await sql`
    CREATE TABLE IF NOT EXISTS taghvim_users (
      id BIGSERIAL PRIMARY KEY,
      dolatma_user_id UUID,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      mobile TEXT,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'editor',
      is_active BOOLEAN NOT NULL DEFAULT true,
      parent_id BIGINT,
      permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
      agency_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS taghvim_calendar_days (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      title TEXT,
      summary TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      is_featured BOOLEAN NOT NULL DEFAULT false,
      created_by BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS taghvim_enemy_actions (
      id BIGSERIAL PRIMARY KEY,
      calendar_day_id BIGINT NOT NULL,
      category_id BIGINT,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL DEFAULT 'medium',
      source TEXT,
      location TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      occurred_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'published',
      custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
      agency_id TEXT,
      created_by BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS taghvim_government_actions (
      id BIGSERIAL PRIMARY KEY,
      calendar_day_id BIGINT NOT NULL,
      category_id BIGINT,
      response_to_id BIGINT,
      title TEXT NOT NULL,
      description TEXT,
      agency TEXT,
      location TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      completed_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'published',
      custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      agency_id TEXT,
      created_by BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS taghvim_media (
      id BIGSERIAL PRIMARY KEY,
      attachable_type TEXT NOT NULL,
      attachable_id BIGINT NOT NULL,
      path TEXT NOT NULL,
      mime_type TEXT,
      size BIGINT NOT NULL DEFAULT 0,
      alt TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function login() {
  const res = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(`Legacy login failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.token) throw new Error("No token from legacy API");
  return data.token;
}

async function downloadMedia(url, token) {
  if (!url) return null;
  const absolute = url.startsWith("http")
    ? url
    : `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
  try {
    const res = await fetch(absolute, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext =
      path.extname(new URL(absolute).pathname).slice(0, 12) || ".bin";
    const filename = `taghvim-mig-${randomUUID()}${ext}`;
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, filename), buf);
    return {
      path: `/api/files/${filename}`,
      mime: res.headers.get("content-type"),
      size: buf.byteLength,
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log("Ensuring schema…");
  await ensureSchema();

  console.log(`Logging into ${apiBase} as ${username}…`);
  const token = await login();
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Ensure a system migrator user
  const migrator = await sql`
    INSERT INTO taghvim_users (name, username, role, permissions, agency_ids)
    VALUES ('Migrator', 'migrator', 'super_admin', ${sql.json([])}, ${sql.json([])})
    ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  const migratorId = Number(migrator[0].id);

  console.log("Fetching timeline…");
  const timelineRes = await fetch(`${apiBase}/api/v1/timeline`, { headers });
  if (!timelineRes.ok) {
    throw new Error(`timeline failed: ${timelineRes.status}`);
  }
  const timeline = await timelineRes.json();
  const days = Array.isArray(timeline.data) ? timeline.data : [];
  console.log(`Days: ${days.length}`);

  const enemyIdMap = new Map(); // legacyId -> newId

  for (const day of days) {
    const date = String(day.date).slice(0, 10);
    const dayRows = await sql`
      INSERT INTO taghvim_calendar_days (date, title, summary, status, is_featured, created_by)
      VALUES (
        ${date}::date,
        ${day.title ?? null},
        ${day.summary ?? null},
        ${day.status ?? "published"},
        ${Boolean(day.is_featured)},
        ${migratorId}
      )
      ON CONFLICT (date) DO UPDATE SET
        title = COALESCE(EXCLUDED.title, taghvim_calendar_days.title),
        summary = COALESCE(EXCLUDED.summary, taghvim_calendar_days.summary),
        status = EXCLUDED.status,
        is_featured = EXCLUDED.is_featured
      RETURNING id
    `;
    const dayId = Number(dayRows[0].id);

    for (const media of day.media ?? []) {
      const saved = await downloadMedia(media.url, token);
      if (!saved) continue;
      await sql`
        INSERT INTO taghvim_media (attachable_type, attachable_id, path, mime_type, size, alt, sort_order)
        VALUES (
          'calendar_day', ${dayId}, ${saved.path}, ${saved.mime},
          ${saved.size}, ${media.alt ?? null}, ${Number(media.sort_order ?? 0)}
        )
      `;
    }

    for (const action of day.enemy_actions ?? []) {
      const inserted = await sql`
        INSERT INTO taghvim_enemy_actions (
          calendar_day_id, title, description, severity, source, location,
          latitude, longitude, occurred_at, status, custom_fields, created_by
        ) VALUES (
          ${dayId},
          ${action.title ?? ""},
          ${action.description ?? null},
          ${action.severity ?? "medium"},
          ${action.source ?? null},
          ${action.location ?? null},
          ${action.latitude ?? null},
          ${action.longitude ?? null},
          ${action.occurred_at ?? null},
          ${action.status ?? "published"},
          ${sql.json(action.custom_fields ?? {})},
          ${migratorId}
        )
        RETURNING id
      `;
      const newId = Number(inserted[0].id);
      enemyIdMap.set(Number(action.id), newId);
      for (const media of action.media ?? []) {
        const saved = await downloadMedia(media.url, token);
        if (!saved) continue;
        await sql`
          INSERT INTO taghvim_media (attachable_type, attachable_id, path, mime_type, size, alt, sort_order)
          VALUES (
            'enemy_action', ${newId}, ${saved.path}, ${saved.mime},
            ${saved.size}, ${media.alt ?? null}, ${Number(media.sort_order ?? 0)}
          )
        `;
      }
    }

    for (const action of day.government_actions ?? []) {
      const responseTo =
        action.response_to_id != null
          ? enemyIdMap.get(Number(action.response_to_id)) ?? null
          : null;
      const inserted = await sql`
        INSERT INTO taghvim_government_actions (
          calendar_day_id, title, description, agency, location,
          latitude, longitude, completed_at, status, custom_fields, tags,
          agency_id, response_to_id, created_by
        ) VALUES (
          ${dayId},
          ${action.title ?? ""},
          ${action.description ?? null},
          ${action.agency ?? null},
          ${action.location ?? null},
          ${action.latitude ?? null},
          ${action.longitude ?? null},
          ${action.completed_at ?? null},
          ${action.status ?? "published"},
          ${sql.json(action.custom_fields ?? {})},
          ${sql.json(action.tags ?? [])},
          ${action.agency_id ?? null},
          ${responseTo},
          ${migratorId}
        )
        RETURNING id
      `;
      const newId = Number(inserted[0].id);
      for (const media of action.media ?? []) {
        const saved = await downloadMedia(media.url, token);
        if (!saved) continue;
        await sql`
          INSERT INTO taghvim_media (attachable_type, attachable_id, path, mime_type, size, alt, sort_order)
          VALUES (
            'government_action', ${newId}, ${saved.path}, ${saved.mime},
            ${saved.size}, ${media.alt ?? null}, ${Number(media.sort_order ?? 0)}
          )
        `;
      }
    }

    console.log(`Migrated day ${date}`);
  }

  const fingerprint = createHash("sha1")
    .update(String(days.length))
    .digest("hex")
    .slice(0, 8);
  console.log(`Done. days=${days.length} fingerprint=${fingerprint}`);
  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await sql.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
