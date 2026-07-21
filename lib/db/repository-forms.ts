import { getSql } from "@/lib/db/client";
import { normalizeFormFields } from "@/lib/campaign-forms";
import type {
  CampaignForm,
  CampaignFormResponse,
  CampaignFormResponseStatus,
  CampaignFormStatus,
  FormField,
} from "@/lib/types";

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

function mapFormFromDb(row: Record<string, unknown>): CampaignForm {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    fields: normalizeFormFields(row.fields),
    status: (row.status as CampaignFormStatus) ?? "draft",
    sortOrder: Number(row.sort_order) || 0,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    responseCount:
      row.response_count == null ? undefined : Number(row.response_count) || 0,
  };
}

function mapResponseFromDb(row: Record<string, unknown>): CampaignFormResponse {
  const answersRaw = row.answers;
  let answers: Record<string, unknown> = {};
  if (typeof answersRaw === "string") {
    try {
      answers = JSON.parse(answersRaw) as Record<string, unknown>;
    } catch {
      answers = {};
    }
  } else if (answersRaw && typeof answersRaw === "object") {
    answers = answersRaw as Record<string, unknown>;
  }

  return {
    id: String(row.id),
    formId: String(row.form_id),
    campaignId: String(row.campaign_id),
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : null,
    ownerName: row.owner_name ? String(row.owner_name) : null,
    ownerProvince: row.owner_province ? String(row.owner_province) : null,
    ownerCity: row.owner_city ? String(row.owner_city) : null,
    ownerMinistryId: row.owner_ministry_id ? String(row.owner_ministry_id) : null,
    ownerMinistryName: row.owner_ministry_name ? String(row.owner_ministry_name) : null,
    ownerOrganizationId: row.owner_organization_id
      ? String(row.owner_organization_id)
      : null,
    ownerOrganizationName: row.owner_organization_name
      ? String(row.owner_organization_name)
      : null,
    answers,
    status: (row.status as CampaignFormResponseStatus) ?? "submitted",
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    formTitle: row.form_title ? String(row.form_title) : undefined,
  };
}

export async function pgListCampaignForms(
  campaignId: string,
  options?: { publishedOnly?: boolean }
): Promise<CampaignForm[]> {
  const sql = getSql();
  const rows = options?.publishedOnly
    ? await sql`
        SELECT
          f.*,
          (
            SELECT COUNT(*)::int FROM campaign_form_responses r WHERE r.form_id = f.id
          ) AS response_count
        FROM campaign_forms f
        WHERE f.campaign_id = ${campaignId}
          AND f.status = 'published'
        ORDER BY f.sort_order ASC, f.created_at DESC
      `
    : await sql`
        SELECT
          f.*,
          (
            SELECT COUNT(*)::int FROM campaign_form_responses r WHERE r.form_id = f.id
          ) AS response_count
        FROM campaign_forms f
        WHERE f.campaign_id = ${campaignId}
        ORDER BY f.sort_order ASC, f.created_at DESC
      `;

  return rows.map((row) => mapFormFromDb(row as Record<string, unknown>));
}

export async function pgGetCampaignForm(
  formId: string
): Promise<CampaignForm | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      f.*,
      (
        SELECT COUNT(*)::int FROM campaign_form_responses r WHERE r.form_id = f.id
      ) AS response_count
    FROM campaign_forms f
    WHERE f.id = ${formId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapFormFromDb(rows[0] as Record<string, unknown>);
}

export async function pgSaveCampaignForm(data: {
  id?: string;
  campaignId: string;
  title: string;
  description: string;
  fields: FormField[];
  status: CampaignFormStatus;
  sortOrder?: number;
  createdBy?: string | null;
}): Promise<{ success: true; form: CampaignForm } | { success: false; error: string }> {
  const sql = getSql();
  const now = new Date().toISOString();
  const fieldsJson = JSON.parse(JSON.stringify(data.fields));
  const sortOrder = data.sortOrder ?? 0;

  if (data.id) {
    const rows = await sql`
      UPDATE campaign_forms
      SET
        title = ${data.title},
        description = ${data.description},
        fields = ${sql.json(fieldsJson)},
        status = ${data.status},
        sort_order = ${sortOrder},
        updated_at = ${now}
      WHERE id = ${data.id}
        AND campaign_id = ${data.campaignId}
      RETURNING *
    `;
    if (!rows[0]) {
      return { success: false, error: "فرم یافت نشد" };
    }
    return {
      success: true,
      form: mapFormFromDb(rows[0] as Record<string, unknown>),
    };
  }

  const rows = await sql`
    INSERT INTO campaign_forms (
      campaign_id, title, description, fields, status, sort_order, created_by, created_at, updated_at
    ) VALUES (
      ${data.campaignId},
      ${data.title},
      ${data.description},
      ${sql.json(fieldsJson)},
      ${data.status},
      ${sortOrder},
      ${data.createdBy ?? null},
      ${now},
      ${now}
    )
    RETURNING *
  `;

  return {
    success: true,
    form: mapFormFromDb(rows[0] as Record<string, unknown>),
  };
}

export async function pgDeleteCampaignForm(
  formId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM campaign_forms WHERE id = ${formId} RETURNING id
  `;
  if (!rows[0]) {
    return { success: false, error: "فرم یافت نشد" };
  }
  return { success: true };
}

export async function pgListFormResponses(options: {
  campaignId: string;
  formId?: string;
  ownerUserId?: string;
}): Promise<CampaignFormResponse[]> {
  const sql = getSql();
  const { campaignId, formId, ownerUserId } = options;

  if (formId && ownerUserId) {
    const rows = await sql`
      SELECT
        r.*,
        f.title AS form_title,
        u.name AS owner_name,
        u.province AS owner_province,
        u.city AS owner_city,
        u.ministry_id AS owner_ministry_id,
        om.name AS owner_ministry_name,
        u.organization_id AS owner_organization_id,
        oo.name AS owner_organization_name
      FROM campaign_form_responses r
      JOIN campaign_forms f ON f.id = r.form_id
      LEFT JOIN users u ON u.id = r.owner_user_id
      LEFT JOIN ministries om ON om.id = u.ministry_id
      LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
      WHERE r.campaign_id = ${campaignId}
        AND r.form_id = ${formId}
        AND r.owner_user_id = ${ownerUserId}
      ORDER BY r.created_at DESC
    `;
    return rows.map((row) => mapResponseFromDb(row as Record<string, unknown>));
  }

  if (formId) {
    const rows = await sql`
      SELECT
        r.*,
        f.title AS form_title,
        u.name AS owner_name,
        u.province AS owner_province,
        u.city AS owner_city,
        u.ministry_id AS owner_ministry_id,
        om.name AS owner_ministry_name,
        u.organization_id AS owner_organization_id,
        oo.name AS owner_organization_name
      FROM campaign_form_responses r
      JOIN campaign_forms f ON f.id = r.form_id
      LEFT JOIN users u ON u.id = r.owner_user_id
      LEFT JOIN ministries om ON om.id = u.ministry_id
      LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
      WHERE r.campaign_id = ${campaignId}
        AND r.form_id = ${formId}
      ORDER BY r.created_at DESC
    `;
    return rows.map((row) => mapResponseFromDb(row as Record<string, unknown>));
  }

  if (ownerUserId) {
    const rows = await sql`
      SELECT
        r.*,
        f.title AS form_title,
        u.name AS owner_name,
        u.province AS owner_province,
        u.city AS owner_city,
        u.ministry_id AS owner_ministry_id,
        om.name AS owner_ministry_name,
        u.organization_id AS owner_organization_id,
        oo.name AS owner_organization_name
      FROM campaign_form_responses r
      JOIN campaign_forms f ON f.id = r.form_id
      LEFT JOIN users u ON u.id = r.owner_user_id
      LEFT JOIN ministries om ON om.id = u.ministry_id
      LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
      WHERE r.campaign_id = ${campaignId}
        AND r.owner_user_id = ${ownerUserId}
      ORDER BY r.created_at DESC
    `;
    return rows.map((row) => mapResponseFromDb(row as Record<string, unknown>));
  }

  const rows = await sql`
    SELECT
      r.*,
      f.title AS form_title,
      u.name AS owner_name,
      u.province AS owner_province,
      u.city AS owner_city,
      u.ministry_id AS owner_ministry_id,
      om.name AS owner_ministry_name,
      u.organization_id AS owner_organization_id,
      oo.name AS owner_organization_name
    FROM campaign_form_responses r
    JOIN campaign_forms f ON f.id = r.form_id
    LEFT JOIN users u ON u.id = r.owner_user_id
    LEFT JOIN ministries om ON om.id = u.ministry_id
    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE r.campaign_id = ${campaignId}
    ORDER BY r.created_at DESC
  `;
  return rows.map((row) => mapResponseFromDb(row as Record<string, unknown>));
}

export async function pgSubmitFormResponse(data: {
  formId: string;
  campaignId: string;
  ownerUserId: string | null;
  answers: Record<string, unknown>;
}): Promise<
  { success: true; response: CampaignFormResponse } | { success: false; error: string }
> {
  const sql = getSql();
  const now = new Date().toISOString();
  const answersJson = JSON.parse(JSON.stringify(data.answers));

  const rows = await sql`
    INSERT INTO campaign_form_responses (
      form_id, campaign_id, owner_user_id, answers, status, created_at, updated_at
    ) VALUES (
      ${data.formId},
      ${data.campaignId},
      ${data.ownerUserId},
      ${sql.json(answersJson)},
      'submitted',
      ${now},
      ${now}
    )
    RETURNING *
  `;

  return {
    success: true,
    response: mapResponseFromDb(rows[0] as Record<string, unknown>),
  };
}

export async function pgDeleteFormResponse(
  responseId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM campaign_form_responses WHERE id = ${responseId} RETURNING id
  `;
  if (!rows[0]) {
    return { success: false, error: "پاسخ یافت نشد" };
  }
  return { success: true };
}

export async function pgGetFormResponse(
  responseId: string
): Promise<CampaignFormResponse | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      r.*,
      f.title AS form_title,
      u.name AS owner_name,
      u.province AS owner_province,
      u.city AS owner_city,
      u.ministry_id AS owner_ministry_id,
      om.name AS owner_ministry_name,
      u.organization_id AS owner_organization_id,
      oo.name AS owner_organization_name
    FROM campaign_form_responses r
    JOIN campaign_forms f ON f.id = r.form_id
    LEFT JOIN users u ON u.id = r.owner_user_id
    LEFT JOIN ministries om ON om.id = u.ministry_id
    LEFT JOIN ministry_organizations oo ON oo.id = u.organization_id
    WHERE r.id = ${responseId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapResponseFromDb(rows[0] as Record<string, unknown>);
}
