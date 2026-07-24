// Voyager includes clear street/place labels at higher zoom (unlike minimal Positron).
const DEFAULT_UPSTREAMS = [
  "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
  "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
] as const;

/** Host suffixes allowed for tile upstreams (blocks SSRF via MAP_TILE_UPSTREAM_URLS). */
const DEFAULT_ALLOWED_HOST_SUFFIXES = [
  "basemaps.cartocdn.com",
  "tile.openstreetmap.de",
  "tile.openstreetmap.fr",
  "tile.openstreetmap.org",
  "openstreetmap.org",
] as const;

function getAllowedHostSuffixes(): string[] {
  const fromEnv = process.env.MAP_TILE_ALLOWED_HOSTS?.split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return [...DEFAULT_ALLOWED_HOST_SUFFIXES];
}

function hostMatchesAllowlist(hostname: string, allowlist: string[]): boolean {
  const host = hostname.toLowerCase();
  return allowlist.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function isAllowedTileUpstream(template: string): boolean {
  try {
    const sample = template
      .replaceAll("{z}", "0")
      .replaceAll("{x}", "0")
      .replaceAll("{y}", "0")
      .replaceAll("{s}", "a");
    const url = new URL(sample);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    return hostMatchesAllowlist(url.hostname, getAllowedHostSuffixes());
  } catch {
    return false;
  }
}

export function getMapTileUpstreamUrls(): string[] {
  const fromEnv = process.env.MAP_TILE_UPSTREAM_URLS?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (fromEnv && fromEnv.length > 0) {
    const allowed = fromEnv.filter(isAllowedTileUpstream);
    if (allowed.length > 0) return allowed;
    console.error(
      "[map-tiles] MAP_TILE_UPSTREAM_URLS had no allowlisted HTTPS hosts; using defaults."
    );
  }

  return [...DEFAULT_UPSTREAMS];
}

export function buildUpstreamTileUrl(template: string, z: number, x: number, y: number): string {
  return template
    .replaceAll("{z}", String(z))
    .replaceAll("{x}", String(x))
    .replaceAll("{y}", String(y))
    .replaceAll("{s}", "a");
}

export function parseTileYParam(rawY: string): number | null {
  const normalized = rawY.endsWith(".png") ? rawY.slice(0, -4) : rawY;
  const y = Number.parseInt(normalized, 10);
  return Number.isFinite(y) && y >= 0 ? y : null;
}

export function isValidTileCoordinate(z: number, x: number, y: number): boolean {
  if (!Number.isInteger(z) || z < 0 || z > 20) return false;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;

  const maxIndex = 2 ** z;
  return x >= 0 && y >= 0 && x < maxIndex && y < maxIndex;
}
