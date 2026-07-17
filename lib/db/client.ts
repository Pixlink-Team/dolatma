import postgres from "postgres";

declare global {
  var __postgresClient: ReturnType<typeof postgres> | undefined;
}

/** Require app.rls_bypass=on so stolen DB URLs without this GUC cannot read forced-RLS tables. */
function withRlsBypassOption(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    const existing = url.searchParams.get("options") ?? "";
    if (existing.includes("app.rls_bypass")) return databaseUrl;
    const flag = "-c app.rls_bypass=on";
    url.searchParams.set("options", existing ? `${existing} ${flag}` : flag);
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!global.__postgresClient) {
    global.__postgresClient = postgres(withRlsBypassOption(databaseUrl), {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  return global.__postgresClient;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const sql = getSql();
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
