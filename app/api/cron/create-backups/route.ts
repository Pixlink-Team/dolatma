import { revalidatePath } from "next/cache";
import { authorizeCron } from "@/lib/auth/cron";
import { runDailyCampaignBackups } from "@/lib/services/campaign-backup";
import { runDailySystemBackup } from "@/lib/services/system-backup";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

async function handleCron(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json(
      {
        success: false,
        error:
          "Unauthorized. Set CRON_SECRET and send Authorization: Bearer <secret>.",
      },
      { status: 401 }
    );
  }

  if (!isPostgresConfigured()) {
    return Response.json(
      { success: false, error: "Database is not configured" },
      { status: 503 }
    );
  }

  const [systemBackup, campaignSummary] = await Promise.all([
    runDailySystemBackup(),
    runDailyCampaignBackups(),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/backups");

  return Response.json({
    success: true,
    systemBackup,
    campaignCreatedCount: campaignSummary.created.length,
    campaignFailedCount: campaignSummary.failed.length,
    campaignSummary,
  });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
