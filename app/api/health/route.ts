import { checkDatabaseConnection, getSql } from "@/lib/db/client";
import { getDatabaseMode } from "@/lib/utils";

export async function GET() {
  const mode = getDatabaseMode();

  if (mode === "postgres") {
    const dbOk = await checkDatabaseConnection();
    let campaignCount: number | null = null;

    if (dbOk) {
      try {
        const sql = getSql();
        const rows = await sql<{ count: string }[]>`
          SELECT COUNT(*)::text AS count FROM campaign_settings WHERE published = true
        `;
        campaignCount = Number(rows[0]?.count ?? 0);
      } catch {
        campaignCount = null;
      }
    }

    return Response.json(
      {
        status: dbOk ? "ok" : "degraded",
        database: dbOk ? "connected" : "disconnected",
        mode,
        publishedCampaigns: campaignCount,
      },
      { status: dbOk ? 200 : 503 }
    );
  }

  return Response.json({ status: "ok", mode });
}
