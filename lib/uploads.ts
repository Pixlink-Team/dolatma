import path from "path";
import { createFileAccessQuery } from "@/lib/auth/file-access-token";

const LOCAL_FILE_PATH_RE = /^\/api\/files\/([^/?#]+)(?:[?#].*)?$/i;

export function getUploadsDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
}

export function getUploadPublicUrl(filename: string): string {
  return `/api/files/${filename}`;
}

/** Strip query/hash so stored DB URLs stay stable. */
export function stripFileAccessToken(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  const match = LOCAL_FILE_PATH_RE.exec(trimmed);
  if (!match) {
    try {
      const parsed = new URL(trimmed, "https://local.invalid");
      if (!parsed.pathname.startsWith("/api/files/")) return trimmed;
      return parsed.pathname;
    } catch {
      return trimmed.split("?")[0].split("#")[0];
    }
  }
  return `/api/files/${match[1]}`;
}

export function withFileAccessToken(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const bare = stripFileAccessToken(trimmed);
  const match = LOCAL_FILE_PATH_RE.exec(bare);
  if (!match) return trimmed;

  const filename = match[1];
  return `${bare}?${createFileAccessQuery(filename)}`;
}

export function resolveUploadFilePath(filename: string): string {
  const withoutQuery = filename.split("?")[0].split("#")[0];
  const safeName = path.basename(withoutQuery);
  return path.join(getUploadsDir(), safeName);
}

function mapDeep(value: unknown, mapUrl: (url: string) => string): unknown {
  if (typeof value === "string") {
    if (value.includes("/api/files/")) return mapUrl(value);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => mapDeep(item, mapUrl));
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      output[key] = mapDeep(child, mapUrl);
    }
    return output;
  }
  return value;
}

/** Attach short-lived access tokens before sending media URLs to the browser. */
export function withFileAccessTokensDeep<T>(value: T): T {
  return mapDeep(value, withFileAccessToken) as T;
}

/** Remove access tokens before persisting media URLs. */
export function stripFileAccessTokensDeep<T>(value: T): T {
  return mapDeep(value, stripFileAccessToken) as T;
}
