import { getSql } from "@/lib/db/client";
import {
  isStrategicRequestStatus,
  type StrategicRequestStatus,
  type StrategicUpwardRequest,
} from "@/lib/strategic-requests";
import { isPostgresConfigured } from "@/lib/utils";

let tableReady: Promise<void> | null = null;

export async function ensureStrategicUpwardRequestsTable(): Promise<void> {
  if (!isPostgresConfigured()) return;
  if (!tableReady) {
    tableReady = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS strategic_upward_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
          requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'reviewing', 'answered', 'closed')),
          response_body TEXT,
          responded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          responded_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_strategic_upward_requests_campaign
          ON strategic_upward_requests(campaign_id, created_at DESC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_strategic_upward_requests_target
          ON strategic_upward_requests(target_user_id, created_at DESC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_strategic_upward_requests_requester
          ON strategic_upward_requests(requester_user_id, created_at DESC)
      `;
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  await tableReady;
}

function mapRow(row: Record<string, unknown>): StrategicUpwardRequest {
  const statusRaw = String(row.status ?? "pending");
  const status: StrategicRequestStatus = isStrategicRequestStatus(statusRaw)
    ? statusRaw
    : "pending";
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    requesterUserId: String(row.requester_user_id),
    requesterName: row.requester_name ? String(row.requester_name) : null,
    requesterEmail: row.requester_email ? String(row.requester_email) : null,
    targetUserId: row.target_user_id ? String(row.target_user_id) : null,
    targetName: row.target_name ? String(row.target_name) : null,
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    status,
    responseBody: row.response_body ? String(row.response_body) : null,
    respondedByUserId: row.responded_by_user_id ? String(row.responded_by_user_id) : null,
    respondedByName: row.responded_by_name ? String(row.responded_by_name) : null,
    respondedAt: row.responded_at ? new Date(String(row.responded_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function pgListStrategicUpwardRequestsForCampaign(
  campaignId: string
): Promise<StrategicUpwardRequest[]> {
  await ensureStrategicUpwardRequestsTable();
  const sql = getSql();
  const rows = await sql`
    SELECT
      r.id,
      r.campaign_id,
      r.requester_user_id,
      req.name AS requester_name,
      req.email AS requester_email,
      r.target_user_id,
      tgt.name AS target_name,
      r.title,
      r.body,
      r.status,
      r.response_body,
      r.responded_by_user_id,
      resp.name AS responded_by_name,
      r.responded_at,
      r.created_at,
      r.updated_at
    FROM strategic_upward_requests r
    LEFT JOIN users req ON req.id = r.requester_user_id
    LEFT JOIN users tgt ON tgt.id = r.target_user_id
    LEFT JOIN users resp ON resp.id = r.responded_by_user_id
    WHERE r.campaign_id = ${campaignId}
    ORDER BY r.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function pgListStrategicUpwardRequestsForTarget(
  campaignId: string,
  targetUserId: string
): Promise<StrategicUpwardRequest[]> {
  await ensureStrategicUpwardRequestsTable();
  const sql = getSql();
  const rows = await sql`
    SELECT
      r.id,
      r.campaign_id,
      r.requester_user_id,
      req.name AS requester_name,
      req.email AS requester_email,
      r.target_user_id,
      tgt.name AS target_name,
      r.title,
      r.body,
      r.status,
      r.response_body,
      r.responded_by_user_id,
      resp.name AS responded_by_name,
      r.responded_at,
      r.created_at,
      r.updated_at
    FROM strategic_upward_requests r
    LEFT JOIN users req ON req.id = r.requester_user_id
    LEFT JOIN users tgt ON tgt.id = r.target_user_id
    LEFT JOIN users resp ON resp.id = r.responded_by_user_id
    WHERE r.campaign_id = ${campaignId}
      AND r.target_user_id = ${targetUserId}
    ORDER BY r.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function pgListStrategicUpwardRequestsByRequester(
  campaignId: string,
  requesterUserId: string
): Promise<StrategicUpwardRequest[]> {
  await ensureStrategicUpwardRequestsTable();
  const sql = getSql();
  const rows = await sql`
    SELECT
      r.id,
      r.campaign_id,
      r.requester_user_id,
      req.name AS requester_name,
      req.email AS requester_email,
      r.target_user_id,
      tgt.name AS target_name,
      r.title,
      r.body,
      r.status,
      r.response_body,
      r.responded_by_user_id,
      resp.name AS responded_by_name,
      r.responded_at,
      r.created_at,
      r.updated_at
    FROM strategic_upward_requests r
    LEFT JOIN users req ON req.id = r.requester_user_id
    LEFT JOIN users tgt ON tgt.id = r.target_user_id
    LEFT JOIN users resp ON resp.id = r.responded_by_user_id
    WHERE r.campaign_id = ${campaignId}
      AND r.requester_user_id = ${requesterUserId}
    ORDER BY r.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function pgGetStrategicUpwardRequestById(
  id: string
): Promise<StrategicUpwardRequest | null> {
  await ensureStrategicUpwardRequestsTable();
  const sql = getSql();
  const rows = await sql`
    SELECT
      r.id,
      r.campaign_id,
      r.requester_user_id,
      req.name AS requester_name,
      req.email AS requester_email,
      r.target_user_id,
      tgt.name AS target_name,
      r.title,
      r.body,
      r.status,
      r.response_body,
      r.responded_by_user_id,
      resp.name AS responded_by_name,
      r.responded_at,
      r.created_at,
      r.updated_at
    FROM strategic_upward_requests r
    LEFT JOIN users req ON req.id = r.requester_user_id
    LEFT JOIN users tgt ON tgt.id = r.target_user_id
    LEFT JOIN users resp ON resp.id = r.responded_by_user_id
    WHERE r.id = ${id}
    LIMIT 1
  `;
  const row = (rows as Record<string, unknown>[])[0];
  return row ? mapRow(row) : null;
}

export async function pgCreateStrategicUpwardRequest(input: {
  campaignId: string;
  requesterUserId: string;
  targetUserId?: string | null;
  title: string;
  body: string;
}): Promise<StrategicUpwardRequest> {
  await ensureStrategicUpwardRequestsTable();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO strategic_upward_requests (
      campaign_id,
      requester_user_id,
      target_user_id,
      title,
      body
    )
    VALUES (
      ${input.campaignId},
      ${input.requesterUserId},
      ${input.targetUserId ?? null},
      ${input.title.trim()},
      ${input.body.trim()}
    )
    RETURNING id
  `;
  const id = String((rows[0] as { id: string }).id);
  const created = await pgGetStrategicUpwardRequestById(id);
  if (!created) throw new Error("Failed to load created strategic request");
  return created;
}

export async function pgRespondStrategicUpwardRequest(input: {
  id: string;
  status: StrategicRequestStatus;
  responseBody: string;
  respondedByUserId: string;
}): Promise<StrategicUpwardRequest | null> {
  await ensureStrategicUpwardRequestsTable();
  const sql = getSql();
  await sql`
    UPDATE strategic_upward_requests
    SET
      status = ${input.status},
      response_body = ${input.responseBody.trim()},
      responded_by_user_id = ${input.respondedByUserId},
      responded_at = now(),
      updated_at = now()
    WHERE id = ${input.id}
  `;
  return pgGetStrategicUpwardRequestById(input.id);
}

export async function pgUpdateStrategicUpwardRequestStatus(input: {
  id: string;
  status: StrategicRequestStatus;
}): Promise<StrategicUpwardRequest | null> {
  await ensureStrategicUpwardRequestsTable();
  const sql = getSql();
  await sql`
    UPDATE strategic_upward_requests
    SET status = ${input.status}, updated_at = now()
    WHERE id = ${input.id}
  `;
  return pgGetStrategicUpwardRequestById(input.id);
}
