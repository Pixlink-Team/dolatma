const DEFAULT_UPSTREAMS = [
  "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
  "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
] as const;

export function getMapTileUpstreamUrls(): string[] {
  const fromEnv = process.env.MAP_TILE_UPSTREAM_URLS?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
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
  if (!Number.isInteger(z) || z < 0 || z > 19) return false;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;

  const maxIndex = 2 ** z;
  return x >= 0 && y >= 0 && x < maxIndex && y < maxIndex;
}
