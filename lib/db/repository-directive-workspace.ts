import { getSql } from "@/lib/db/client";
import {
  isDirectiveUrgency,
  isWorkspaceAssetCategory,
} from "@/lib/directive-workspace";
import type {
  DirectiveAssetEventType,
  DirectiveReplacementAlert,
  DirectiveReplacementAlertStatus,
  DirectiveUrgency,
  DirectiveWorkspaceAsset,
  DirectiveWorkspaceAssetCategory,
  DirectiveWorkspaceAssetVersion,
  DirectiveWorkspaceBundle,
  DirectiveWorkspaceFaqItem,
  DirectiveWorkspaceKpi,
  DirectiveWorkspaceMeta,
} from "@/lib/types";
import { pgGetDirectiveById } from "@/lib/db/repository-directives";
import { generateId } from "@/lib/utils";

function toIsoString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function asUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function parseKpis(value: unknown): DirectiveWorkspaceKpi[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = String(row.title ?? "").trim();
      if (!title) return null;
      return {
        id: String(row.id ?? generateId()),
        title,
        target: Number(row.target ?? 0),
        unit: String(row.unit ?? "").trim(),
      };
    })
    .filter((item): item is DirectiveWorkspaceKpi => Boolean(item));
}

function parseFaq(value: unknown): DirectiveWorkspaceFaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const question = String(row.question ?? "").trim();
      if (!question) return null;
      return {
        id: String(row.id ?? generateId()),
        question,
        answer: String(row.answer ?? "").trim(),
      };
    })
    .filter((item): item is DirectiveWorkspaceFaqItem => Boolean(item));
}

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function mapUrgency(value: unknown): DirectiveUrgency {
  return isDirectiveUrgency(value) ? value : "normal";
}

function mapCategory(value: unknown): DirectiveWorkspaceAssetCategory {
  return isWorkspaceAssetCategory(value) ? value : "reference";
}

function mapAlertStatus(value: unknown): DirectiveReplacementAlertStatus {
  if (value === "acked" || value === "replaced" || value === "pending") return value;
  return "pending";
}

function mapVersion(row: Record<string, unknown>): DirectiveWorkspaceAssetVersion {
  return {
    id: String(row.id),
    assetId: String(row.asset_id),
    versionNumber: Number(row.version_number ?? 1),
    contentText: row.content_text != null ? String(row.content_text) : null,
    fileUrl: row.file_url ? String(row.file_url) : null,
    fileName: row.file_name ? String(row.file_name) : null,
    mimeType: row.mime_type ? String(row.mime_type) : null,
    fileSize: Number(row.file_size ?? 0),
    changeNote: String(row.change_note ?? ""),
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    createdByName: row.created_by_name ? String(row.created_by_name) : null,
    isCurrent: Boolean(row.is_current),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

function mapMeta(row: Record<string, unknown>): DirectiveWorkspaceMeta {
  return {
    directiveId: String(row.id),
    objective: String(row.objective ?? ""),
    expectedResults: String(row.expected_results ?? ""),
    urgency: mapUrgency(row.urgency),
    mandatoryActions: parseStringList(row.mandatory_actions),
    suggestedActions: parseStringList(row.suggested_actions),
    kpis: parseKpis(row.kpis),
    brandGuide: String(row.brand_guide ?? ""),
    executionGuide: String(row.execution_guide ?? ""),
    approvalRequirements: String(row.approval_requirements ?? ""),
    centralOwnerUserId: row.central_owner_user_id ? String(row.central_owner_user_id) : null,
    centralOwnerLabel: row.central_owner_label ? String(row.central_owner_label) : null,
    centralOwnerName: row.central_owner_name ? String(row.central_owner_name) : null,
    faq: parseFaq(row.faq),
    targetMinistryIds: asUuidArray(row.target_ministry_ids),
    targetOrganizationIds: asUuidArray(row.target_organization_ids),
    targetProvinces: asStringArray(row.target_provinces),
    targetCities: asStringArray(row.target_cities),
  };
}

function mapAlert(row: Record<string, unknown>): DirectiveReplacementAlert {
  return {
    id: String(row.id),
    directiveId: String(row.directive_id),
    directiveTitle: String(row.directive_title ?? ""),
    campaignId: String(row.campaign_id ?? ""),
    assetId: String(row.asset_id),
    assetTitle: String(row.asset_title ?? ""),
    assetCategory: mapCategory(row.asset_category),
    oldVersionId: String(row.old_version_id),
    oldVersionNumber: Number(row.old_version_number ?? 0),
    newVersionId: String(row.new_version_id),
    newVersionNumber: Number(row.new_version_number ?? 0),
    userId: String(row.user_id),
    userName: row.user_name ? String(row.user_name) : null,
    ministryId: row.ministry_id ? String(row.ministry_id) : null,
    ministryName: row.ministry_name ? String(row.ministry_name) : null,
    organizationId: row.organization_id ? String(row.organization_id) : null,
    organizationName: row.organization_name ? String(row.organization_name) : null,
    status: mapAlertStatus(row.status),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    ackedAt: toIsoString(row.acked_at),
  };
}

export async function pgGetDirectiveWorkspaceMeta(
  directiveId: string
): Promise<DirectiveWorkspaceMeta | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      d.id,
      d.objective,
      d.expected_results,
      d.urgency,
      d.mandatory_actions,
      d.suggested_actions,
      d.kpis,
      d.brand_guide,
      d.execution_guide,
      d.approval_requirements,
      d.central_owner_user_id,
      d.central_owner_label,
      d.faq,
      d.target_ministry_ids,
      d.target_organization_ids,
      d.target_provinces,
      d.target_cities,
      owner.name AS central_owner_name
    FROM campaign_directives d
    LEFT JOIN users owner ON owner.id = d.central_owner_user_id
    WHERE d.id = ${directiveId}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return mapMeta(rows[0] as Record<string, unknown>);
}

export async function pgSaveDirectiveWorkspaceMeta(
  directiveId: string,
  input: Omit<DirectiveWorkspaceMeta, "directiveId" | "centralOwnerName">
): Promise<void> {
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`
    UPDATE campaign_directives SET
      objective = ${input.objective},
      expected_results = ${input.expectedResults},
      urgency = ${input.urgency},
      mandatory_actions = ${sql.json(JSON.parse(JSON.stringify(input.mandatoryActions)))},
      suggested_actions = ${sql.json(JSON.parse(JSON.stringify(input.suggestedActions)))},
      kpis = ${sql.json(JSON.parse(JSON.stringify(input.kpis)))},
      brand_guide = ${input.brandGuide},
      execution_guide = ${input.executionGuide},
      approval_requirements = ${input.approvalRequirements},
      central_owner_user_id = ${input.centralOwnerUserId ?? null},
      central_owner_label = ${input.centralOwnerLabel?.trim() || null},
      faq = ${sql.json(JSON.parse(JSON.stringify(input.faq)))},
      target_ministry_ids = ${input.targetMinistryIds},
      target_organization_ids = ${input.targetOrganizationIds},
      target_provinces = ${input.targetProvinces},
      target_cities = ${input.targetCities},
      updated_at = ${now}
    WHERE id = ${directiveId}
  `;
}

async function loadVersionsForAssets(
  assetIds: string[]
): Promise<Map<string, DirectiveWorkspaceAssetVersion[]>> {
  const map = new Map<string, DirectiveWorkspaceAssetVersion[]>();
  if (assetIds.length === 0) return map;

  const sql = getSql();
  const rows = await sql`
    SELECT
      v.*,
      creator.name AS created_by_name
    FROM directive_workspace_asset_versions v
    LEFT JOIN users creator ON creator.id = v.created_by_user_id
    WHERE v.asset_id IN ${sql(assetIds)}
    ORDER BY v.version_number DESC
  `;

  for (const row of rows) {
    const version = mapVersion(row as Record<string, unknown>);
    const list = map.get(version.assetId) ?? [];
    list.push(version);
    map.set(version.assetId, list);
  }
  return map;
}

export async function pgListDirectiveWorkspaceAssets(
  directiveId: string
): Promise<DirectiveWorkspaceAsset[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM directive_workspace_assets
    WHERE directive_id = ${directiveId}
    ORDER BY sort_order ASC, created_at ASC
  `;

  const ids = rows.map((row) => String(row.id));
  const versionsMap = await loadVersionsForAssets(ids);

  return rows.map((row) => {
    const id = String(row.id);
    const versions = versionsMap.get(id) ?? [];
    return {
      id,
      directiveId: String(row.directive_id),
      category: mapCategory(row.category),
      title: String(row.title ?? ""),
      description: String(row.description ?? ""),
      printSize: row.print_size ? String(row.print_size) : null,
      sortOrder: Number(row.sort_order ?? 0),
      currentVersion: versions.find((item) => item.isCurrent) ?? versions[0] ?? null,
      versions,
      createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
      updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
    };
  });
}

export async function pgGetDirectiveWorkspaceBundle(
  directiveId: string,
  options?: { pendingAlertsForUserId?: string | null }
): Promise<DirectiveWorkspaceBundle | null> {
  const directive = await pgGetDirectiveById(directiveId);
  if (!directive) return null;

  const [meta, assets] = await Promise.all([
    pgGetDirectiveWorkspaceMeta(directiveId),
    pgListDirectiveWorkspaceAssets(directiveId),
  ]);
  if (!meta) return null;

  let pendingAlertCount = 0;
  if (options?.pendingAlertsForUserId) {
    const alerts = await pgListReplacementAlertsForUser(options.pendingAlertsForUserId, {
      directiveId,
      status: "pending",
    });
    pendingAlertCount = alerts.length;
  } else {
    const sql = getSql();
    const rows = await sql`
      SELECT COUNT(*)::int AS count
      FROM directive_replacement_alerts
      WHERE directive_id = ${directiveId} AND status = 'pending'
    `;
    pendingAlertCount = Number(rows[0]?.count ?? 0);
  }

  return { directive, meta, assets, pendingAlertCount };
}

export async function pgCreateDirectiveWorkspaceAsset(input: {
  directiveId: string;
  category: DirectiveWorkspaceAssetCategory;
  title: string;
  description?: string;
  printSize?: string | null;
  contentText?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
  changeNote?: string;
  createdByUserId?: string | null;
}): Promise<{ assetId: string; versionId: string }> {
  const sql = getSql();
  const now = new Date().toISOString();
  const assetId = generateId();
  const versionId = generateId();

  const sortRows = await sql`
    SELECT COALESCE(MAX(sort_order), -1)::int AS max_sort
    FROM directive_workspace_assets
    WHERE directive_id = ${input.directiveId}
  `;
  const sortOrder = Number(sortRows[0]?.max_sort ?? -1) + 1;

  await sql`
    INSERT INTO directive_workspace_assets (
      id, directive_id, category, title, description, print_size, sort_order, created_at, updated_at
    ) VALUES (
      ${assetId},
      ${input.directiveId},
      ${input.category},
      ${input.title.trim()},
      ${input.description?.trim() ?? ""},
      ${input.printSize?.trim() || null},
      ${sortOrder},
      ${now},
      ${now}
    )
  `;

  await sql`
    INSERT INTO directive_workspace_asset_versions (
      id, asset_id, version_number, content_text, file_url, file_name, mime_type, file_size,
      change_note, created_by_user_id, is_current, created_at
    ) VALUES (
      ${versionId},
      ${assetId},
      1,
      ${input.contentText?.trim() || null},
      ${input.fileUrl?.trim() || null},
      ${input.fileName?.trim() || null},
      ${input.mimeType?.trim() || null},
      ${Number(input.fileSize ?? 0)},
      ${input.changeNote?.trim() || "نسخه اولیه"},
      ${input.createdByUserId ?? null},
      true,
      ${now}
    )
  `;

  return { assetId, versionId };
}

export async function pgAddDirectiveWorkspaceAssetVersion(input: {
  assetId: string;
  contentText?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
  changeNote?: string;
  createdByUserId?: string | null;
}): Promise<{ versionId: string; versionNumber: number; alertCount: number }> {
  const sql = getSql();
  const now = new Date().toISOString();

  const assetRows = await sql`
    SELECT id, directive_id, title
    FROM directive_workspace_assets
    WHERE id = ${input.assetId}
    LIMIT 1
  `;
  if (assetRows.length === 0) {
    throw new Error("ASSET_NOT_FOUND");
  }
  const directiveId = String(assetRows[0].directive_id);

  const currentRows = await sql`
    SELECT id, version_number
    FROM directive_workspace_asset_versions
    WHERE asset_id = ${input.assetId} AND is_current = true
    ORDER BY version_number DESC
    LIMIT 1
  `;
  const previousVersionId = currentRows[0] ? String(currentRows[0].id) : null;
  const nextNumber = currentRows[0] ? Number(currentRows[0].version_number) + 1 : 1;
  const versionId = generateId();

  await sql`
    UPDATE directive_workspace_asset_versions
    SET is_current = false
    WHERE asset_id = ${input.assetId}
  `;

  await sql`
    INSERT INTO directive_workspace_asset_versions (
      id, asset_id, version_number, content_text, file_url, file_name, mime_type, file_size,
      change_note, created_by_user_id, is_current, created_at
    ) VALUES (
      ${versionId},
      ${input.assetId},
      ${nextNumber},
      ${input.contentText?.trim() || null},
      ${input.fileUrl?.trim() || null},
      ${input.fileName?.trim() || null},
      ${input.mimeType?.trim() || null},
      ${Number(input.fileSize ?? 0)},
      ${input.changeNote?.trim() || `نسخه ${nextNumber}`},
      ${input.createdByUserId ?? null},
      true,
      ${now}
    )
  `;

  await sql`
    UPDATE directive_workspace_assets
    SET updated_at = ${now}
    WHERE id = ${input.assetId}
  `;

  let alertCount = 0;
  if (previousVersionId) {
    alertCount = await createReplacementAlertsForPreviousHolders({
      directiveId,
      assetId: input.assetId,
      oldVersionId: previousVersionId,
      newVersionId: versionId,
    });
  }

  return { versionId, versionNumber: nextNumber, alertCount };
}

async function createReplacementAlertsForPreviousHolders(input: {
  directiveId: string;
  assetId: string;
  oldVersionId: string;
  newVersionId: string;
}): Promise<number> {
  const sql = getSql();
  const now = new Date().toISOString();

  const holders = await sql`
    SELECT DISTINCT ON (e.user_id)
      e.user_id,
      e.ministry_id,
      e.organization_id
    FROM directive_workspace_asset_events e
    WHERE e.asset_id = ${input.assetId}
      AND e.version_id = ${input.oldVersionId}
      AND e.event_type IN ('downloaded', 'published')
    ORDER BY e.user_id, e.created_at DESC
  `;

  let created = 0;
  for (const holder of holders) {
    const alertId = generateId();
    const result = await sql`
      INSERT INTO directive_replacement_alerts (
        id, directive_id, asset_id, old_version_id, new_version_id,
        user_id, ministry_id, organization_id, status, created_at
      ) VALUES (
        ${alertId},
        ${input.directiveId},
        ${input.assetId},
        ${input.oldVersionId},
        ${input.newVersionId},
        ${String(holder.user_id)},
        ${holder.ministry_id ? String(holder.ministry_id) : null},
        ${holder.organization_id ? String(holder.organization_id) : null},
        'pending',
        ${now}
      )
      ON CONFLICT (asset_id, new_version_id, user_id) DO NOTHING
      RETURNING id
    `;
    if (result.length > 0) created += 1;
  }
  return created;
}

export async function pgDeleteDirectiveWorkspaceAsset(assetId: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM directive_workspace_assets WHERE id = ${assetId}`;
}

export async function pgRecordDirectiveAssetEvent(input: {
  assetId: string;
  versionId: string;
  userId: string;
  ministryId?: string | null;
  organizationId?: string | null;
  eventType: DirectiveAssetEventType;
}): Promise<void> {
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO directive_workspace_asset_events (
      id, asset_id, version_id, user_id, ministry_id, organization_id, event_type, created_at
    ) VALUES (
      ${generateId()},
      ${input.assetId},
      ${input.versionId},
      ${input.userId},
      ${input.ministryId ?? null},
      ${input.organizationId ?? null},
      ${input.eventType},
      ${now}
    )
  `;
}

export async function pgListReplacementAlertsForUser(
  userId: string,
  options?: { directiveId?: string; status?: DirectiveReplacementAlertStatus; campaignId?: string }
): Promise<DirectiveReplacementAlert[]> {
  const sql = getSql();
  const status = options?.status ?? null;
  const directiveId = options?.directiveId ?? null;
  const campaignId = options?.campaignId ?? null;

  const rows = await sql`
    SELECT
      a.*,
      d.title AS directive_title,
      d.campaign_id,
      asset.title AS asset_title,
      asset.category AS asset_category,
      old_v.version_number AS old_version_number,
      new_v.version_number AS new_version_number,
      u.name AS user_name,
      m.name AS ministry_name,
      o.name AS organization_name
    FROM directive_replacement_alerts a
    INNER JOIN campaign_directives d ON d.id = a.directive_id
    INNER JOIN directive_workspace_assets asset ON asset.id = a.asset_id
    INNER JOIN directive_workspace_asset_versions old_v ON old_v.id = a.old_version_id
    INNER JOIN directive_workspace_asset_versions new_v ON new_v.id = a.new_version_id
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN ministries m ON m.id = a.ministry_id
    LEFT JOIN ministry_organizations o ON o.id = a.organization_id
    WHERE a.user_id = ${userId}
      AND (${status}::text IS NULL OR a.status = ${status})
      AND (${directiveId}::uuid IS NULL OR a.directive_id = ${directiveId})
      AND (${campaignId}::uuid IS NULL OR d.campaign_id = ${campaignId})
    ORDER BY a.created_at DESC
  `;

  return rows.map((row) => mapAlert(row as Record<string, unknown>));
}

export async function pgListReplacementAlertsForDirective(
  directiveId: string,
  options?: { status?: DirectiveReplacementAlertStatus }
): Promise<DirectiveReplacementAlert[]> {
  const sql = getSql();
  const status = options?.status ?? null;

  const rows = await sql`
    SELECT
      a.*,
      d.title AS directive_title,
      d.campaign_id,
      asset.title AS asset_title,
      asset.category AS asset_category,
      old_v.version_number AS old_version_number,
      new_v.version_number AS new_version_number,
      u.name AS user_name,
      m.name AS ministry_name,
      o.name AS organization_name
    FROM directive_replacement_alerts a
    INNER JOIN campaign_directives d ON d.id = a.directive_id
    INNER JOIN directive_workspace_assets asset ON asset.id = a.asset_id
    INNER JOIN directive_workspace_asset_versions old_v ON old_v.id = a.old_version_id
    INNER JOIN directive_workspace_asset_versions new_v ON new_v.id = a.new_version_id
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN ministries m ON m.id = a.ministry_id
    LEFT JOIN ministry_organizations o ON o.id = a.organization_id
    WHERE a.directive_id = ${directiveId}
      AND (${status}::text IS NULL OR a.status = ${status})
    ORDER BY a.created_at DESC
  `;

  return rows.map((row) => mapAlert(row as Record<string, unknown>));
}

export async function pgAckReplacementAlert(
  alertId: string,
  userId: string,
  status: Extract<DirectiveReplacementAlertStatus, "acked" | "replaced"> = "acked"
): Promise<boolean> {
  const sql = getSql();
  const now = new Date().toISOString();
  const rows = await sql`
    UPDATE directive_replacement_alerts
    SET status = ${status}, acked_at = ${now}
    WHERE id = ${alertId} AND user_id = ${userId} AND status = 'pending'
    RETURNING id
  `;
  return rows.length > 0;
}

export async function pgListAssetVersionHolders(versionId: string): Promise<
  Array<{
    userId: string;
    userName: string;
    ministryId: string | null;
    ministryName: string | null;
    organizationId: string | null;
    organizationName: string | null;
    eventType: DirectiveAssetEventType;
    createdAt: string;
  }>
> {
  const sql = getSql();
  const rows = await sql`
    SELECT DISTINCT ON (e.user_id, e.event_type)
      e.user_id,
      e.ministry_id,
      e.organization_id,
      e.event_type,
      e.created_at,
      u.name AS user_name,
      m.name AS ministry_name,
      o.name AS organization_name
    FROM directive_workspace_asset_events e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN ministries m ON m.id = e.ministry_id
    LEFT JOIN ministry_organizations o ON o.id = e.organization_id
    WHERE e.version_id = ${versionId}
    ORDER BY e.user_id, e.event_type, e.created_at DESC
  `;

  return rows.map((row) => ({
    userId: String(row.user_id),
    userName: String(row.user_name ?? ""),
    ministryId: row.ministry_id ? String(row.ministry_id) : null,
    ministryName: row.ministry_name ? String(row.ministry_name) : null,
    organizationId: row.organization_id ? String(row.organization_id) : null,
    organizationName: row.organization_name ? String(row.organization_name) : null,
    eventType: (row.event_type === "published" ? "published" : "downloaded") as DirectiveAssetEventType,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  }));
}
