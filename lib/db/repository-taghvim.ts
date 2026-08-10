import { getSql } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import type { AdminUser, Permission } from "@taghvim/types/auth";
import { ALL_PERMISSIONS } from "@taghvim/types/auth";
import {
  defaultPermissionsForSession,
  elevatedDolatma,
} from "@/lib/taghvim/permissions";
import { FALLBACK_FORM_SCHEMA } from "@taghvim/lib/form-schema";
import type { AuthSession } from "@/lib/types";

function asJson(sql: ReturnType<typeof getSql>, value: unknown) {
  return sql.json(JSON.parse(JSON.stringify(value ?? null)));
}

let schemaReady: Promise<void> | null = null;

export async function ensureTaghvimSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

      await sql`
        CREATE TABLE IF NOT EXISTS taghvim_users (
          id BIGSERIAL PRIMARY KEY,
          dolatma_user_id UUID,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          email TEXT,
          mobile TEXT,
          password_hash TEXT,
          role TEXT NOT NULL DEFAULT 'editor'
            CHECK (role IN ('super_admin', 'editor')),
          is_active BOOLEAN NOT NULL DEFAULT true,
          parent_id BIGINT REFERENCES taghvim_users(id) ON DELETE SET NULL,
          permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
          agency_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS taghvim_users_dolatma_idx ON taghvim_users (dolatma_user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS taghvim_users_parent_idx ON taghvim_users (parent_id)`;

      await sql`
        CREATE TABLE IF NOT EXISTS taghvim_categories (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          color TEXT NOT NULL DEFAULT '#64748b',
          type TEXT NOT NULL DEFAULT 'enemy'
            CHECK (type IN ('enemy', 'government')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
          created_by BIGINT REFERENCES taghvim_users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          deleted_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS taghvim_days_status_date_idx ON taghvim_calendar_days (status, date)`;

      await sql`
        CREATE TABLE IF NOT EXISTS taghvim_enemy_actions (
          id BIGSERIAL PRIMARY KEY,
          calendar_day_id BIGINT NOT NULL REFERENCES taghvim_calendar_days(id) ON DELETE CASCADE,
          category_id BIGINT REFERENCES taghvim_categories(id) ON DELETE SET NULL,
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
          created_by BIGINT REFERENCES taghvim_users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          deleted_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS taghvim_enemy_day_idx ON taghvim_enemy_actions (calendar_day_id)`;

      await sql`
        CREATE TABLE IF NOT EXISTS taghvim_government_actions (
          id BIGSERIAL PRIMARY KEY,
          calendar_day_id BIGINT NOT NULL REFERENCES taghvim_calendar_days(id) ON DELETE CASCADE,
          category_id BIGINT REFERENCES taghvim_categories(id) ON DELETE SET NULL,
          response_to_id BIGINT REFERENCES taghvim_enemy_actions(id) ON DELETE SET NULL,
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
          created_by BIGINT REFERENCES taghvim_users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          deleted_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS taghvim_gov_day_idx ON taghvim_government_actions (calendar_day_id)`;

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
      await sql`CREATE INDEX IF NOT EXISTS taghvim_media_attach_idx ON taghvim_media (attachable_type, attachable_id)`;

      await sql`
        CREATE TABLE IF NOT EXISTS taghvim_settings (
          id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS taghvim_form_definitions (
          id BIGSERIAL PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS taghvim_form_fields (
          id BIGSERIAL PRIMARY KEY,
          form_definition_id BIGINT NOT NULL REFERENCES taghvim_form_definitions(id) ON DELETE CASCADE,
          key TEXT NOT NULL,
          label TEXT NOT NULL,
          type TEXT NOT NULL,
          options JSONB,
          required BOOLEAN NOT NULL DEFAULT false,
          sort_order INT NOT NULL DEFAULT 0,
          section TEXT NOT NULL DEFAULT 'main',
          is_system BOOLEAN NOT NULL DEFAULT false,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (form_definition_id, key)
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS taghvim_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id BIGINT NOT NULL REFERENCES taghvim_users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          read_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS taghvim_notif_user_idx ON taghvim_notifications (user_id, created_at DESC)`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String);
}

function asPermissionArray(value: unknown): Permission[] {
  return asStringArray(value).filter((p): p is Permission =>
    ALL_PERMISSIONS.includes(p as Permission)
  );
}

function sanitizeUsername(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.slice(0, 64) || "dm_user";
}

export type TaghvimUserRow = {
  id: number;
  dolatma_user_id: string | null;
  name: string;
  username: string;
  email: string | null;
  mobile: string | null;
  role: "super_admin" | "editor";
  is_active: boolean;
  parent_id: number | null;
  permissions: Permission[];
  agency_ids: string[];
  created_at: string;
};

function mapUserRow(row: Record<string, unknown>): TaghvimUserRow {
  return {
    id: Number(row.id),
    dolatma_user_id: row.dolatma_user_id ? String(row.dolatma_user_id) : null,
    name: String(row.name ?? ""),
    username: String(row.username ?? ""),
    email: row.email != null ? String(row.email) : null,
    mobile: row.mobile != null ? String(row.mobile) : null,
    role: row.role === "super_admin" ? "super_admin" : "editor",
    is_active: Boolean(row.is_active ?? true),
    parent_id: row.parent_id != null ? Number(row.parent_id) : null,
    permissions: asPermissionArray(row.permissions),
    agency_ids: asStringArray(row.agency_ids),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? new Date().toISOString()),
  };
}

export function toAdminUser(row: TaghvimUserRow): AdminUser {
  return {
    id: String(row.id),
    name: row.name,
    username: row.username,
    mobile: row.mobile,
    email: row.email ?? "",
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    parent_id: row.parent_id,
    permissions: row.permissions,
    agencyIds: row.agency_ids,
  };
}

/** Find or create the calendar user linked to the current dolatma session. */
export async function ensureActorFromSession(
  session: AuthSession
): Promise<{ localUserId: number; user: AdminUser }> {
  await ensureTaghvimSchema();
  const sql = getSql();
  const dolatmaId = session.userId || null;
  const elevated = elevatedDolatma(session);
  const role = elevated ? "super_admin" : "editor";
  const permissions = defaultPermissionsForSession(session);
  const name =
    session.name?.trim() ||
    session.email?.trim() ||
    (elevated ? "مدیر سیستم" : "کاربر دولتما");
  const email = session.email?.trim() || null;
  const username = sanitizeUsername(
    `dm_${dolatmaId || session.type || session.email || "user"}`
  );

  if (dolatmaId) {
    const existing = await sql`
      SELECT * FROM taghvim_users WHERE dolatma_user_id = ${dolatmaId}::uuid LIMIT 1
    `;
    if (existing[0]) {
      const updated = await sql`
        UPDATE taghvim_users SET
          name = ${name},
          email = ${email},
          role = ${role},
          permissions = ${asJson(sql, permissions)},
          is_active = true,
          updated_at = now()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      const row = mapUserRow(updated[0] as Record<string, unknown>);
      return { localUserId: row.id, user: toAdminUser(row) };
    }
  }

  const byUsername = await sql`
    SELECT * FROM taghvim_users WHERE username = ${username} LIMIT 1
  `;
  if (byUsername[0]) {
    const updated = await sql`
      UPDATE taghvim_users SET
        dolatma_user_id = COALESCE(dolatma_user_id, ${dolatmaId}::uuid),
        name = ${name},
        email = ${email},
        role = ${role},
        permissions = ${asJson(sql, permissions)},
        is_active = true,
        updated_at = now()
      WHERE id = ${byUsername[0].id}
      RETURNING *
    `;
    const row = mapUserRow(updated[0] as Record<string, unknown>);
    return { localUserId: row.id, user: toAdminUser(row) };
  }

  const created = await sql`
    INSERT INTO taghvim_users (
      dolatma_user_id, name, username, email, role, permissions, agency_ids, is_active
    ) VALUES (
      ${dolatmaId}::uuid, ${name}, ${username}, ${email}, ${role},
      ${asJson(sql, permissions)}, ${asJson(sql, [])}, true
    )
    RETURNING *
  `;
  const row = mapUserRow(created[0] as Record<string, unknown>);
  return { localUserId: row.id, user: toAdminUser(row) };
}

export async function listTaghvimUsers(opts: {
  actorId: number;
  manageAll: boolean;
}): Promise<TaghvimUserRow[]> {
  await ensureTaghvimSchema();
  const sql = getSql();
  if (opts.manageAll) {
    const rows = await sql`SELECT * FROM taghvim_users ORDER BY name`;
    return rows.map((r) => mapUserRow(r as Record<string, unknown>));
  }
  const rows = await sql`
    SELECT * FROM taghvim_users
    WHERE parent_id = ${opts.actorId} OR id = ${opts.actorId}
    ORDER BY name
  `;
  return rows.map((r) => mapUserRow(r as Record<string, unknown>));
}

export async function getTaghvimUser(id: number): Promise<TaghvimUserRow | null> {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM taghvim_users WHERE id = ${id} LIMIT 1`;
  return rows[0] ? mapUserRow(rows[0] as Record<string, unknown>) : null;
}

export async function createTaghvimUser(input: {
  name: string;
  username: string;
  email?: string | null;
  mobile?: string | null;
  password?: string;
  role: "super_admin" | "editor";
  permissions: Permission[];
  agency_ids: string[];
  parent_id: number | null;
  is_active?: boolean;
}): Promise<TaghvimUserRow> {
  await ensureTaghvimSchema();
  const sql = getSql();
  const passwordHash = input.password
    ? await hashPassword(input.password)
    : null;
  const rows = await sql`
    INSERT INTO taghvim_users (
      name, username, email, mobile, password_hash, role, permissions, agency_ids, parent_id, is_active
    ) VALUES (
      ${input.name},
      ${input.username.trim().toLowerCase()},
      ${input.email ?? null},
      ${input.mobile ?? null},
      ${passwordHash},
      ${input.role},
      ${asJson(sql, input.permissions)},
      ${asJson(sql, input.agency_ids)},
      ${input.parent_id},
      ${input.is_active ?? true}
    )
    RETURNING *
  `;
  return mapUserRow(rows[0] as Record<string, unknown>);
}

export async function updateTaghvimUser(
  id: number,
  patch: Partial<{
    name: string;
    username: string;
    email: string | null;
    mobile: string | null;
    password: string;
    role: "super_admin" | "editor";
    permissions: Permission[];
    agency_ids: string[];
    parent_id: number | null;
    is_active: boolean;
  }>
): Promise<TaghvimUserRow | null> {
  await ensureTaghvimSchema();
  const sql = getSql();
  const current = await getTaghvimUser(id);
  if (!current) return null;

  const passwordHash = patch.password
    ? await hashPassword(patch.password)
    : undefined;

  const rows = await sql`
    UPDATE taghvim_users SET
      name = ${patch.name ?? current.name},
      username = ${patch.username?.trim().toLowerCase() ?? current.username},
      email = ${patch.email !== undefined ? patch.email : current.email},
      mobile = ${patch.mobile !== undefined ? patch.mobile : current.mobile},
      password_hash = COALESCE(${passwordHash ?? null}, password_hash),
      role = ${patch.role ?? current.role},
      permissions = ${asJson(sql, patch.permissions ?? current.permissions)},
      agency_ids = ${asJson(sql, patch.agency_ids ?? current.agency_ids)},
      parent_id = ${patch.parent_id !== undefined ? patch.parent_id : current.parent_id},
      is_active = ${patch.is_active ?? current.is_active},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? mapUserRow(rows[0] as Record<string, unknown>) : null;
}

export async function deleteTaghvimUser(id: number): Promise<boolean> {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`DELETE FROM taghvim_users WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

function iso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function dateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export async function getMediaFor(
  type: string,
  ids: number[]
): Promise<Map<number, Record<string, unknown>[]>> {
  const map = new Map<number, Record<string, unknown>[]>();
  if (ids.length === 0) return map;
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM taghvim_media
    WHERE attachable_type = ${type} AND attachable_id = ANY(${ids})
    ORDER BY sort_order, id
  `;
  for (const row of rows) {
    const id = Number(row.attachable_id);
    const list = map.get(id) ?? [];
    list.push(row as Record<string, unknown>);
    map.set(id, list);
  }
  return map;
}

export function serializeMedia(row: Record<string, unknown>) {
  const path = String(row.path ?? "");
  const url = path.startsWith("/") ? path : `/api/files/${path}`;
  return {
    id: Number(row.id),
    url,
    alt: row.alt != null ? String(row.alt) : null,
    mime_type: row.mime_type != null ? String(row.mime_type) : null,
    sort_order: Number(row.sort_order ?? 0),
  };
}

export function serializeEnemy(
  row: Record<string, unknown>,
  media: ReturnType<typeof serializeMedia>[] = [],
  creators: Map<number, { id: number; name: string }> = new Map()
) {
  const createdBy = row.created_by != null ? Number(row.created_by) : null;
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    description: row.description != null ? String(row.description) : null,
    severity: String(row.severity ?? "medium"),
    source: row.source != null ? String(row.source) : null,
    location: row.location != null ? String(row.location) : null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    occurred_at: iso(row.occurred_at),
    status: String(row.status ?? "published"),
    custom_fields:
      row.custom_fields && typeof row.custom_fields === "object"
        ? row.custom_fields
        : {},
    agency_id: row.agency_id != null ? String(row.agency_id) : null,
    created_by: createdBy,
    date: iso(row.occurred_at)?.slice(0, 10) ?? null,
    creator: createdBy != null ? creators.get(createdBy) ?? null : null,
    category: null,
    media,
    calendar_day: row.day_id
      ? { id: Number(row.day_id), date: dateOnly(row.day_date) }
      : undefined,
  };
}

export function serializeGovernment(
  row: Record<string, unknown>,
  media: ReturnType<typeof serializeMedia>[] = [],
  creators: Map<number, { id: number; name: string }> = new Map()
) {
  const createdBy = row.created_by != null ? Number(row.created_by) : null;
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    description: row.description != null ? String(row.description) : null,
    agency: row.agency != null ? String(row.agency) : null,
    location: row.location != null ? String(row.location) : null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    completed_at: iso(row.completed_at),
    status: String(row.status ?? "published"),
    custom_fields:
      row.custom_fields && typeof row.custom_fields === "object"
        ? row.custom_fields
        : {},
    tags: asStringArray(row.tags),
    agency_id: row.agency_id != null ? String(row.agency_id) : null,
    created_by: createdBy,
    date: iso(row.completed_at)?.slice(0, 10) ?? null,
    creator: createdBy != null ? creators.get(createdBy) ?? null : null,
    response_to_id:
      row.response_to_id != null ? Number(row.response_to_id) : null,
    category: null,
    media,
    calendar_day: row.day_id
      ? { id: Number(row.day_id), date: dateOnly(row.day_date) }
      : undefined,
  };
}

async function loadCreators(
  ids: number[]
): Promise<Map<number, { id: number; name: string }>> {
  const map = new Map<number, { id: number; name: string }>();
  if (ids.length === 0) return map;
  const sql = getSql();
  const rows = await sql`
    SELECT id, name FROM taghvim_users WHERE id = ANY(${ids})
  `;
  for (const row of rows) {
    map.set(Number(row.id), { id: Number(row.id), name: String(row.name) });
  }
  return map;
}

export async function getTimeline(opts: {
  from?: string | null;
  to?: string | null;
}) {
  await ensureTaghvimSchema();
  const sql = getSql();

  const days = await sql`
    SELECT d.*,
      (SELECT COUNT(*)::int FROM taghvim_enemy_actions e
        WHERE e.calendar_day_id = d.id AND e.deleted_at IS NULL AND e.status = 'published') AS enemy_actions_count,
      (SELECT COUNT(*)::int FROM taghvim_government_actions g
        WHERE g.calendar_day_id = d.id AND g.deleted_at IS NULL AND g.status = 'published') AS government_actions_count
    FROM taghvim_calendar_days d
    WHERE d.deleted_at IS NULL AND d.status = 'published'
      AND (${opts.from ?? null}::date IS NULL OR d.date >= ${opts.from ?? null}::date)
      AND (${opts.to ?? null}::date IS NULL OR d.date <= ${opts.to ?? null}::date)
    ORDER BY d.date
  `;

  const filtered = days.filter((d) => {
    const enemy = Number(d.enemy_actions_count ?? 0);
    const gov = Number(d.government_actions_count ?? 0);
    return enemy > 0 || gov > 0 || d.created_by != null;
  });

  const dayIds = filtered.map((d) => Number(d.id));
  const enemyRows =
    dayIds.length === 0
      ? []
      : await sql`
          SELECT e.*, d.id AS day_id, d.date AS day_date
          FROM taghvim_enemy_actions e
          JOIN taghvim_calendar_days d ON d.id = e.calendar_day_id
          WHERE e.calendar_day_id = ANY(${dayIds})
            AND e.deleted_at IS NULL AND e.status = 'published'
          ORDER BY e.occurred_at NULLS LAST, e.id
        `;
  const govRows =
    dayIds.length === 0
      ? []
      : await sql`
          SELECT g.*, d.id AS day_id, d.date AS day_date
          FROM taghvim_government_actions g
          JOIN taghvim_calendar_days d ON d.id = g.calendar_day_id
          WHERE g.calendar_day_id = ANY(${dayIds})
            AND g.deleted_at IS NULL AND g.status = 'published'
          ORDER BY g.completed_at NULLS LAST, g.id
        `;

  const enemyIds = enemyRows.map((r) => Number(r.id));
  const govIds = govRows.map((r) => Number(r.id));
  const dayMedia = await getMediaFor("calendar_day", dayIds);
  const enemyMedia = await getMediaFor("enemy_action", enemyIds);
  const govMedia = await getMediaFor("government_action", govIds);
  const creatorIds = [
    ...enemyRows.map((r) => Number(r.created_by)).filter(Boolean),
    ...govRows.map((r) => Number(r.created_by)).filter(Boolean),
  ];
  const creators = await loadCreators(creatorIds);

  const enemiesByDay = new Map<number, ReturnType<typeof serializeEnemy>[]>();
  for (const row of enemyRows) {
    const dayId = Number(row.calendar_day_id);
    const list = enemiesByDay.get(dayId) ?? [];
    list.push(
      serializeEnemy(
        row as Record<string, unknown>,
        (enemyMedia.get(Number(row.id)) ?? []).map(serializeMedia),
        creators
      )
    );
    enemiesByDay.set(dayId, list);
  }

  const govByDay = new Map<number, ReturnType<typeof serializeGovernment>[]>();
  for (const row of govRows) {
    const dayId = Number(row.calendar_day_id);
    const list = govByDay.get(dayId) ?? [];
    list.push(
      serializeGovernment(
        row as Record<string, unknown>,
        (govMedia.get(Number(row.id)) ?? []).map(serializeMedia),
        creators
      )
    );
    govByDay.set(dayId, list);
  }

  const data = filtered.map((d) => {
    const enemyCount = Number(d.enemy_actions_count ?? 0);
    const govCount = Number(d.government_actions_count ?? 0);
    const activityScore = enemyCount * 2 + govCount;
    return {
      id: Number(d.id),
      date: dateOnly(d.date),
      title: d.title != null ? String(d.title) : null,
      summary: d.summary != null ? String(d.summary) : null,
      status: String(d.status ?? "published"),
      is_featured: Boolean(d.is_featured),
      enemy_actions_count: enemyCount,
      government_actions_count: govCount,
      activity_score: activityScore,
      media: (dayMedia.get(Number(d.id)) ?? []).map(serializeMedia),
      enemy_actions: enemiesByDay.get(Number(d.id)) ?? [],
      government_actions: govByDay.get(Number(d.id)) ?? [],
      created_at: iso(d.created_at),
    };
  });

  const totalEnemy = data.reduce((s, d) => s + d.enemy_actions_count, 0);
  const totalGov = data.reduce((s, d) => s + d.government_actions_count, 0);
  const maxScore = Math.max(1, ...data.map((d) => d.activity_score), 1);

  return {
    data,
    meta: {
      max_activity_score: maxScore,
      stats: {
        total_days: data.length,
        total_enemy_actions: totalEnemy,
        total_government_actions: totalGov,
        response_ratio: totalEnemy > 0 ? totalGov / totalEnemy : 0,
      },
    },
  };
}

export async function getDayByDate(date: string) {
  const timeline = await getTimeline({ from: date, to: date });
  return timeline.data.find((d) => d.date === date) ?? null;
}

export async function getMyContent(localUserId: number, manageAll: boolean) {
  await ensureTaghvimSchema();
  const sql = getSql();

  const enemyRows = manageAll
    ? await sql`
        SELECT e.*, d.id AS day_id, d.date AS day_date
        FROM taghvim_enemy_actions e
        JOIN taghvim_calendar_days d ON d.id = e.calendar_day_id
        WHERE e.deleted_at IS NULL
        ORDER BY e.occurred_at DESC NULLS LAST, e.id DESC
      `
    : await sql`
        SELECT e.*, d.id AS day_id, d.date AS day_date
        FROM taghvim_enemy_actions e
        JOIN taghvim_calendar_days d ON d.id = e.calendar_day_id
        WHERE e.deleted_at IS NULL AND e.created_by = ${localUserId}
        ORDER BY e.occurred_at DESC NULLS LAST, e.id DESC
      `;

  const govRows = manageAll
    ? await sql`
        SELECT g.*, d.id AS day_id, d.date AS day_date
        FROM taghvim_government_actions g
        JOIN taghvim_calendar_days d ON d.id = g.calendar_day_id
        WHERE g.deleted_at IS NULL
        ORDER BY g.completed_at DESC NULLS LAST, g.id DESC
      `
    : await sql`
        SELECT g.*, d.id AS day_id, d.date AS day_date
        FROM taghvim_government_actions g
        JOIN taghvim_calendar_days d ON d.id = g.calendar_day_id
        WHERE g.deleted_at IS NULL AND g.created_by = ${localUserId}
        ORDER BY g.completed_at DESC NULLS LAST, g.id DESC
      `;

  const enemyIds = enemyRows.map((r) => Number(r.id));
  const govIds = govRows.map((r) => Number(r.id));
  const enemyMedia = await getMediaFor("enemy_action", enemyIds);
  const govMedia = await getMediaFor("government_action", govIds);
  const creators = await loadCreators([
    ...enemyRows.map((r) => Number(r.created_by)).filter(Boolean),
    ...govRows.map((r) => Number(r.created_by)).filter(Boolean),
  ]);

  return {
    data: {
      enemy_actions: enemyRows.map((r) =>
        serializeEnemy(
          r as Record<string, unknown>,
          (enemyMedia.get(Number(r.id)) ?? []).map(serializeMedia),
          creators
        )
      ),
      government_actions: govRows.map((r) =>
        serializeGovernment(
          r as Record<string, unknown>,
          (govMedia.get(Number(r.id)) ?? []).map(serializeMedia),
          creators
        )
      ),
    },
  };
}

export async function findOrCreateDay(input: {
  date: string;
  title?: string | null;
  summary?: string | null;
  status?: string;
  created_by: number;
}): Promise<{ day: Record<string, unknown>; created: boolean }> {
  await ensureTaghvimSchema();
  const sql = getSql();
  const existing = await sql`
    SELECT * FROM taghvim_calendar_days
    WHERE date = ${input.date}::date AND deleted_at IS NULL
    LIMIT 1
  `;
  if (existing[0]) {
    return { day: existing[0] as Record<string, unknown>, created: false };
  }
  const rows = await sql`
    INSERT INTO taghvim_calendar_days (date, title, summary, status, created_by)
    VALUES (
      ${input.date}::date,
      ${input.title ?? null},
      ${input.summary ?? null},
      ${input.status ?? "published"},
      ${input.created_by}
    )
    RETURNING *
  `;
  return { day: rows[0] as Record<string, unknown>, created: true };
}

export async function listDays(status?: string | null) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = status
    ? await sql`
        SELECT d.*,
          (SELECT COUNT(*)::int FROM taghvim_enemy_actions e WHERE e.calendar_day_id = d.id AND e.deleted_at IS NULL) AS enemy_actions_count,
          (SELECT COUNT(*)::int FROM taghvim_government_actions g WHERE g.calendar_day_id = d.id AND g.deleted_at IS NULL) AS government_actions_count
        FROM taghvim_calendar_days d
        WHERE d.deleted_at IS NULL AND d.status = ${status}
        ORDER BY d.date DESC
        LIMIT 100
      `
    : await sql`
        SELECT d.*,
          (SELECT COUNT(*)::int FROM taghvim_enemy_actions e WHERE e.calendar_day_id = d.id AND e.deleted_at IS NULL) AS enemy_actions_count,
          (SELECT COUNT(*)::int FROM taghvim_government_actions g WHERE g.calendar_day_id = d.id AND g.deleted_at IS NULL) AS government_actions_count
        FROM taghvim_calendar_days d
        WHERE d.deleted_at IS NULL
        ORDER BY d.date DESC
        LIMIT 100
      `;

  return rows.map((d) => {
    const enemyCount = Number(d.enemy_actions_count ?? 0);
    const govCount = Number(d.government_actions_count ?? 0);
    return {
      id: Number(d.id),
      date: dateOnly(d.date),
      title: d.title != null ? String(d.title) : null,
      summary: d.summary != null ? String(d.summary) : null,
      status: String(d.status),
      is_featured: Boolean(d.is_featured),
      enemy_actions_count: enemyCount,
      government_actions_count: govCount,
      activity_score: enemyCount * 2 + govCount,
      created_at: iso(d.created_at),
    };
  });
}

export async function createEnemyAction(
  dayId: number,
  body: Record<string, unknown>,
  createdBy: number
) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO taghvim_enemy_actions (
      calendar_day_id, title, description, severity, source, location,
      latitude, longitude, occurred_at, status, custom_fields, agency_id, created_by
    ) VALUES (
      ${dayId},
      ${String(body.title ?? "")},
      ${body.description != null ? String(body.description) : null},
      ${String(body.severity ?? "medium")},
      ${body.source != null ? String(body.source) : null},
      ${body.location != null ? String(body.location) : null},
      ${body.latitude != null ? Number(body.latitude) : null},
      ${body.longitude != null ? Number(body.longitude) : null},
      ${body.occurred_at != null ? String(body.occurred_at) : null},
      ${String(body.status ?? "published")},
      ${asJson(sql, (body.custom_fields as object) ?? {})},
      null,
      ${createdBy}
    )
    RETURNING *
  `;
  return serializeEnemy(rows[0] as Record<string, unknown>, []);
}

export async function createGovernmentAction(
  dayId: number,
  body: Record<string, unknown>,
  createdBy: number
) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO taghvim_government_actions (
      calendar_day_id, title, description, agency, location,
      latitude, longitude, completed_at, status, custom_fields, tags,
      agency_id, response_to_id, created_by
    ) VALUES (
      ${dayId},
      ${String(body.title ?? "")},
      ${body.description != null ? String(body.description) : null},
      ${body.agency != null ? String(body.agency) : null},
      ${body.location != null ? String(body.location) : null},
      ${body.latitude != null ? Number(body.latitude) : null},
      ${body.longitude != null ? Number(body.longitude) : null},
      ${body.completed_at != null ? String(body.completed_at) : null},
      ${String(body.status ?? "published")},
      ${asJson(sql, (body.custom_fields as object) ?? {})},
      ${asJson(sql, asStringArray(body.tags))},
      ${body.agency_id != null ? String(body.agency_id) : null},
      ${body.response_to_id != null ? Number(body.response_to_id) : null},
      ${createdBy}
    )
    RETURNING *
  `;
  return serializeGovernment(rows[0] as Record<string, unknown>, []);
}

export async function updateEnemyAction(
  id: number,
  body: Record<string, unknown>
) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const current = await sql`
    SELECT * FROM taghvim_enemy_actions WHERE id = ${id} AND deleted_at IS NULL LIMIT 1
  `;
  if (!current[0]) return null;
  const c = current[0] as Record<string, unknown>;
  const rows = await sql`
    UPDATE taghvim_enemy_actions SET
      title = ${body.title != null ? String(body.title) : String(c.title)},
      description = ${
        body.description !== undefined
          ? body.description != null
            ? String(body.description)
            : null
          : c.description != null
            ? String(c.description)
            : null
      },
      severity = ${body.severity != null ? String(body.severity) : String(c.severity)},
      source = ${
        body.source !== undefined
          ? body.source != null
            ? String(body.source)
            : null
          : c.source != null
            ? String(c.source)
            : null
      },
      location = ${
        body.location !== undefined
          ? body.location != null
            ? String(body.location)
            : null
          : c.location != null
            ? String(c.location)
            : null
      },
      latitude = ${
        body.latitude !== undefined
          ? body.latitude != null
            ? Number(body.latitude)
            : null
          : c.latitude != null
            ? Number(c.latitude)
            : null
      },
      longitude = ${
        body.longitude !== undefined
          ? body.longitude != null
            ? Number(body.longitude)
            : null
          : c.longitude != null
            ? Number(c.longitude)
            : null
      },
      occurred_at = ${
        body.occurred_at !== undefined
          ? body.occurred_at != null
            ? String(body.occurred_at)
            : null
          : c.occurred_at != null
            ? String(c.occurred_at)
            : null
      },
      status = ${body.status != null ? String(body.status) : String(c.status)},
      custom_fields = ${asJson(sql, 
        (body.custom_fields as object) ?? (c.custom_fields as object) ?? {}
      )},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  const media = await getMediaFor("enemy_action", [id]);
  return serializeEnemy(
    rows[0] as Record<string, unknown>,
    (media.get(id) ?? []).map(serializeMedia)
  );
}

export async function updateGovernmentAction(
  id: number,
  body: Record<string, unknown>
) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const current = await sql`
    SELECT * FROM taghvim_government_actions WHERE id = ${id} AND deleted_at IS NULL LIMIT 1
  `;
  if (!current[0]) return null;
  const c = current[0] as Record<string, unknown>;
  const rows = await sql`
    UPDATE taghvim_government_actions SET
      title = ${body.title != null ? String(body.title) : String(c.title)},
      description = ${
        body.description !== undefined
          ? body.description != null
            ? String(body.description)
            : null
          : c.description != null
            ? String(c.description)
            : null
      },
      agency = ${
        body.agency !== undefined
          ? body.agency != null
            ? String(body.agency)
            : null
          : c.agency != null
            ? String(c.agency)
            : null
      },
      location = ${
        body.location !== undefined
          ? body.location != null
            ? String(body.location)
            : null
          : c.location != null
            ? String(c.location)
            : null
      },
      latitude = ${
        body.latitude !== undefined
          ? body.latitude != null
            ? Number(body.latitude)
            : null
          : c.latitude != null
            ? Number(c.latitude)
            : null
      },
      longitude = ${
        body.longitude !== undefined
          ? body.longitude != null
            ? Number(body.longitude)
            : null
          : c.longitude != null
            ? Number(c.longitude)
            : null
      },
      completed_at = ${
        body.completed_at !== undefined
          ? body.completed_at != null
            ? String(body.completed_at)
            : null
          : c.completed_at != null
            ? String(c.completed_at)
            : null
      },
      status = ${body.status != null ? String(body.status) : String(c.status)},
      custom_fields = ${asJson(sql, 
        (body.custom_fields as object) ?? (c.custom_fields as object) ?? {}
      )},
      tags = ${asJson(sql, 
        body.tags !== undefined ? asStringArray(body.tags) : asStringArray(c.tags)
      )},
      agency_id = ${
        body.agency_id !== undefined
          ? body.agency_id != null
            ? String(body.agency_id)
            : null
          : c.agency_id != null
            ? String(c.agency_id)
            : null
      },
      response_to_id = ${
        body.response_to_id !== undefined
          ? body.response_to_id != null
            ? Number(body.response_to_id)
            : null
          : c.response_to_id != null
            ? Number(c.response_to_id)
            : null
      },
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  const media = await getMediaFor("government_action", [id]);
  return serializeGovernment(
    rows[0] as Record<string, unknown>,
    (media.get(id) ?? []).map(serializeMedia)
  );
}

export async function softDeleteEnemy(id: number) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`
    UPDATE taghvim_enemy_actions SET deleted_at = now()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function softDeleteGovernment(id: number) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`
    UPDATE taghvim_government_actions SET deleted_at = now()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function softDeleteDay(id: number) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`
    UPDATE taghvim_calendar_days SET deleted_at = now()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function attachMedia(input: {
  type: "calendar_day" | "enemy_action" | "government_action";
  id: number;
  path: string;
  mime_type: string | null;
  size: number;
  alt?: string | null;
}) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO taghvim_media (attachable_type, attachable_id, path, mime_type, size, alt)
    VALUES (
      ${input.type}, ${input.id}, ${input.path}, ${input.mime_type},
      ${input.size}, ${input.alt ?? null}
    )
    RETURNING *
  `;
  return serializeMedia(rows[0] as Record<string, unknown>);
}

export async function getFormSchema() {
  await ensureTaghvimSchema();
  const sql = getSql();
  const defs = await sql`
    SELECT * FROM taghvim_form_definitions WHERE key = 'event_create' AND is_active = true LIMIT 1
  `;
  if (!defs[0]) {
    return { data: FALLBACK_FORM_SCHEMA };
  }
  const fields = await sql`
    SELECT * FROM taghvim_form_fields
    WHERE form_definition_id = ${defs[0].id}
    ORDER BY sort_order, id
  `;
  return {
    data: {
      key: String(defs[0].key),
      name: String(defs[0].name),
      is_active: Boolean(defs[0].is_active),
      fields: fields.map((f) => ({
        key: String(f.key),
        label: String(f.label),
        type: String(f.type),
        options: f.options ?? null,
        required: Boolean(f.required),
        sort_order: Number(f.sort_order ?? 0),
        section: String(f.section ?? "main"),
        is_system: Boolean(f.is_system),
        is_active: Boolean(f.is_active),
      })),
    },
  };
}

export async function updateFormSchema(body: {
  name?: string;
  fields: Array<Record<string, unknown>>;
}) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const defs = await sql`
    INSERT INTO taghvim_form_definitions (key, name, is_active)
    VALUES ('event_create', ${body.name ?? "ثبت رویداد"}, true)
    ON CONFLICT (key) DO UPDATE SET
      name = COALESCE(${body.name ?? null}, taghvim_form_definitions.name),
      updated_at = now()
    RETURNING *
  `;
  const defId = Number(defs[0].id);
  const existing = await sql`
    SELECT * FROM taghvim_form_fields WHERE form_definition_id = ${defId}
  `;
  const systemKeys = existing
    .filter((f) => f.is_system)
    .map((f) => String(f.key));
  const incomingKeys = body.fields.map((f) => String(f.key));
  for (const key of systemKeys) {
    if (!incomingKeys.includes(key)) {
      throw new Error(`System field [${key}] cannot be removed.`);
    }
  }

  const keepKeys = new Set(incomingKeys);
  for (const field of existing) {
    if (!keepKeys.has(String(field.key)) && !field.is_system) {
      await sql`DELETE FROM taghvim_form_fields WHERE id = ${field.id}`;
    }
  }

  for (let i = 0; i < body.fields.length; i++) {
    const f = body.fields[i]!;
    const key = String(f.key);
    const current = existing.find((e) => String(e.key) === key);
    if (current?.is_system) {
      await sql`
        UPDATE taghvim_form_fields SET
          label = ${String(f.label)},
          required = ${Boolean(f.required ?? current.required)},
          sort_order = ${Number(f.sort_order ?? i)},
          section = ${String(f.section ?? current.section ?? "main")},
          is_active = ${f.is_active !== false},
          updated_at = now()
        WHERE id = ${current.id}
      `;
    } else if (current) {
      await sql`
        UPDATE taghvim_form_fields SET
          label = ${String(f.label)},
          type = ${String(f.type)},
          options = ${asJson(sql, f.options ?? null)},
          required = ${Boolean(f.required)},
          sort_order = ${Number(f.sort_order ?? i)},
          section = ${String(f.section ?? "main")},
          is_active = ${f.is_active !== false},
          updated_at = now()
        WHERE id = ${current.id}
      `;
    } else {
      await sql`
        INSERT INTO taghvim_form_fields (
          form_definition_id, key, label, type, options, required, sort_order, section, is_system, is_active
        ) VALUES (
          ${defId}, ${key}, ${String(f.label)}, ${String(f.type)},
          ${asJson(sql, f.options ?? null)}, ${Boolean(f.required)},
          ${Number(f.sort_order ?? i)}, ${String(f.section ?? "main")},
          ${Boolean(f.is_system)}, ${f.is_active !== false}
        )
      `;
    }
  }

  return getFormSchema();
}

export async function listNotifications(userId: number, unreadOnly = false) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = unreadOnly
    ? await sql`
        SELECT * FROM taghvim_notifications
        WHERE user_id = ${userId} AND read_at IS NULL
        ORDER BY created_at DESC LIMIT 50
      `
    : await sql`
        SELECT * FROM taghvim_notifications
        WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 50
      `;
  return {
    data: rows.map((r) => ({
      id: String(r.id),
      type: String(r.type),
      data: r.data ?? {},
      read_at: iso(r.read_at),
      created_at: iso(r.created_at),
    })),
  };
}

export async function unreadNotificationCount(userId: number) {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT COUNT(*)::int AS c FROM taghvim_notifications
    WHERE user_id = ${userId} AND read_at IS NULL
  `;
  return { data: { count: Number(rows[0]?.c ?? 0) } };
}

export async function markNotificationRead(userId: number, id: string) {
  await ensureTaghvimSchema();
  const sql = getSql();
  await sql`
    UPDATE taghvim_notifications SET read_at = now(), updated_at = now()
    WHERE id = ${id}::uuid AND user_id = ${userId}
  `;
  return { message: "ok" };
}

export async function markAllNotificationsRead(userId: number) {
  await ensureTaghvimSchema();
  const sql = getSql();
  await sql`
    UPDATE taghvim_notifications SET read_at = now(), updated_at = now()
    WHERE user_id = ${userId} AND read_at IS NULL
  `;
  return { message: "ok" };
}

export async function createNotification(input: {
  userId: number;
  type: string;
  data: Record<string, unknown>;
}) {
  await ensureTaghvimSchema();
  const sql = getSql();
  await sql`
    INSERT INTO taghvim_notifications (user_id, type, data)
    VALUES (${input.userId}, ${input.type}, ${asJson(sql, input.data)})
  `;
}

export async function listArchive() {
  await ensureTaghvimSchema();
  const sql = getSql();
  const enemies = await sql`
    SELECT id, title, 'enemy_action' AS type, deleted_at, created_at
    FROM taghvim_enemy_actions WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC LIMIT 100
  `;
  const govs = await sql`
    SELECT id, title, 'government_action' AS type, deleted_at, created_at
    FROM taghvim_government_actions WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC LIMIT 100
  `;
  const days = await sql`
    SELECT id, COALESCE(title, date::text) AS title, 'calendar_day' AS type, deleted_at, created_at
    FROM taghvim_calendar_days WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC LIMIT 100
  `;
  const data = [...enemies, ...govs, ...days]
    .map((r) => ({
      id: Number(r.id),
      title: String(r.title ?? ""),
      type: String(r.type),
      deleted_at: iso(r.deleted_at),
      created_at: iso(r.created_at),
    }))
    .sort((a, b) => String(b.deleted_at).localeCompare(String(a.deleted_at)));
  return { data };
}

export async function restoreArchive(type: string, id: number) {
  await ensureTaghvimSchema();
  const sql = getSql();
  if (type === "enemy_action" || type === "enemy") {
    await sql`UPDATE taghvim_enemy_actions SET deleted_at = NULL WHERE id = ${id}`;
  } else if (type === "government_action" || type === "government") {
    await sql`UPDATE taghvim_government_actions SET deleted_at = NULL WHERE id = ${id}`;
  } else if (type === "calendar_day" || type === "day") {
    await sql`UPDATE taghvim_calendar_days SET deleted_at = NULL WHERE id = ${id}`;
  } else {
    return false;
  }
  return true;
}

export async function forceDeleteArchive(type: string, id: number) {
  await ensureTaghvimSchema();
  const sql = getSql();
  if (type === "enemy_action" || type === "enemy") {
    await sql`DELETE FROM taghvim_media WHERE attachable_type = 'enemy_action' AND attachable_id = ${id}`;
    await sql`DELETE FROM taghvim_enemy_actions WHERE id = ${id}`;
  } else if (type === "government_action" || type === "government") {
    await sql`DELETE FROM taghvim_media WHERE attachable_type = 'government_action' AND attachable_id = ${id}`;
    await sql`DELETE FROM taghvim_government_actions WHERE id = ${id}`;
  } else if (type === "calendar_day" || type === "day") {
    await sql`DELETE FROM taghvim_media WHERE attachable_type = 'calendar_day' AND attachable_id = ${id}`;
    await sql`DELETE FROM taghvim_calendar_days WHERE id = ${id}`;
  } else {
    return false;
  }
  return true;
}

export async function demoStats() {
  await ensureTaghvimSchema();
  const sql = getSql();
  const days = await sql`SELECT COUNT(*)::int AS c FROM taghvim_calendar_days WHERE deleted_at IS NULL`;
  const enemies = await sql`SELECT COUNT(*)::int AS c FROM taghvim_enemy_actions WHERE deleted_at IS NULL`;
  const govs = await sql`SELECT COUNT(*)::int AS c FROM taghvim_government_actions WHERE deleted_at IS NULL`;
  return {
    data: {
      days: Number(days[0]?.c ?? 0),
      enemy_actions: Number(enemies[0]?.c ?? 0),
      government_actions: Number(govs[0]?.c ?? 0),
    },
  };
}

export async function clearDemoData() {
  await ensureTaghvimSchema();
  const sql = getSql();
  await sql`DELETE FROM taghvim_media`;
  await sql`DELETE FROM taghvim_government_actions`;
  await sql`DELETE FROM taghvim_enemy_actions`;
  await sql`DELETE FROM taghvim_calendar_days`;
  await sql`DELETE FROM taghvim_notifications`;
  return { message: "cleared" };
}

export async function getSettings() {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`SELECT payload FROM taghvim_settings WHERE id = 1`;
  return { data: (rows[0]?.payload as object) ?? {} };
}

export async function updateSettings(payload: Record<string, unknown>) {
  await ensureTaghvimSchema();
  const sql = getSql();
  await sql`
    INSERT INTO taghvim_settings (id, payload, updated_at)
    VALUES (1, ${asJson(sql, payload)}, now())
    ON CONFLICT (id) DO UPDATE SET payload = ${asJson(sql, payload)}, updated_at = now()
  `;
  return { data: payload };
}

export async function listCategories() {
  await ensureTaghvimSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM taghvim_categories ORDER BY name`;
  return {
    data: rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      slug: String(r.slug),
      color: String(r.color),
      type: String(r.type),
    })),
  };
}

/** Used by migration script — insert day with optional fixed id skipped (serial). */
export async function upsertMigratedDay(input: {
  date: string;
  title?: string | null;
  summary?: string | null;
  status?: string;
  is_featured?: boolean;
  created_by?: number | null;
}) {
  const { day } = await findOrCreateDay({
    date: input.date,
    title: input.title,
    summary: input.summary,
    status: input.status ?? "published",
    created_by: input.created_by ?? 1,
  });
  if (input.is_featured || input.title || input.summary) {
    const sql = getSql();
    await sql`
      UPDATE taghvim_calendar_days SET
        title = COALESCE(${input.title ?? null}, title),
        summary = COALESCE(${input.summary ?? null}, summary),
        is_featured = COALESCE(${input.is_featured ?? null}, is_featured),
        status = COALESCE(${input.status ?? null}, status)
      WHERE id = ${Number(day.id)}
    `;
  }
  return Number(day.id);
}
