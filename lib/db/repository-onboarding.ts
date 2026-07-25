import { getSql } from "@/lib/db/client";
import { DEFAULT_ONBOARDING_STEPS } from "@/lib/onboarding/defaults";
import {
  isOnboardingEvaluator,
  type OnboardingEvaluator,
  type OnboardingStep,
} from "@/lib/onboarding/types";

let schemaReady: Promise<void> | null = null;

export async function ensureOnboardingSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS onboarding_steps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          step_key TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          href TEXT NOT NULL DEFAULT '',
          evaluator TEXT NOT NULL DEFAULT 'none'
            CHECK (evaluator IN ('passport', 'subsidiaries', 'content', 'directives', 'none')),
          sort_order INT NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_onboarding_steps_active_order
          ON onboarding_steps(is_active, sort_order ASC)
      `;
      await seedDefaultOnboardingSteps();
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

async function seedDefaultOnboardingSteps(): Promise<void> {
  const sql = getSql();
  for (const step of DEFAULT_ONBOARDING_STEPS) {
    await sql`
      INSERT INTO onboarding_steps (
        step_key, title, description, href, evaluator, sort_order, is_active
      )
      VALUES (
        ${step.stepKey},
        ${step.title},
        ${step.description},
        ${step.href},
        ${step.evaluator},
        ${step.sortOrder},
        true
      )
      ON CONFLICT (step_key) DO NOTHING
    `;
  }
}

function mapStep(row: Record<string, unknown>): OnboardingStep | null {
  const evaluatorRaw = row.evaluator;
  if (!isOnboardingEvaluator(evaluatorRaw)) return null;
  const stepKey = typeof row.step_key === "string" ? row.step_key.trim() : "";
  if (!stepKey) return null;

  return {
    id: String(row.id),
    stepKey,
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    href: String(row.href ?? ""),
    evaluator: evaluatorRaw,
    sortOrder: Number(row.sort_order) || 0,
    isActive: row.is_active !== false,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function pgListOnboardingSteps(options?: {
  activeOnly?: boolean;
}): Promise<OnboardingStep[]> {
  await ensureOnboardingSchema();
  const sql = getSql();
  const rows = options?.activeOnly
    ? await sql`
        SELECT * FROM onboarding_steps
        WHERE is_active = true
        ORDER BY sort_order ASC, created_at ASC
      `
    : await sql`
        SELECT * FROM onboarding_steps
        ORDER BY sort_order ASC, created_at ASC
      `;

  return rows
    .map((row) => mapStep(row as Record<string, unknown>))
    .filter((step): step is OnboardingStep => Boolean(step));
}

export async function pgGetOnboardingStepById(id: string): Promise<OnboardingStep | null> {
  await ensureOnboardingSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM onboarding_steps WHERE id = ${id}::uuid LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapStep(rows[0] as Record<string, unknown>);
}

export async function pgCreateOnboardingStep(input: {
  stepKey: string;
  title: string;
  description?: string;
  href?: string;
  evaluator: OnboardingEvaluator;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<{ success: true; step: OnboardingStep } | { success: false; error: string }> {
  await ensureOnboardingSchema();
  const sql = getSql();
  const stepKey = input.stepKey.trim().toLowerCase().replace(/\s+/g, "_");
  const title = input.title.trim();
  if (!stepKey || !/^[a-z0-9_]+$/.test(stepKey)) {
    return { success: false, error: "کلید مرحله نامعتبر است" };
  }
  if (!title) {
    return { success: false, error: "عنوان الزامی است" };
  }

  const existing = await sql`
    SELECT id FROM onboarding_steps WHERE step_key = ${stepKey} LIMIT 1
  `;
  if (existing[0]) {
    return { success: false, error: "این کلید مرحله از قبل وجود دارد" };
  }

  const maxOrderRows = await sql`
    SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM onboarding_steps
  `;
  const sortOrder =
    typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
      ? Math.trunc(input.sortOrder)
      : Number(maxOrderRows[0]?.max_order ?? 0) + 1;

  const rows = await sql`
    INSERT INTO onboarding_steps (
      step_key, title, description, href, evaluator, sort_order, is_active
    )
    VALUES (
      ${stepKey},
      ${title},
      ${input.description?.trim() ?? ""},
      ${input.href?.trim() ?? ""},
      ${input.evaluator},
      ${sortOrder},
      ${input.isActive !== false}
    )
    RETURNING *
  `;

  const step = mapStep(rows[0] as Record<string, unknown>);
  if (!step) return { success: false, error: "ذخیره مرحله ناموفق بود" };
  return { success: true, step };
}

export async function pgUpdateOnboardingStep(input: {
  id: string;
  title?: string;
  description?: string;
  href?: string;
  evaluator?: OnboardingEvaluator;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<{ success: true; step: OnboardingStep } | { success: false; error: string }> {
  await ensureOnboardingSchema();
  const sql = getSql();
  const existing = await pgGetOnboardingStepById(input.id);
  if (!existing) return { success: false, error: "مرحله یافت نشد" };

  const title = input.title !== undefined ? input.title.trim() : existing.title;
  if (!title) return { success: false, error: "عنوان الزامی است" };

  const rows = await sql`
    UPDATE onboarding_steps SET
      title = ${title},
      description = ${
        input.description !== undefined ? input.description.trim() : existing.description
      },
      href = ${input.href !== undefined ? input.href.trim() : existing.href},
      evaluator = ${input.evaluator ?? existing.evaluator},
      sort_order = ${
        typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
          ? Math.trunc(input.sortOrder)
          : existing.sortOrder
      },
      is_active = ${input.isActive !== undefined ? input.isActive : existing.isActive},
      updated_at = now()
    WHERE id = ${input.id}::uuid
    RETURNING *
  `;

  const step = mapStep(rows[0] as Record<string, unknown>);
  if (!step) return { success: false, error: "به‌روزرسانی ناموفق بود" };
  return { success: true, step };
}

export async function pgDeleteOnboardingStep(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  await ensureOnboardingSchema();
  const sql = getSql();
  const existing = await pgGetOnboardingStepById(id);
  if (!existing) return { success: false, error: "مرحله یافت نشد" };
  if (DEFAULT_ONBOARDING_STEPS.some((step) => step.stepKey === existing.stepKey)) {
    return {
      success: false,
      error: "مراحل پیش‌فرض را حذف نکنید؛ می‌توانید غیرفعالشان کنید",
    };
  }
  await sql`DELETE FROM onboarding_steps WHERE id = ${id}::uuid`;
  return { success: true };
}

export interface DeviceOnboardingFacts {
  deviceId: string;
  deviceName: string;
  profileComplete: boolean;
  hasPrimaryOfficial: boolean;
  hasStaff: boolean;
  hasCapacity: boolean;
  childrenCount: number;
  contentCounts: Record<string, number>;
  directivesIssued: number;
}

const EMPTY_CONTENT_COUNTS: Record<string, number> = {
  billboards: 0,
  posters: 0,
  videos: 0,
  files: 0,
  rawMedia: 0,
  sitePublications: 0,
  socialPosts: 0,
  broadcast: 0,
  meetings: 0,
  activities: 0,
  submissions: 0,
};

async function loadContentCountsForUserIds(
  campaignId: string,
  userIds: string[]
): Promise<Record<string, number>> {
  const counts = { ...EMPTY_CONTENT_COUNTS };
  if (userIds.length === 0) return counts;

  const sql = getSql();
  const [
    billboards,
    posters,
    videos,
    files,
    rawMedia,
    sitePublications,
    socialPosts,
    broadcast,
    meetings,
    activities,
    submissions,
  ] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS c FROM billboards
      WHERE campaign_id = ${campaignId}::uuid AND owner_user_id IN ${sql(userIds)}
    `,
    sql`
      SELECT COUNT(*)::int AS c FROM posters
      WHERE campaign_id = ${campaignId}::uuid AND owner_user_id IN ${sql(userIds)}
    `,
    sql`
      SELECT COUNT(*)::int AS c FROM videos
      WHERE campaign_id = ${campaignId}::uuid AND owner_user_id IN ${sql(userIds)}
    `,
    sql`
      SELECT COUNT(*)::int AS c FROM campaign_files
      WHERE campaign_id = ${campaignId}::uuid AND owner_user_id IN ${sql(userIds)}
    `,
    sql`
      SELECT COUNT(*)::int AS c FROM raw_media_uploads
      WHERE campaign_id = ${campaignId}::uuid AND owner_user_id IN ${sql(userIds)}
    `,
    sql`
      SELECT COUNT(*)::int AS c FROM social_media_posts
      WHERE campaign_id = ${campaignId}::uuid
        AND owner_user_id IN ${sql(userIds)}
        AND platform = 'site'
    `,
    sql`
      SELECT COUNT(*)::int AS c FROM social_media_posts
      WHERE campaign_id = ${campaignId}::uuid
        AND owner_user_id IN ${sql(userIds)}
        AND platform <> 'site'
    `,
    sql`
      SELECT COUNT(*)::int AS c FROM broadcast_reports
      WHERE campaign_id = ${campaignId}::uuid AND owner_user_id IN ${sql(userIds)}
    `,
    sql`
      SELECT COUNT(*)::int AS c FROM campaign_meetings
      WHERE campaign_id = ${campaignId}::uuid AND owner_user_id IN ${sql(userIds)}
    `,
    sql`
      SELECT COUNT(*)::int AS c FROM campaign_activities
      WHERE campaign_id = ${campaignId}::uuid AND owner_user_id IN ${sql(userIds)}
    `,
    sql`
      SELECT COUNT(*)::int AS c FROM campaign_submissions
      WHERE campaign_id = ${campaignId}::uuid AND owner_user_id IN ${sql(userIds)}
    `,
  ]);

  counts.billboards = Number(billboards[0]?.c ?? 0);
  counts.posters = Number(posters[0]?.c ?? 0);
  counts.videos = Number(videos[0]?.c ?? 0);
  counts.files = Number(files[0]?.c ?? 0);
  counts.rawMedia = Number(rawMedia[0]?.c ?? 0);
  counts.sitePublications = Number(sitePublications[0]?.c ?? 0);
  counts.socialPosts = Number(socialPosts[0]?.c ?? 0);
  counts.broadcast = Number(broadcast[0]?.c ?? 0);
  counts.meetings = Number(meetings[0]?.c ?? 0);
  counts.activities = Number(activities[0]?.c ?? 0);
  counts.submissions = Number(submissions[0]?.c ?? 0);
  return counts;
}

export async function pgGetDeviceOnboardingFacts(input: {
  deviceId: string;
  campaignId: string;
  /** When set, content/directives are scoped to these owners instead of all device users. */
  ownerUserIds?: string[];
}): Promise<DeviceOnboardingFacts | null> {
  await ensureOnboardingSchema();
  const sql = getSql();
  const { deviceId, campaignId } = input;

  const deviceRows = await sql`
    SELECT
      d.id,
      d.name,
      d.type,
      d.mission,
      d.address,
      d.phones,
      d.website,
      (SELECT COUNT(*)::int FROM devices c WHERE c.parent_id = d.id) AS children_count,
      EXISTS(
        SELECT 1 FROM users u
        WHERE u.org_role = 'primary'
          AND (
            u.device_id = d.id
            OR u.organization_id = d.id
            OR (u.ministry_id = d.id AND u.organization_id IS NULL)
          )
      ) AS has_primary_official,
      EXISTS(
        SELECT 1 FROM device_staff s WHERE s.device_id = d.id
      ) AS has_staff,
      EXISTS(
        SELECT 1 FROM device_capacities c
        WHERE c.device_id = d.id AND c.is_active = true
      ) AS has_capacity
    FROM devices d
    WHERE d.id = ${deviceId}::uuid
    LIMIT 1
  `;

  const device = deviceRows[0] as Record<string, unknown> | undefined;
  if (!device) return null;

  const phones = Array.isArray(device.phones)
    ? device.phones
    : typeof device.phones === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(device.phones);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  const profileComplete = Boolean(
    device.name &&
      device.type &&
      (device.mission || device.address || phones.length > 0)
  );

  let userIds = input.ownerUserIds?.filter(Boolean) ?? [];
  if (userIds.length === 0) {
    const userRows = await sql`
      SELECT id FROM users
      WHERE device_id = ${deviceId}::uuid
         OR organization_id = ${deviceId}::uuid
         OR (ministry_id = ${deviceId}::uuid AND organization_id IS NULL)
    `;
    userIds = userRows.map((row) => String(row.id));
  }

  const contentCounts = await loadContentCountsForUserIds(campaignId, userIds);

  let directivesIssued = 0;
  if (userIds.length > 0) {
    const directiveRows = await sql`
      SELECT COUNT(*)::int AS c
      FROM campaign_directives
      WHERE campaign_id = ${campaignId}::uuid
        AND created_by_user_id IN ${sql(userIds)}
    `;
    directivesIssued = Number(directiveRows[0]?.c ?? 0);
  }

  return {
    deviceId: String(device.id),
    deviceName: String(device.name ?? ""),
    profileComplete,
    hasPrimaryOfficial: Boolean(device.has_primary_official),
    hasStaff: Boolean(device.has_staff),
    hasCapacity: Boolean(device.has_capacity),
    childrenCount: Number(device.children_count ?? 0),
    contentCounts,
    directivesIssued,
  };
}

/** Devices that have at least one attached user (candidates for onboarding tracking). */
export async function pgListDevicesWithUsersForOnboarding(): Promise<
  Array<{ id: string; name: string }>
> {
  await ensureOnboardingSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT DISTINCT
      d.id,
      d.name
    FROM devices d
    INNER JOIN users u ON (
      u.device_id = d.id
      OR u.organization_id = d.id
      OR (u.ministry_id = d.id AND u.organization_id IS NULL)
    )
    WHERE d.is_active = true
    ORDER BY d.name ASC
  `;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
  }));
}
