import { normalizePlanLabels } from "@/lib/content-topics";
import { getSql } from "@/lib/db/client";
import type { PublishableProductionItem, ProductionSourceType } from "@/lib/production-source";
import { isPostgresConfigured } from "@/lib/utils";

function parsePlanLabelsColumn(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

function parseContentKind(value: unknown): "news" | "text" | null {
  if (value === "news" || value === "text") return value;
  return null;
}

function mapRow(row: Record<string, unknown>): PublishableProductionItem {
  const type = String(row.type) as ProductionSourceType;
  return {
    id: String(row.id),
    type,
    title: String(row.title ?? ""),
    subtitle: row.subtitle != null && String(row.subtitle).trim() ? String(row.subtitle) : null,
    mediaUrl: row.media_url != null && String(row.media_url).trim() ? String(row.media_url) : null,
    coverImageUrl:
      row.cover_image_url != null && String(row.cover_image_url).trim()
        ? String(row.cover_image_url)
        : null,
    body: row.body != null && String(row.body).trim() ? String(row.body) : null,
    planLabels: normalizePlanLabels(
      parsePlanLabelsColumn(row.plan_labels),
      row.plan_label != null ? String(row.plan_label) : null
    ),
    contentKind: parseContentKind(row.content_kind),
    ownerUserId: row.owner_user_id != null ? String(row.owner_user_id) : null,
    createdAt: toIsoString(row.created_at),
    directiveId:
      row.directive_id != null && String(row.directive_id).trim()
        ? String(row.directive_id)
        : null,
    directiveTitle:
      row.directive_title != null && String(row.directive_title).trim()
        ? String(row.directive_title)
        : null,
    assetCategory:
      row.asset_category != null && String(row.asset_category).trim()
        ? String(row.asset_category)
        : null,
  };
}

/**
 * List campaign productions (and directive assets) that can be linked as a publish source.
 * When `includeAllOwners` is false and `ownerUserId` is set, non-directive rows are scoped to that owner;
 * directive assets for the campaign are always included.
 */
export async function pgListPublishableProductions(
  campaignId: string,
  ownerUserId?: string | null,
  options?: { includeAllOwners?: boolean }
): Promise<PublishableProductionItem[]> {
  if (!isPostgresConfigured()) return [];

  const includeAllOwners = Boolean(options?.includeAllOwners) || !ownerUserId;
  const sql = getSql();

  const posterOwnerFilter = includeAllOwners
    ? sql``
    : sql`AND p.owner_user_id = ${ownerUserId}`;

  const videoOwnerFilter = includeAllOwners
    ? sql``
    : sql`AND v.owner_user_id = ${ownerUserId}`;

  const fileOwnerFilter = includeAllOwners
    ? sql``
    : sql`AND f.owner_user_id = ${ownerUserId}`;

  const rawOwnerFilter = includeAllOwners
    ? sql``
    : sql`AND r.owner_user_id = ${ownerUserId}`;

  const textOwnerFilter = includeAllOwners
    ? sql``
    : sql`AND t.owner_user_id = ${ownerUserId}`;

  const rows = await sql`
    (
      SELECT
        p.id,
        'poster'::text AS type,
        p.title,
        p.description AS subtitle,
        pv.image_url AS media_url,
        pv.thumbnail_url AS cover_image_url,
        NULL::text AS body,
        p.plan_labels,
        p.plan_label,
        NULL::text AS content_kind,
        p.owner_user_id,
        p.created_at,
        NULL::uuid AS directive_id,
        NULL::text AS directive_title,
        NULL::text AS asset_category
      FROM posters p
      LEFT JOIN LATERAL (
        SELECT image_url, thumbnail_url
        FROM poster_versions
        WHERE poster_id = p.id
        ORDER BY is_final DESC, version_number DESC
        LIMIT 1
      ) pv ON true
      WHERE p.campaign_id = ${campaignId}
      ${posterOwnerFilter}
    )
    UNION ALL
    (
      SELECT
        v.id,
        'video'::text AS type,
        v.title,
        v.description AS subtitle,
        vv.video_url AS media_url,
        vv.thumbnail_url AS cover_image_url,
        NULL::text AS body,
        v.plan_labels,
        v.plan_label,
        NULL::text AS content_kind,
        v.owner_user_id,
        v.created_at,
        NULL::uuid AS directive_id,
        NULL::text AS directive_title,
        NULL::text AS asset_category
      FROM videos v
      LEFT JOIN LATERAL (
        SELECT video_url, thumbnail_url
        FROM video_versions
        WHERE video_id = v.id
        ORDER BY is_final DESC, version_number DESC
        LIMIT 1
      ) vv ON true
      WHERE v.campaign_id = ${campaignId}
      ${videoOwnerFilter}
    )
    UNION ALL
    (
      SELECT
        f.id,
        'file'::text AS type,
        f.title,
        f.description AS subtitle,
        f.file_url AS media_url,
        NULL::text AS cover_image_url,
        NULL::text AS body,
        f.plan_labels,
        f.plan_label,
        NULL::text AS content_kind,
        f.owner_user_id,
        f.created_at,
        NULL::uuid AS directive_id,
        NULL::text AS directive_title,
        NULL::text AS asset_category
      FROM campaign_files f
      WHERE f.campaign_id = ${campaignId}
      ${fileOwnerFilter}
    )
    UNION ALL
    (
      SELECT
        r.id,
        'raw_media'::text AS type,
        r.title,
        r.description AS subtitle,
        r.file_url AS media_url,
        NULL::text AS cover_image_url,
        NULL::text AS body,
        r.plan_labels,
        r.plan_label,
        NULL::text AS content_kind,
        r.owner_user_id,
        r.created_at,
        NULL::uuid AS directive_id,
        NULL::text AS directive_title,
        NULL::text AS asset_category
      FROM raw_media_uploads r
      WHERE r.campaign_id = ${campaignId}
      ${rawOwnerFilter}
    )
    UNION ALL
    (
      SELECT
        t.id,
        'text_content'::text AS type,
        t.title,
        t.description AS subtitle,
        t.attachment_url AS media_url,
        t.cover_image_url AS cover_image_url,
        t.body AS body,
        t.plan_labels,
        t.plan_label,
        t.content_kind::text AS content_kind,
        t.owner_user_id,
        t.created_at,
        NULL::uuid AS directive_id,
        NULL::text AS directive_title,
        NULL::text AS asset_category
      FROM text_contents t
      WHERE t.campaign_id = ${campaignId}
      ${textOwnerFilter}
    )
    UNION ALL
    (
      SELECT
        a.id,
        'directive_asset'::text AS type,
        a.title,
        COALESCE(NULLIF(TRIM(a.description), ''), a.category) AS subtitle,
        av.file_url AS media_url,
        NULL::text AS cover_image_url,
        av.content_text AS body,
        CASE
          WHEN NULLIF(TRIM(d.topic), '') IS NOT NULL
          THEN jsonb_build_array(TRIM(d.topic))
          ELSE '[]'::jsonb
        END AS plan_labels,
        NULL::text AS plan_label,
        NULL::text AS content_kind,
        NULL::uuid AS owner_user_id,
        a.created_at,
        a.directive_id AS directive_id,
        d.title AS directive_title,
        a.category AS asset_category
      FROM directive_workspace_assets a
      INNER JOIN campaign_directives d ON d.id = a.directive_id
      LEFT JOIN LATERAL (
        SELECT file_url, content_text
        FROM directive_workspace_asset_versions
        WHERE asset_id = a.id
        ORDER BY version_number DESC
        LIMIT 1
      ) av ON true
      WHERE d.campaign_id = ${campaignId}
        AND a.category IN ('poster', 'video', 'banner', 'ready_text', 'social', 'print')
    )
    ORDER BY created_at DESC
    LIMIT 500
  `;

  return (rows as Record<string, unknown>[]).map(mapRow);
}
