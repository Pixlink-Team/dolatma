import postgres from "postgres";
import { resolveDatabaseUrl } from "@/lib/db/resolve-database-url";

declare global {
  var __postgresClient: ReturnType<typeof postgres> | undefined;
}

export function getSql() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!global.__postgresClient) {
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
