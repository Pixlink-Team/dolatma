import path from "path";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  parseContentPackageExcel,
  type ContentPackageDraftItem,
} from "@/lib/services/content-package-parser";
import { saveUploadedImageBuffer } from "@/lib/services/save-uploaded-file";
import { todayISO } from "@/lib/jalali";
import { isPostgresConfigured } from "@/lib/utils";
import { withFileAccessToken } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_ZIP_BYTES = 80 * 1024 * 1024;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export type { ContentPackageDraftItem };

function basename(filePath: string): string {
  return path.posix.basename(filePath.replace(/\\/g, "/"));
}

function extensionOf(filePath: string): string {
  const match = basename(filePath).match(/(\.[a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

function isExcelName(filePath: string): boolean {
  const name = basename(filePath).toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".xls");
}

function isImageName(filePath: string): boolean {
  return IMAGE_EXT.has(extensionOf(filePath));
}

export async function POST(request: Request) {
  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Database required" }, { status: 503 });
  }

  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایل ZIP ارسال نشده است" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "فقط فایل ZIP مجاز است (Excel + پوشه images)" }, { status: 400 });
  }

  if (file.size > MAX_ZIP_BYTES) {
    return NextResponse.json({ error: "حجم فایل ZIP بیش از حد مجاز است" }, { status: 400 });
  }

  try {
    const zipBuffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(zipBuffer);

    const entries = Object.values(zip.files).filter((entry) => !entry.dir);
    const excelEntry =
      entries.find((entry) => basename(entry.name) === "فهرست.xlsx") ||
      entries.find((entry) => isExcelName(entry.name));

    if (!excelEntry) {
      return NextResponse.json({ error: "فایل Excel (فهرست.xlsx) داخل ZIP پیدا نشد" }, { status: 400 });
    }

    const excelBuffer = Buffer.from(await excelEntry.async("nodebuffer"));
    const rows = parseContentPackageExcel(excelBuffer, { date: todayISO() });
    if (rows.length === 0) {
      return NextResponse.json({ error: "هیچ ردیف معتبری در Excel پیدا نشد" }, { status: 400 });
    }

    const imageEntries = entries.filter((entry) => isImageName(entry.name));
    const imageByName = new Map<string, (typeof imageEntries)[number]>();
    for (const entry of imageEntries) {
      imageByName.set(basename(entry.name).toLowerCase(), entry);
    }

    const drafts: ContentPackageDraftItem[] = [];
    const errors: string[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const imageEntry = imageByName.get(row.fileName.toLowerCase());
      if (!imageEntry) {
        errors.push(`ردیف ${index + 1}: تصویر «${row.fileName}» پیدا نشد`);
        continue;
      }

      try {
        const imageBuffer = Buffer.from(await imageEntry.async("nodebuffer"));
        const imageUrl = await saveUploadedImageBuffer(imageBuffer, {
          fileNameHint: row.fileName,
        });

        drafts.push({
          key: `${index + 1}-${row.fileName}`,
          contentType: row.contentType,
          title: row.title,
          location: row.location,
          device: row.device,
          province: row.province,
          city: row.city,
          date: row.date,
          description: row.description,
          imageUrl: withFileAccessToken(imageUrl),
          platform: row.platform,
          fileName: row.fileName,
        });
      } catch (error) {
        errors.push(
          `ردیف ${index + 1}: ${error instanceof Error ? error.message : "خطا در آپلود تصویر"}`
        );
      }
    }

    if (drafts.length === 0) {
      return NextResponse.json(
        {
          error: errors[0] ?? "هیچ مورد قابل وارد کردن پیدا نشد",
          errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      total: drafts.length,
      drafts,
      errors,
    });
  } catch (error) {
    console.error("Content package parse failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خواندن ZIP ناموفق بود" },
      { status: 400 }
    );
  }
}
