/** Client-safe production-source types and labels (no server imports). */

export type ProductionSourceType =
  | "poster"
  | "video"
  | "file"
  | "raw_media"
  | "text_content"
  | "directive_asset";

export const PRODUCTION_SOURCE_TYPES: ProductionSourceType[] = [
  "poster",
  "video",
  "file",
  "raw_media",
  "text_content",
  "directive_asset",
];

export const PRODUCTION_SOURCE_TYPE_LABELS: Record<ProductionSourceType, string> = {
  poster: "پوستر و عکس",
  video: "ویدیو",
  file: "فایل",
  raw_media: "راش تصاویر",
  text_content: "خبر / متن",
  directive_asset: "دارایی دستورکار",
};

export interface ProductionSourceFields {
  sourceProductionType?: ProductionSourceType | null;
  sourceProductionId?: string | null;
}

export interface PublishableProductionItem {
  id: string;
  type: ProductionSourceType;
  title: string;
  subtitle?: string | null;
  mediaUrl?: string | null;
  coverImageUrl?: string | null;
  body?: string | null;
  planLabels: string[];
  contentKind?: "news" | "text" | null;
  ownerUserId?: string | null;
  createdAt: string;
  directiveId?: string | null;
  directiveTitle?: string | null;
  assetCategory?: string | null;
}

export const READY_DIRECTIVE_ASSET_CATEGORIES = [
  "poster",
  "video",
  "banner",
  "ready_text",
  "social",
  "print",
] as const;

export function isProductionSourceType(value: unknown): value is ProductionSourceType {
  return (
    typeof value === "string" &&
    (PRODUCTION_SOURCE_TYPES as string[]).includes(value)
  );
}
