import { checkDatabaseConnection } from "@/lib/db/client";
import { getDatabaseMode } from "@/lib/utils";

/** Public liveness/readiness — keep payload minimal (no mode/DB details). */
export async function GET() {
  const mode = getDatabaseMode();

  if (mode === "postgres") {
    const dbOk = await checkDatabaseConnection();
    return Response.json(
      { status: dbOk ? "ok" : "unavailable" },
      { status: dbOk ? 200 : 503 }
    );
  }

  return Response.json({ status: "ok" });
}
