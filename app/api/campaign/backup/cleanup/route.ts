import { NextResponse } from "next/server";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { cleanupCampaignBackups } from "@/lib/services/campaign-backup";

export const dynamic = "force-dynamic";

interface CleanupRequestBody {
  /** Explicit selection to delete regardless of age. */
  targets?: Array<{ campaignId?: string; filename?: string }>;
  /** Delete stored backups older than this many days. */
  olderThanDays?: number;
  /** Keep only the newest N backups per campaign, delete the rest. */
  keepPerCampaign?: number;
}

/** Bulk-deletes stored backup ZIPs: explicit selection, by age, or a per-campaign retention count. */
export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CleanupRequestBody | null;
  if (!body) {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });
  }

  const targets = (body.targets ?? [])
    .filter(
      (item): item is { campaignId: string; filename: string } =>
        Boolean(item.campaignId?.trim()) && Boolean(item.filename?.trim())
    )
    .map((item) => ({ campaignId: item.campaignId.trim(), filename: item.filename.trim() }));

  const olderThanDays =
    typeof body.olderThanDays === "number" && Number.isFinite(body.olderThanDays) && body.olderThanDays > 0
      ? body.olderThanDays
      : undefined;
  const keepPerCampaign =
    typeof body.keepPerCampaign === "number" && Number.isFinite(body.keepPerCampaign) && body.keepPerCampaign >= 0
      ? body.keepPerCampaign
      : undefined;

  if (targets.length === 0 && olderThanDays === undefined && keepPerCampaign === undefined) {
    return NextResponse.json({ error: "هیچ معیار پاک‌سازی مشخص نشده است" }, { status: 400 });
  }

  try {
    const result = await cleanupCampaignBackups({ targets, olderThanDays, keepPerCampaign });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "خطا در پاک‌سازی پشتیبان‌ها",
      },
      { status: 500 }
    );
  }
}
