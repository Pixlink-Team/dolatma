import type {
  DirectiveUrgency,
  DirectiveWorkspaceAssetCategory,
} from "@/lib/types";

export const DIRECTIVE_URGENCY_OPTIONS: Array<{
  value: DirectiveUrgency;
  label: string;
}> = [
  { value: "low", label: "کم" },
  { value: "normal", label: "عادی" },
  { value: "high", label: "بالا" },
  { value: "critical", label: "بحرانی" },
];

export const DIRECTIVE_WORKSPACE_ASSET_CATEGORIES: Array<{
  value: DirectiveWorkspaceAssetCategory;
  label: string;
  description: string;
  supportsText: boolean;
  supportsPrintSize: boolean;
}> = [
  {
    value: "reference",
    label: "فایل‌های مرجع و منبع",
    description: "اسناد بالادستی، منبع و پیوست‌های مرجع",
    supportsText: false,
    supportsPrintSize: false,
  },
  {
    value: "ready_text",
    label: "متن‌های آماده انتشار",
    description: "کپی آماده برای سایت، پیامک و شبکه‌های اجتماعی",
    supportsText: true,
    supportsPrintSize: false,
  },
  {
    value: "print",
    label: "فایل‌های چاپی",
    description: "نسخه‌های چاپی در ابعاد مختلف",
    supportsText: false,
    supportsPrintSize: true,
  },
  {
    value: "video",
    label: "نسخه‌های ویدئویی",
    description: "ویدیوهای آماده انتشار",
    supportsText: false,
    supportsPrintSize: false,
  },
  {
    value: "social",
    label: "نسخه‌های شبکه اجتماعی",
    description: "قالب‌ها و فایل‌های مخصوص شبکه‌های اجتماعی",
    supportsText: false,
    supportsPrintSize: false,
  },
  {
    value: "brand_guide",
    label: "راهنمای هویت بصری",
    description: "دستورالعمل رنگ، لوگو و هویت بصری",
    supportsText: true,
    supportsPrintSize: false,
  },
  {
    value: "training",
    label: "آموزش اجرای دستور",
    description: "راهنما و آموزش عملیاتی اجرا",
    supportsText: true,
    supportsPrintSize: false,
  },
  {
    value: "approval",
    label: "مستندات تأیید",
    description: "مدارک لازم برای تأیید و ارسال",
    supportsText: false,
    supportsPrintSize: false,
  },
];

export function getDirectiveUrgencyLabel(value: DirectiveUrgency): string {
  return DIRECTIVE_URGENCY_OPTIONS.find((item) => item.value === value)?.label ?? "عادی";
}

export function getWorkspaceAssetCategoryMeta(category: DirectiveWorkspaceAssetCategory) {
  return (
    DIRECTIVE_WORKSPACE_ASSET_CATEGORIES.find((item) => item.value === category) ??
    DIRECTIVE_WORKSPACE_ASSET_CATEGORIES[0]
  );
}

export function isDirectiveUrgency(value: unknown): value is DirectiveUrgency {
  return value === "low" || value === "normal" || value === "high" || value === "critical";
}

export function isWorkspaceAssetCategory(
  value: unknown
): value is DirectiveWorkspaceAssetCategory {
  return DIRECTIVE_WORKSPACE_ASSET_CATEGORIES.some((item) => item.value === value);
}
