function trimOrEmpty(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function resolveDatabaseUrl(): string | null {
  const explicitUrl = trimOrEmpty(process.env.DATABASE_URL);
  if (explicitUrl) return explicitUrl;

  const user = trimOrEmpty(process.env.POSTGRES_USER) || "dashboard";
  const password = trimOrEmpty(process.env.POSTGRES_PASSWORD);
  const database = trimOrEmpty(process.env.POSTGRES_DB) || "dashboard";
  const host = trimOrEmpty(process.env.POSTGRES_HOST) || "dashboard-postgres";
  const port = trimOrEmpty(process.env.POSTGRES_PORT) || "5432";

  if (!password) return null;

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}
