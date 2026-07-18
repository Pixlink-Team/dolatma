import type { Map as LeafletMap, TileLayer } from "leaflet";

export const LEAFLET_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function getLeafletTileLayerUrl(): string {
  return process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "/api/map-tiles/{z}/{x}/{y}.png";
}

export function addLeafletTileLayer(L: typeof import("leaflet"), map: LeafletMap): TileLayer {
  return L.tileLayer(getLeafletTileLayerUrl(), {
    attribution: LEAFLET_TILE_ATTRIBUTION,
    maxZoom: 20,
    maxNativeZoom: 20,
    // Sharper street labels on high-DPI screens when zoomed in.
    detectRetina: true,
  }).addTo(map);
}
