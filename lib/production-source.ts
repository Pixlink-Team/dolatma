import { getSql } from "@/lib/db/client";
import { isFullAdmin } from "@/lib/auth/get-session";
import type { AuthSession } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";
import {
  isProductionSourceType,
  type ProductionSourceFields,
  type ProductionSourceType,
} from "@/lib/production-source-shared";

export {
  isProductionSourceType,
  PRODUCTION_SOURCE_TYPE_LABELS,
  PRODUCTION_SOURCE_TYPES,
  READY_DIRECTIVE_ASSET_CATEGORIES,
  type ProductionSourceFields,
  type ProductionSourceType,
  type PublishableProductionItem,
} from "@/lib/production-source-shared";

export function normalizeProductionSource(
  data: ProductionSourceFields | null | undefined
): { sourceProductionType: ProductionSourceType | null; sourceProductionId: string | null } {
  const type = isProductionSourceType(data?.sourceProductionType)
    ? data!.sourceProductionType!
    : null;
  const id =
    typeof data?.sourceProductionId === "string" && data.sourceProductionId.trim()
      ? data.sourceProductionId.trim()
      : null;
  if (!type || !id) return { sourceProductionType: null, sourceProductionId: null };
  return { sourceProductionType: type, sourceProductionId: id };
}

/** Require source on create; allow legacy rows (updates without source) to keep null. */
export function requireProductionSourceOnCreate(
  data: ProductionSourceFields & { id?: string }
): { success: false; error: string } | null {
  if (data.id) return null;
  const { sourceProductionType, sourceProductionId } = normalizeProductionSource(data);
  if (!sourceProductionType || !sourceProductionId) {
    return {
      success: false,
      error: "برای ثبت نشر باید یک تولید (یا دارایی دستورکار) انتخاب شود",
    };
  }
  return null;
}

async function loadProductionOwner(
  type: ProductionSourceType,
  id: string,
  campaignId: string
): Promise<{ ownerUserId: string | null; found: boolean }> {
  if (!isPostgresConfigured()) return { ownerUserId: null, found: false };
  const sql = getSql();

  if (type === "poster") {
    const rows = await sql`
      SELECT owner_user_id FROM posters WHERE id = ${id} AND campaign_id = ${campaignId} LIMIT 1
    `;
    return {
      found: Boolean(rows[0]),
      ownerUserId: rows[0]?.owner_user_id ? String(rows[0].owner_user_id) : null,
    };
  }
  if (type === "video") {
    const rows = await sql`
      SELECT owner_user_id FROM videos WHERE id = ${id} AND campaign_id = ${campaignId} LIMIT 1
    `;
    return {
      found: Boolean(rows[0]),
      ownerUserId: rows[0]?.owner_user_id ? String(rows[0].owner_user_id) : null,
    };
  }
  if (type === "file") {
    const rows = await sql`
      SELECT owner_user_id FROM campaign_files WHERE id = ${id} AND campaign_id = ${campaignId} LIMIT 1
    `;
    return {
      found: Boolean(rows[0]),
      ownerUserId: rows[0]?.owner_user_id ? String(rows[0].owner_user_id) : null,
    };
  }
  if (type === "raw_media") {
    const rows = await sql`
      SELECT owner_user_id FROM raw_media_uploads WHERE id = ${id} AND campaign_id = ${campaignId} LIMIT 1
    `;
    return {
      found: Boolean(rows[0]),
      ownerUserId: rows[0]?.owner_user_id ? String(rows[0].owner_user_id) : null,
    };
  }
  if (type === "text_content") {
    const rows = await sql`
      SELECT owner_user_id FROM text_contents WHERE id = ${id} AND campaign_id = ${campaignId} LIMIT 1
    `;
    return {
      found: Boolean(rows[0]),
      ownerUserId: rows[0]?.owner_user_id ? String(rows[0].owner_user_id) : null,
    };
  }
  // directive_asset
  const rows = await sql`
    SELECT a.id, d.campaign_id
    FROM directive_workspace_assets a
    INNER JOIN campaign_directives d ON d.id = a.directive_id
    WHERE a.id = ${id} AND d.campaign_id = ${campaignId}
    LIMIT 1
  `;
  return { found: Boolean(rows[0]), ownerUserId: null };
}

/**
 * Contributors may only publish their own productions (or any campaign directive asset).
 * Admins/clients may use any campaign production.
 */
export async function assertProductionSourceAllowed(
  session: AuthSession,
  campaignId: string,
  data: ProductionSourceFields & { id?: string }
): Promise<{ success: false; error: string } | null> {
  const required = requireProductionSourceOnCreate(data);
  if (required) return required;

  const { sourceProductionType, sourceProductionId } = normalizeProductionSource(data);
  if (!sourceProductionType || !sourceProductionId) {
    // Update of legacy row without source — allowed
    return null;
  }

  const row = await loadProductionOwner(sourceProductionType, sourceProductionId, campaignId);
  if (!row.found) {
    return { success: false, error: "تولید انتخاب‌شده یافت نشد" };
  }

  if (isFullAdmin(session)) return null;
  if (session.role === "client" || session.role === "reis") return null;

  if (sourceProductionType === "directive_asset") return null;

  if (!session.userId || row.ownerUserId !== session.userId) {
    return { success: false, error: "فقط می‌توانید تولیدات خودتان را نشر دهید" };
  }
  return null;
}

export function mapProductionSourceFromDb(row: {
  source_production_type?: unknown;
  source_production_id?: unknown;
}): ProductionSourceFields {
  return {
    sourceProductionType: isProductionSourceType(row.source_production_type)
      ? row.source_production_type
      : null,
    sourceProductionId:
      typeof row.source_production_id === "string" && row.source_production_id
        ? row.source_production_id
        : row.source_production_id != null
          ? String(row.source_production_id)
          : null,
  };
}
