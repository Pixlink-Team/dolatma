import * as XLSX from "xlsx";
import type {
  MinistryLeaderboardEntry,
  OrganizationLeaderboardEntry,
  ProvinceLeaderboardEntry,
  UserLeaderboardEntry,
} from "@/lib/city-leaderboard";

/** Ranking dimension: device/subtree (ministry/organization) or contributor. */
export type PerformanceExcelViewMode = "ministry" | "organization" | "user" | "rating" | "province";

type AnyPerformanceEntry =
  | MinistryLeaderboardEntry
  | OrganizationLeaderboardEntry
  | ProvinceLeaderboardEntry
  | UserLeaderboardEntry;

function roundArea(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveEntityColumnLabel(view: PerformanceExcelViewMode): string {
  switch (view) {
    case "ministry":
      return "دستگاه / وزارتخانه";
    case "organization":
      return "سازمان / زیرمجموعه";
    case "province":
      return "استان";
    default:
      return "کاربر";
  }
}

function resolveEntityLabel(view: PerformanceExcelViewMode, entry: AnyPerformanceEntry): string {
  switch (view) {
    case "ministry":
      return (entry as MinistryLeaderboardEntry).ministry;
    case "organization":
      return (entry as OrganizationLeaderboardEntry).organization;
    case "province":
      return (entry as ProvinceLeaderboardEntry).province;
    default:
      return (entry as UserLeaderboardEntry).userName;
  }
}

function resolveSheetName(view: PerformanceExcelViewMode): string {
  switch (view) {
    case "ministry":
      return "دستگاه‌ها";
    case "organization":
      return "سازمان‌ها";
    case "province":
      return "استان‌ها";
    case "rating":
      return "امتیاز محتوا";
    default:
      return "کاربران";
  }
}

/** Build an .xlsx file as bytes for the performance overview report. */
export function buildPerformanceExcelBuffer(
  entries: AnyPerformanceEntry[],
  view: PerformanceExcelViewMode,
  options?: {
    campaignTitle?: string;
  }
): Uint8Array {
  const rows = entries.map((entry) => {
    const row: Record<string, string | number> = {
      رتبه: entry.rank,
      [resolveEntityColumnLabel(view)]: resolveEntityLabel(view, entry),
    };

    if (view === "organization") {
      row["دستگاه / وزارتخانه"] = (entry as OrganizationLeaderboardEntry).ministry;
    }
    if (view === "user" || view === "rating") {
      const userEntry = entry as UserLeaderboardEntry;
      row["دستگاه / وزارتخانه"] = userEntry.ministry;
      row["استان"] = userEntry.province;
    }

    Object.assign(row, {
      "تبلیغات محیطی": entry.billboards,
      متراژ: roundArea(entry.totalAreaSqm),
      پوستر: entry.posters,
      ویدیو: entry.videos,
      "شبکه اجتماعی": entry.socialPosts,
      "انتشار سایت": entry.sitePublications,
      اقدام: entry.activities,
      فایل: entry.files,
      "محتوای امروز": entry.todayUploads,
      "جمع محتوا": entry.totalUploads,
      "امتیاز فعالیت": entry.score,
      "امتیاز محتوا": entry.ratingScore,
    });

    return row;
  });

  const sheet = XLSX.utils.json_to_sheet(rows);
  const columnCount = rows[0] ? Object.keys(rows[0]).length : 12;
  sheet["!cols"] = Array.from({ length: columnCount }, (_, index) => ({
    wch: index === 1 ? 28 : 14,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, resolveSheetName(view));

  if (options?.campaignTitle) {
    const meta = XLSX.utils.aoa_to_sheet([
      ["کمپین", options.campaignTitle],
      ["تاریخ گزارش", new Date().toISOString().slice(0, 10)],
      ["تعداد ردیف", entries.length],
      ["نوع رتبه‌بندی", resolveSheetName(view)],
    ]);
    XLSX.utils.book_append_sheet(workbook, meta, "خلاصه");
  }

  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as number[];
  return new Uint8Array(bytes);
}

export function downloadPerformanceExcel(
  entries: AnyPerformanceEntry[],
  view: PerformanceExcelViewMode,
  options?: {
    campaignTitle?: string;
    campaignSlug?: string;
  }
) {
  const bytes = buildPerformanceExcelBuffer(entries, view, options);
  const blob = new Blob([Uint8Array.from(bytes)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const slug = options?.campaignSlug?.trim() || "campaign";
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `performance-${slug}-${date}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
