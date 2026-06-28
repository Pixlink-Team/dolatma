import * as XLSX from "xlsx";
import type { SubmissionStatus } from "@/lib/types";

export interface ParsedSubmissionRow {
  externalUuid: string;
  submissionType: string;
  participantName: string;
  participantPhone?: string;
  title: string;
  text: string;
  mediaUrl?: string;
  status: SubmissionStatus;
  published: boolean;
  createdAt: string;
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  image: "تصویر",
  video: "ویدیو",
  text: "متن",
  audio: "صوت",
};

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function pickValue(row: Record<string, unknown>, keys: string[]): unknown {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeKey(key), value])
  );

  for (const key of keys) {
    const value = normalized[normalizeKey(key)];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function asString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function excelSerialToIso(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 1000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + asNumber * 86_400_000).toISOString();
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function mapStatus(value: unknown): SubmissionStatus {
  const status = asString(value).toLowerCase();
  if (status === "approved" || status === "rejected" || status === "pending") {
    return status;
  }
  return "pending";
}

function mapSubmissionType(value: unknown): string {
  const mediaType = asString(value).toLowerCase();
  return MEDIA_TYPE_LABELS[mediaType] ?? (mediaType || "مشارکت");
}

function mapRow(row: Record<string, unknown>): ParsedSubmissionRow | null {
  const externalUuid = asString(pickValue(row, ["uuid", "external_uuid", "externalUuid"]));
  if (!externalUuid) return null;

  const title = asString(pickValue(row, ["title", "عنوان"]));
  const caption = asString(pickValue(row, ["caption", "text", "description", "متن"]));
  const status = mapStatus(pickValue(row, ["status", "وضعیت"]));

  return {
    externalUuid,
    submissionType: mapSubmissionType(pickValue(row, ["media_type", "submission_type", "type"])),
    participantName: asString(pickValue(row, ["author_name", "participant_name", "name"])) || "ناشناس",
    participantPhone: asString(pickValue(row, ["author_phone", "participant_phone", "phone"])) || undefined,
    title: title || caption || "بدون عنوان",
    text: caption || title,
    mediaUrl: asString(pickValue(row, ["media_url", "mediaUrl", "url"])) || undefined,
    status,
    published: status === "approved",
    createdAt: excelSerialToIso(pickValue(row, ["created_at", "createdAt", "date"])),
  };
}

export function parseSubmissionsExcel(buffer: Buffer): ParsedSubmissionRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: "",
    raw: false,
  });

  const parsed: ParsedSubmissionRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const mapped = mapRow(row);
    if (!mapped || seen.has(mapped.externalUuid)) continue;
    seen.add(mapped.externalUuid);
    parsed.push(mapped);
  }

  return parsed;
}
