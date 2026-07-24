import { revalidatePath } from "next/cache";
import { authorizeCron } from "@/lib/auth/cron";
import { runMonitoringIngestionJob } from "@/lib/monitoring/jobs/ingestion";
import { seedMonitoringModule } from "@/lib/monitoring/seed";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  await seedMonitoringModule();
  const summary = await runMonitoringIngestionJob();

  revalidatePath("/admin/monitoring", "layout");
  revalidatePath("/admin/rapid-response", "layout");

  return Response.json({
    success: true,
    summary,
  });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
