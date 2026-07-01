import { NextResponse } from "next/server";
import {
  buildUpstreamTileUrl,
  getMapTileUpstreamUrls,
  isValidTileCoordinate,
  parseTileYParam,
} from "@/lib/map-tile-providers";

const TILE_FETCH_TIMEOUT_MS = 8_000;

async function fetchTileFromUpstream(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TILE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Dashboard-info/1.0 (map tile proxy)",
      },
      next: { revalidate: 86_400 },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/png";
    if (!contentType.startsWith("image/")) return null;

    return response;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z: rawZ, x: rawX, y: rawY } = await params;

  const z = Number.parseInt(rawZ, 10);
  const x = Number.parseInt(rawX, 10);
  const y = parseTileYParam(rawY);

  if (y === null || !isValidTileCoordinate(z, x, y)) {
    return NextResponse.json({ error: "Invalid tile coordinates" }, { status: 400 });
  }

  const upstreams = getMapTileUpstreamUrls();

  for (const template of upstreams) {
    const upstreamUrl = buildUpstreamTileUrl(template, z, x, y);
    const upstreamResponse = await fetchTileFromUpstream(upstreamUrl);
    if (!upstreamResponse) continue;

    const buffer = await upstreamResponse.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": upstreamResponse.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  }

  return NextResponse.json({ error: "Tile unavailable" }, { status: 502 });
}
