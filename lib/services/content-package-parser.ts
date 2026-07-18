import * as XLSX from "xlsx";
import type { SocialPostPlatform } from "@/lib/types";

export type ContentPackageItemType =
  | "billboard"
  | "poster"
  | "video"
  | "site"
  | "social"
  | "press"
  | "activity";

export interface ContentPackageDraftItem {
  key: string;
  contentType: ContentPackageItemType;
  title: string;
  location: string;
  device: string;
  province: string;
  city: string;
  date: string;
  description: string;
  imageUrl: string;
  platform: SocialPostPlatform | null;
  fileName: string;
}

export interface ContentPackageExcelRow {
  title: string;
  location: string;
  device: string;
  contentType: ContentPackageItemType;
  fileName: string;
  province: string;
  city: string;
  date: string;
  description: string;
  platform: SocialPostPlatform | null;
}

function asString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function pickColumn(header: string[], aliases: string[]): number {
  const normalized = header.map(normalizeHeader);
  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    const index = normalized.findIndex(
      (cell) => cell === target || cell.includes(target) || target.includes(cell)
    );
    if (index >= 0) return index;
  }
  return -1;
}

export const CONTENT_PACKAGE_TYPE_OPTIONS: {
  value: ContentPackageItemType;
  label: string;
}[] = [
  { value: "billboard", label: "تبلیغات محیطی" },
  { value: "poster", label: "پوستر" },
  { value: "video", label: "ویدیو" },
  { value: "site", label: "انتشار در سایت" },
  { value: "social", label: "شبکه اجتماعی" },
  { value: "press", label: "مجله و روزنامه" },
  { value: "activity", label: "اقدام" },
];

export function mapContentPackageType(raw: string): ContentPackageItemType | null {
  const value = raw.trim();
  if (!value) return null;
  if (
    value.includes("بیلبورد") ||
    value.includes("محیطی") ||
    /billboard/i.test(value)
  ) {
    return "billboard";
  }
  if (value.includes("پوستر") || /poster/i.test(value)) return "poster";
  if (value.includes("ویدیو") || value.includes("ویدئو") || /video/i.test(value)) {
    return "video";
  }
  if (value.includes("سایت") || value.includes("پورتال") || /site/i.test(value)) {
    return "site";
  }
  if (value.includes("شبکه") || /social/i.test(value)) return "social";
  if (
    value.includes("مجله") ||
    value.includes("روزنامه") ||
    /press|magazine|newspaper/i.test(value)
  ) {
    return "press";
  }
  if (value.includes("اقدام") || /activity/i.test(value)) return "activity";
  return null;
}

export function detectSocialPlatformFromText(location: string): SocialPostPlatform {
  const text = location || "";
  if (/اینستاگرام|instagram/i.test(text)) return "instagram";
  if (/تلگرام|telegram/i.test(text)) return "telegram";
  if (/\bایکس\b|\bx\b|توییتر|twitter/i.test(text)) return "x";
  if (/بله|bale/i.test(text)) return "bale";
  if (/ایتاء|eitaa/i.test(text)) return "eitaa";
  if (/روبیکا|rubika/i.test(text)) return "rubika";
  if (/آپارات|aparat/i.test(text)) return "aparat";
  if (/یوتیوب|youtube/i.test(text)) return "youtube";
  if (/لینکدین|linkedin/i.test(text)) return "linkedin";
  if (/سایت|پورتال|website|intranet/i.test(text)) return "site";
  return "other";
}

export function parseContentPackageExcel(
  buffer: Buffer,
  defaults?: { province?: string; city?: string; date?: string }
): ContentPackageExcelRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (matrix.length < 2) return [];

  const header = (matrix[0] ?? []).map((cell) => asString(cell));
  const titleIdx = pickColumn(header, ["عنوان", "title"]);
  const locationIdx = pickColumn(header, ["مکان", "location"]);
  const typeIdx = pickColumn(header, ["نوع", "type"]);
  const fileIdx = pickColumn(header, ["نام_فایل_عکس", "نام فایل عکس", "file", "image"]);
  const deviceIdx = pickColumn(header, ["دستگاه", "device", "سازمان"]);
  const provinceIdx = pickColumn(header, ["استان", "province"]);
  const cityIdx = pickColumn(header, ["شهر", "city"]);
  const dateIdx = pickColumn(header, ["تاریخ", "date"]);
  const descriptionIdx = pickColumn(header, ["توضیح", "description"]);
  const platformIdx = pickColumn(header, ["پلتفرم", "platform"]);

  if (titleIdx < 0 || typeIdx < 0 || fileIdx < 0) {
    throw new Error("ستون‌های عنوان، نوع و نام_فایل_عکس الزامی هستند");
  }

  const defaultProvince = defaults?.province?.trim() || "تهران";
  const defaultCity = defaults?.city?.trim() || "تهران";
  const defaultDate = defaults?.date?.trim() || new Date().toISOString().slice(0, 10);

  const rows: ContentPackageExcelRow[] = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const line = matrix[i];
    if (!Array.isArray(line)) continue;

    const title = asString(line[titleIdx]);
    const contentType = mapContentPackageType(asString(line[typeIdx]));
    const fileName = asString(line[fileIdx]);
    if (!title || !contentType || !fileName) continue;

    const location = locationIdx >= 0 ? asString(line[locationIdx]) : "";
    const platformRaw = platformIdx >= 0 ? asString(line[platformIdx]) : "";
    const platform =
      contentType === "social"
        ? platformRaw
          ? detectSocialPlatformFromText(platformRaw)
          : detectSocialPlatformFromText(location)
        : contentType === "site"
          ? "site"
          : null;

    rows.push({
      title,
      location,
      device: deviceIdx >= 0 ? asString(line[deviceIdx]) : "",
      contentType,
      fileName,
      province: provinceIdx >= 0 ? asString(line[provinceIdx]) || defaultProvince : defaultProvince,
      city: cityIdx >= 0 ? asString(line[cityIdx]) || defaultCity : defaultCity,
      date: dateIdx >= 0 ? asString(line[dateIdx]) || defaultDate : defaultDate,
      description: descriptionIdx >= 0 ? asString(line[descriptionIdx]) : "",
      platform,
    });
  }

  return rows;
}
