import { getSql } from "@/lib/db/client";
import type { DirectiveActionPlan, DirectiveActionPlanInput } from "@/lib/types";
import {
  normalizeActionPlanInput,
  validateDirectiveActionPlanInput,
} from "@/lib/directive-action-plan";
import { generateId } from "@/lib/utils";

function toDateString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).split("T")[0] || null;
}

function toIsoString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parseUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function mapActionPlanRow(row: Record<string, unknown>): DirectiveActionPlan {
  return {
    id: String(row.id),
    directiveId: String(row.directive_id),
    userId: String(row.user_id),
    userName: row.user_name ? String(row.user_name) : null,
    deviceId: row.device_id ? String(row.device_id) : null,
    deviceName: row.device_name ? String(row.device_name) : null,
    studiedAcknowledged: Boolean(row.studied_acknowledged),
    isExecutable: Boolean(row.is_executable),
    notExecutableReason: String(row.not_executable_reason ?? ""),
    plannedActions: String(row.planned_actions ?? ""),
    capacityIds: parseUuidArray(row.capacity_ids),
    capacityTitles: Array.isArray(row.capacity_titles)
      ? row.capacity_titles.map((item) => String(item)).filter(Boolean)
      : [],
    capacityNotes: String(row.capacity_notes ?? ""),
    volumeDescription: String(row.volume_description ?? ""),
    scheduleStart: toDateString(row.schedule_start),
    scheduleEnd: toDateString(row.schedule_end),
    scheduleNotes: String(row.schedule_notes ?? ""),
    executorName: String(row.executor_name ?? ""),
    executorRole: String(row.executor_role ?? ""),
    executorPhone: String(row.executor_phone ?? ""),
    obstacles: String(row.obstacles ?? ""),
    supportNeeded: String(row.support_needed ?? ""),
    status: "submitted",
    submittedAt: toIsoString(row.submitted_at) ?? new Date().toISOString(),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

async function resolveUserDeviceId(userId: string): Promise<string | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT COALESCE(device_id, organization_id, ministry_id) AS device_id
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  const deviceId = rows[0]?.device_id;
  return deviceId ? String(deviceId) : null;
}

export async function pgGetActionPlanForUser(
  directiveId: string,
  userId: string
): Promise<DirectiveActionPlan | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      ap.*,
      u.name AS user_name,
      d.name AS device_name,
      COALESCE(
        (
          SELECT array_agg(c.title ORDER BY c.title)
          FROM device_capacities c
          WHERE c.id = ANY(ap.capacity_ids)
        ),
        '{}'::text[]
      ) AS capacity_titles
    FROM directive_action_plans ap
    LEFT JOIN users u ON u.id = ap.user_id
    LEFT JOIN devices d ON d.id = ap.device_id
    WHERE ap.directive_id = ${directiveId}
      AND ap.user_id = ${userId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapActionPlanRow(rows[0] as Record<string, unknown>);
}

export async function pgGetActionPlanById(id: string): Promise<DirectiveActionPlan | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      ap.*,
      u.name AS user_name,
      d.name AS device_name,
      COALESCE(
        (
          SELECT array_agg(c.title ORDER BY c.title)
          FROM device_capacities c
          WHERE c.id = ANY(ap.capacity_ids)
        ),
        '{}'::text[]
      ) AS capacity_titles
    FROM directive_action_plans ap
    LEFT JOIN users u ON u.id = ap.user_id
    LEFT JOIN devices d ON d.id = ap.device_id
    WHERE ap.id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapActionPlanRow(rows[0] as Record<string, unknown>);
}

export async function pgListActionPlansForDirective(
  directiveId: string
): Promise<DirectiveActionPlan[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      ap.*,
      u.name AS user_name,
      d.name AS device_name,
      COALESCE(
        (
          SELECT array_agg(c.title ORDER BY c.title)
          FROM device_capacities c
          WHERE c.id = ANY(ap.capacity_ids)
        ),
        '{}'::text[]
      ) AS capacity_titles
    FROM directive_action_plans ap
    LEFT JOIN users u ON u.id = ap.user_id
    LEFT JOIN devices d ON d.id = ap.device_id
    WHERE ap.directive_id = ${directiveId}
    ORDER BY ap.submitted_at DESC
  `;
  return rows.map((row) => mapActionPlanRow(row as Record<string, unknown>));
}

export async function pgUpsertActionPlan(input: {
  directiveId: string;
  userId: string;
  data: DirectiveActionPlanInput;
}): Promise<{ success: true; plan: DirectiveActionPlan } | { success: false; error: string }> {
  const validationError = validateDirectiveActionPlanInput(input.data);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const normalized = normalizeActionPlanInput(input.data);
  const sql = getSql();

  const recipient = await sql`
    SELECT confirmed
    FROM directive_recipients
    WHERE directive_id = ${input.directiveId}
      AND user_id = ${input.userId}
    LIMIT 1
  `;
  if (!recipient[0]) {
    return { success: false, error: "این دستورکار برای شما ثبت نشده است" };
  }
  if (!recipient[0].confirmed) {
    return { success: false, error: "ابتدا تأیید مشاهده دستور را ثبت کنید" };
  }

  if (normalized.capacityIds.length > 0) {
    const deviceIdForCaps = await resolveUserDeviceId(input.userId);
    if (deviceIdForCaps) {
      const valid = await sql`
        SELECT id
        FROM device_capacities
        WHERE device_id = ${deviceIdForCaps}
          AND id IN ${sql(normalized.capacityIds)}
      `;
      if (valid.length !== normalized.capacityIds.length) {
        return { success: false, error: "برخی ظرفیت‌های انتخاب‌شده نامعتبر هستند" };
      }
    }
  }

  const deviceId = await resolveUserDeviceId(input.userId);
  const now = new Date().toISOString();
  const id = generateId();
  const capacityIds = normalized.capacityIds;

  const rows = await sql`
    INSERT INTO directive_action_plans (
      id, directive_id, user_id, device_id,
      studied_acknowledged, is_executable, not_executable_reason,
      planned_actions, capacity_ids, capacity_notes,
      volume_description, schedule_start, schedule_end, schedule_notes,
      executor_name, executor_role, executor_phone,
      obstacles, support_needed, status, submitted_at, created_at, updated_at
    ) VALUES (
      ${id}, ${input.directiveId}, ${input.userId}, ${deviceId},
      ${normalized.studiedAcknowledged}, ${normalized.isExecutable}, ${normalized.notExecutableReason},
      ${normalized.plannedActions}, ${sql.array(capacityIds)}, ${normalized.capacityNotes},
      ${normalized.volumeDescription}, ${normalized.scheduleStart}, ${normalized.scheduleEnd},
      ${normalized.scheduleNotes},
      ${normalized.executorName}, ${normalized.executorRole}, ${normalized.executorPhone},
      ${normalized.obstacles}, ${normalized.supportNeeded}, 'submitted', ${now}, ${now}, ${now}
    )
    ON CONFLICT (directive_id, user_id) DO UPDATE SET
      device_id = EXCLUDED.device_id,
      studied_acknowledged = EXCLUDED.studied_acknowledged,
      is_executable = EXCLUDED.is_executable,
      not_executable_reason = EXCLUDED.not_executable_reason,
      planned_actions = EXCLUDED.planned_actions,
      capacity_ids = EXCLUDED.capacity_ids,
      capacity_notes = EXCLUDED.capacity_notes,
      volume_description = EXCLUDED.volume_description,
      schedule_start = EXCLUDED.schedule_start,
      schedule_end = EXCLUDED.schedule_end,
      schedule_notes = EXCLUDED.schedule_notes,
      executor_name = EXCLUDED.executor_name,
      executor_role = EXCLUDED.executor_role,
      executor_phone = EXCLUDED.executor_phone,
      obstacles = EXCLUDED.obstacles,
      support_needed = EXCLUDED.support_needed,
      status = 'submitted',
      submitted_at = EXCLUDED.submitted_at,
      updated_at = EXCLUDED.updated_at
    RETURNING id
  `;

  const planId = String(rows[0]?.id ?? id);
  const plan = await pgGetActionPlanById(planId);
  if (!plan) {
    return { success: false, error: "ثبت برنامه اقدام ناموفق بود" };
  }
  return { success: true, plan };
}

export async function pgGetDeviceCapacitiesForUser(
  userId: string
): Promise<Array<{ id: string; title: string; capacityType: string }>> {
  const deviceId = await resolveUserDeviceId(userId);
  if (!deviceId) return [];

  const sql = getSql();
  const rows = await sql`
    SELECT id, title, capacity_type
    FROM device_capacities
    WHERE device_id = ${deviceId}
      AND is_active = true
    ORDER BY title ASC
  `;

  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    capacityType: String(row.capacity_type ?? "other"),
  }));
}
