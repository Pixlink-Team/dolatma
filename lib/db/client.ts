import postgres from "postgres";

declare global {
  var __postgresClient: ReturnType<typeof postgres> | undefined;
}

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!global.__postgresClient) {
    // Do not append libpq "options" to DATABASE_URL — malformed options can hang connects.
    // RLS policies allow the table-owning app role; FORCE RLS was removed for that reason.
    global.__postgresClient = postgres(databaseUrl, {
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
