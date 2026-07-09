export function safeDatePrefix(value?: string | null): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 10) : "";
}

export function getSafeUploadTimestamp(item: {
  createdAt?: string | null;
  updatedAt?: string | null;
}): string {
  const createdAt = typeof item.createdAt === "string" ? item.createdAt.trim() : "";
  const updatedAt = typeof item.updatedAt === "string" ? item.updatedAt.trim() : "";

  if (createdAt && updatedAt) {
    return updatedAt > createdAt ? updatedAt : createdAt;
  }

  return createdAt || updatedAt || "";
}

export function isSameDay(value?: string | null, dayIso?: string): boolean {
  const prefix = safeDatePrefix(value);
  if (!prefix || !dayIso) return false;
  return prefix === dayIso;
}
