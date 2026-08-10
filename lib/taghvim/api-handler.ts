import { requireTaghvimApiSession } from "@/lib/taghvim/access";
import {
  actorHasPermission,
  jsonError,
  type TaghvimActor,
} from "@/lib/taghvim/permissions";
import { saveTaghvimUpload } from "@/lib/taghvim/save-upload";
import {
  attachMedia,
  clearDemoData,
  createEnemyAction,
  createGovernmentAction,
  createTaghvimUser,
  deleteTaghvimUser,
  demoStats,
  ensureActorFromSession,
  findOrCreateDay,
  forceDeleteArchive,
  getDayByDate,
  getFormSchema,
  getMyContent,
  getSettings,
  getTaghvimUser,
  getTimeline,
  listArchive,
  listCategories,
  listDays,
  listNotifications,
  listTaghvimUsers,
  markAllNotificationsRead,
  markNotificationRead,
  restoreArchive,
  softDeleteDay,
  softDeleteEnemy,
  softDeleteGovernment,
  toAdminUser,
  unreadNotificationCount,
  updateEnemyAction,
  updateFormSchema,
  updateGovernmentAction,
  updateSettings,
  updateTaghvimUser,
} from "@/lib/db/repository-taghvim";
import {
  getBackupsDir,
} from "@/lib/uploads";
import { mkdir, readdir, readFile, writeFile, stat } from "fs/promises";
import path from "path";
import type { Permission } from "@taghvim/types/auth";
import { ALL_PERMISSIONS } from "@taghvim/types/auth";

async function resolveActor(): Promise<
  { ok: true; actor: TaghvimActor } | { ok: false; response: Response }
> {
  const auth = await requireTaghvimApiSession();
  if (!auth.ok) return auth;
  const { localUserId, user } = await ensureActorFromSession(auth.session);
  return {
    ok: true,
    actor: { session: auth.session, localUserId, user },
  };
}

function match(
  parts: string[],
  pattern: string[]
): Record<string, string> | null {
  if (parts.length !== pattern.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i]!;
    const v = parts[i]!;
    if (p.startsWith(":")) params[p.slice(1)] = v;
    else if (p !== v) return null;
  }
  return params;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asPermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  return value.filter((p): p is Permission =>
    typeof p === "string" && ALL_PERMISSIONS.includes(p as Permission)
  );
}

export async function handleTaghvimApi(
  request: Request,
  pathParts: string[]
): Promise<Response> {
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const parts = pathParts.filter(Boolean);

  // Public-ish health under same mount (still behind admin session usually)
  if (parts.length === 1 && parts[0] === "health" && method === "GET") {
    return Response.json({ status: "ok", service: "dolatma-taghvim" });
  }

  // Auth endpoints that don't need actor bootstrap beyond session
  if (parts[0] === "auth" && parts[1] === "login" && method === "POST") {
    return jsonError(
      "ورود جداگانه تقویم حذف شده است؛ از حساب دولتما استفاده کنید.",
      410
    );
  }

  const resolved = await resolveActor();
  if (!resolved.ok) return resolved.response;
  const { actor } = resolved;
  const manageAll =
    actor.user.role === "super_admin" ||
    actorHasPermission(actor, "manage_users");

  // GET /auth/me
  if (match(parts, ["auth", "me"]) && method === "GET") {
    return Response.json({ data: actor.user });
  }

  // POST /auth/logout — no-op (dolatma session stays)
  if (match(parts, ["auth", "logout"]) && method === "POST") {
    return Response.json({ message: "Logged out" });
  }

  // Timeline
  if (match(parts, ["timeline"]) && method === "GET") {
    const data = await getTimeline({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    return Response.json(data);
  }

  {
    const m = match(parts, ["timeline", ":date"]);
    if (m && method === "GET") {
      const day = await getDayByDate(m.date!);
      if (!day) return jsonError("Day not found", 404);
      return Response.json({ data: day });
    }
  }

  if (match(parts, ["my-content"]) && method === "GET") {
    return Response.json(await getMyContent(actor.localUserId, manageAll));
  }

  // Days
  if (match(parts, ["days"]) && method === "GET") {
    const status = url.searchParams.get("status");
    return Response.json({ data: await listDays(status) });
  }

  if (match(parts, ["days"]) && method === "POST") {
    const body = await readJson(request);
    if (!body.date) return jsonError("date is required", 422);
    const { day, created } = await findOrCreateDay({
      date: String(body.date).slice(0, 10),
      title: body.title != null ? String(body.title) : null,
      summary: body.summary != null ? String(body.summary) : null,
      status: body.status != null ? String(body.status) : "published",
      created_by: actor.localUserId,
    });
    if (!created) {
      return Response.json(
        { message: "The date has already been taken.", data: { id: Number(day.id), date: String(day.date).slice(0, 10) } },
        { status: 422 }
      );
    }
    return Response.json(
      {
        data: {
          id: Number(day.id),
          date: String(day.date).slice(0, 10),
          title: day.title,
          summary: day.summary,
          status: day.status,
          is_featured: Boolean(day.is_featured),
          enemy_actions_count: 0,
          government_actions_count: 0,
          activity_score: 0,
        },
      },
      { status: 201 }
    );
  }

  {
    const m = match(parts, ["days", ":id"]);
    if (m && method === "DELETE") {
      if (!actorHasPermission(actor, "manage_content")) {
        return jsonError("Forbidden", 403);
      }
      await softDeleteDay(Number(m.id));
      return Response.json({ message: "Deleted" });
    }
  }

  {
    const m = match(parts, ["days", ":id", "enemy-actions"]);
    if (m && method === "POST") {
      const body = await readJson(request);
      if (!body.title) return jsonError("title is required", 422);
      const data = await createEnemyAction(
        Number(m.id),
        body,
        actor.localUserId
      );
      return Response.json({ data }, { status: 201 });
    }
  }

  {
    const m = match(parts, ["days", ":id", "government-actions"]);
    if (m && method === "POST") {
      const body = await readJson(request);
      if (!body.title) return jsonError("title is required", 422);
      const data = await createGovernmentAction(
        Number(m.id),
        body,
        actor.localUserId
      );
      return Response.json({ data }, { status: 201 });
    }
  }

  {
    const m = match(parts, ["days", ":id", "media"]);
    if (m && method === "POST") {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonError("file is required", 422);
      const saved = await saveTaghvimUpload(file);
      const data = await attachMedia({
        type: "calendar_day",
        id: Number(m.id),
        path: saved.path,
        mime_type: saved.mime_type,
        size: saved.size,
        alt: form.get("alt") != null ? String(form.get("alt")) : null,
      });
      return Response.json({ data }, { status: 201 });
    }
  }

  // Enemy / government update+delete+media
  {
    const m = match(parts, ["enemy-actions", ":id"]);
    if (m && method === "PUT") {
      const body = await readJson(request);
      const data = await updateEnemyAction(Number(m.id), body);
      if (!data) return jsonError("Not found", 404);
      return Response.json({ data });
    }
    if (m && method === "DELETE") {
      await softDeleteEnemy(Number(m.id));
      return Response.json({ message: "Deleted" });
    }
  }

  {
    const m = match(parts, ["enemy-actions", ":id", "media"]);
    if (m && method === "POST") {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonError("file is required", 422);
      const saved = await saveTaghvimUpload(file);
      const data = await attachMedia({
        type: "enemy_action",
        id: Number(m.id),
        path: saved.path,
        mime_type: saved.mime_type,
        size: saved.size,
        alt: form.get("alt") != null ? String(form.get("alt")) : null,
      });
      return Response.json({ data }, { status: 201 });
    }
  }

  {
    const m = match(parts, ["government-actions", ":id"]);
    if (m && method === "PUT") {
      const body = await readJson(request);
      const data = await updateGovernmentAction(Number(m.id), body);
      if (!data) return jsonError("Not found", 404);
      return Response.json({ data });
    }
    if (m && method === "DELETE") {
      await softDeleteGovernment(Number(m.id));
      return Response.json({ message: "Deleted" });
    }
  }

  {
    const m = match(parts, ["government-actions", ":id", "media"]);
    if (m && method === "POST") {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonError("file is required", 422);
      const saved = await saveTaghvimUpload(file);
      const data = await attachMedia({
        type: "government_action",
        id: Number(m.id),
        path: saved.path,
        mime_type: saved.mime_type,
        size: saved.size,
        alt: form.get("alt") != null ? String(form.get("alt")) : null,
      });
      return Response.json({ data }, { status: 201 });
    }
  }

  // Form schema
  if (match(parts, ["form-schema"]) && method === "GET") {
    return Response.json(await getFormSchema());
  }
  if (match(parts, ["form-schema"]) && method === "PUT") {
    if (!actorHasPermission(actor, "manage_form_schema")) {
      return jsonError("Forbidden", 403);
    }
    const body = await readJson(request);
    try {
      return Response.json(
        await updateFormSchema({
          name: body.name != null ? String(body.name) : undefined,
          fields: Array.isArray(body.fields)
            ? (body.fields as Array<Record<string, unknown>>)
            : [],
        })
      );
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Invalid schema",
        422
      );
    }
  }

  // Notifications
  if (match(parts, ["notifications"]) && method === "GET") {
    const unreadOnly = url.searchParams.get("unread") === "1";
    return Response.json(
      await listNotifications(actor.localUserId, unreadOnly)
    );
  }
  if (match(parts, ["notifications", "unread-count"]) && method === "GET") {
    return Response.json(await unreadNotificationCount(actor.localUserId));
  }
  if (match(parts, ["notifications", "read-all"]) && method === "POST") {
    return Response.json(await markAllNotificationsRead(actor.localUserId));
  }
  {
    const m = match(parts, ["notifications", ":id", "read"]);
    if (m && method === "POST") {
      return Response.json(
        await markNotificationRead(actor.localUserId, m.id!)
      );
    }
  }

  // Users
  if (match(parts, ["users"]) && method === "GET") {
    if (
      !actorHasPermission(actor, "manage_users") &&
      !actorHasPermission(actor, "manage_subusers")
    ) {
      return jsonError("Forbidden", 403);
    }
    const users = await listTaghvimUsers({
      actorId: actor.localUserId,
      manageAll,
    });
    return Response.json({ data: users.map(toAdminUser) });
  }

  if (match(parts, ["users"]) && method === "POST") {
    if (
      !actorHasPermission(actor, "manage_users") &&
      !actorHasPermission(actor, "manage_subusers")
    ) {
      return jsonError("Forbidden", 403);
    }
    const body = await readJson(request);
    const username = String(body.username ?? "").trim().toLowerCase();
    if (!username || !body.name || !body.password) {
      return jsonError("name, username and password are required", 422);
    }
    const role =
      manageAll && body.role === "super_admin" ? "super_admin" : "editor";
    const parentId = manageAll
      ? body.parent_id != null
        ? Number(body.parent_id)
        : null
      : actor.localUserId;
    try {
      const user = await createTaghvimUser({
        name: String(body.name),
        username,
        email: body.email != null ? String(body.email) : null,
        mobile: body.mobile != null ? String(body.mobile) : null,
        password: String(body.password),
        role,
        permissions: asPermissions(body.permissions),
        agency_ids: Array.isArray(body.agency_ids)
          ? body.agency_ids.map(String)
          : Array.isArray(body.agencyIds)
            ? body.agencyIds.map(String)
            : [],
        parent_id: parentId,
        is_active: body.is_active !== false,
      });
      return Response.json({ data: toAdminUser(user) }, { status: 201 });
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Create failed",
        422
      );
    }
  }

  {
    const m = match(parts, ["users", ":id"]);
    if (m && method === "PUT") {
      if (
        !actorHasPermission(actor, "manage_users") &&
        !actorHasPermission(actor, "manage_subusers")
      ) {
        return jsonError("Forbidden", 403);
      }
      const body = await readJson(request);
      const updated = await updateTaghvimUser(Number(m.id), {
        name: body.name != null ? String(body.name) : undefined,
        username: body.username != null ? String(body.username) : undefined,
        email: body.email !== undefined ? (body.email as string | null) : undefined,
        mobile:
          body.mobile !== undefined ? (body.mobile as string | null) : undefined,
        password: body.password ? String(body.password) : undefined,
        role:
          manageAll && body.role != null
            ? body.role === "super_admin"
              ? "super_admin"
              : "editor"
            : undefined,
        permissions:
          body.permissions !== undefined
            ? asPermissions(body.permissions)
            : undefined,
        agency_ids:
          body.agency_ids !== undefined
            ? Array.isArray(body.agency_ids)
              ? body.agency_ids.map(String)
              : []
            : body.agencyIds !== undefined
              ? Array.isArray(body.agencyIds)
                ? body.agencyIds.map(String)
                : []
              : undefined,
        parent_id:
          body.parent_id !== undefined
            ? body.parent_id != null
              ? Number(body.parent_id)
              : null
            : undefined,
        is_active:
          body.is_active !== undefined ? Boolean(body.is_active) : undefined,
      });
      if (!updated) return jsonError("Not found", 404);
      return Response.json({ data: toAdminUser(updated) });
    }
    if (m && method === "DELETE") {
      if (
        !actorHasPermission(actor, "manage_users") &&
        !actorHasPermission(actor, "manage_subusers")
      ) {
        return jsonError("Forbidden", 403);
      }
      if (Number(m.id) === actor.localUserId) {
        return jsonError("Cannot delete yourself", 422);
      }
      await deleteTaghvimUser(Number(m.id));
      return Response.json({ message: "Deleted" });
    }
  }

  {
    const m = match(parts, ["users", ":id", "permissions"]);
    if (m && method === "GET") {
      const user = await getTaghvimUser(Number(m.id));
      if (!user) return jsonError("Not found", 404);
      return Response.json({ data: user.permissions });
    }
  }

  // Archive
  if (match(parts, ["archive"]) && method === "GET") {
    if (!actorHasPermission(actor, "view_archive")) {
      return jsonError("Forbidden", 403);
    }
    return Response.json(await listArchive());
  }
  {
    const m = match(parts, ["archive", ":type", ":id", "restore"]);
    if (m && method === "POST") {
      if (!actorHasPermission(actor, "view_archive")) {
        return jsonError("Forbidden", 403);
      }
      await restoreArchive(m.type!, Number(m.id));
      return Response.json({ message: "Restored" });
    }
  }
  {
    const m = match(parts, ["archive", ":type", ":id"]);
    if (m && method === "DELETE") {
      if (!actorHasPermission(actor, "force_delete")) {
        return jsonError("Forbidden", 403);
      }
      await forceDeleteArchive(m.type!, Number(m.id));
      return Response.json({ message: "Deleted" });
    }
  }

  // Demo data
  if (match(parts, ["demo-data", "stats"]) && method === "GET") {
    if (!actorHasPermission(actor, "manage_content")) {
      return jsonError("Forbidden", 403);
    }
    return Response.json(await demoStats());
  }
  if (match(parts, ["demo-data", "clear"]) && method === "POST") {
    if (!actorHasPermission(actor, "manage_content")) {
      return jsonError("Forbidden", 403);
    }
    return Response.json(await clearDemoData());
  }
  if (match(parts, ["demo-data", "restore"]) && method === "POST") {
    if (!actorHasPermission(actor, "manage_content")) {
      return jsonError("Forbidden", 403);
    }
    // No bundled seed dump in dolatma — clear is enough; restore is a no-op success.
    return Response.json({ message: "restore skipped — use migrate script" });
  }

  // Settings / categories
  if (match(parts, ["settings"]) && method === "GET") {
    return Response.json(await getSettings());
  }
  if (match(parts, ["settings"]) && method === "PUT") {
    if (!actorHasPermission(actor, "manage_settings")) {
      return jsonError("Forbidden", 403);
    }
    const body = await readJson(request);
    return Response.json(await updateSettings(body));
  }
  if (match(parts, ["categories"]) && method === "GET") {
    return Response.json(await listCategories());
  }

  // Backups — JSON dump of core calendar tables
  const backupsRoot = path.join(getBackupsDir(), "taghvim");
  if (match(parts, ["backups"]) && method === "GET") {
    if (!actorHasPermission(actor, "run_backup")) {
      return jsonError("Forbidden", 403);
    }
    await mkdir(backupsRoot, { recursive: true });
    const files = await readdir(backupsRoot);
    const data = [];
    for (const filename of files) {
      if (!filename.endsWith(".json")) continue;
      const info = await stat(path.join(backupsRoot, filename));
      data.push({
        filename,
        size: info.size,
        created_at: info.mtime.toISOString(),
      });
    }
    data.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return Response.json({ data });
  }

  if (match(parts, ["backups"]) && method === "POST") {
    if (!actorHasPermission(actor, "run_backup")) {
      return jsonError("Forbidden", 403);
    }
    await mkdir(backupsRoot, { recursive: true });
    const timeline = await getTimeline({});
    const filename = `taghvim-backup-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    await writeFile(
      path.join(backupsRoot, filename),
      JSON.stringify(timeline, null, 2),
      "utf8"
    );
    return Response.json({ data: { filename } }, { status: 201 });
  }

  {
    const m = match(parts, ["backups", ":filename", "download"]);
    if (m && method === "GET") {
      if (!actorHasPermission(actor, "run_backup")) {
        return jsonError("Forbidden", 403);
      }
      const safe = path.basename(m.filename!);
      const filePath = path.join(backupsRoot, safe);
      try {
        const buf = await readFile(filePath);
        return new Response(buf, {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="${safe}"`,
          },
        });
      } catch {
        return jsonError("Not found", 404);
      }
    }
  }

  return jsonError("Not found", 404);
}
