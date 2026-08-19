/**
 * Convert Iran provinces GeoJSON to simplified SVG paths for inline map.
 * Output: lib/iran-map-paths.ts
 */
import { readFileSync, writeFileSync } from "fs";

const INPUT = "iran-provinces.geojson";
const OUTPUT = "lib/iran-map-paths.ts";

const raw = JSON.parse(readFileSync(INPUT, "utf-8"));

// Mercator-like projection tuned for Iran
const LON_MIN = 44.0;
const LON_MAX = 63.5;
const LAT_MIN = 25.0;
const LAT_MAX = 40.0;
const WIDTH = 800;
const HEIGHT = 600;

function projectLon(lon) {
  return ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * WIDTH;
}
function projectLat(lat) {
  // invert Y
  return HEIGHT - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * HEIGHT;
}

// Douglas-Peucker simplification
function sqDist(p, a, b) {
  let dx = b[0] - a[0], dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq > 0) {
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
    dx = a[0] + t * (b[0] - a[0]) - p[0];
    dy = a[1] + t * (b[1] - a[1]) - p[1];
  } else {
    dx = p[0] - a[0];
    dy = p[1] - a[1];
  }
  return dx * dx + dy * dy;
}

function simplify(coords, tolerance) {
  if (coords.length <= 2) return coords;
  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < coords.length - 1; i++) {
    const d = sqDist(coords[i], coords[0], coords[coords.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > tolerance * tolerance) {
    const left = simplify(coords.slice(0, maxIdx + 1), tolerance);
    const right = simplify(coords.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [coords[0], coords[coords.length - 1]];
}

const TOLERANCE = 0.04; // in lon/lat degrees

function ringToPath(ring) {
  const simplified = simplify(ring, TOLERANCE);
  return simplified
    .map(([lon, lat], i) => {
      const x = projectLon(lon).toFixed(1);
      const y = projectLat(lat).toFixed(1);
      return i === 0 ? `M${x},${y}` : `L${x},${y}`;
    })
    .join("") + "Z";
}

function geometryToPath(geom) {
  if (geom.type === "Polygon") {
    return geom.coordinates.map(ringToPath).join("");
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.flatMap(poly => poly.map(ringToPath)).join("");
  }
  return "";
}

// Map display name from GeoJSON to our IRAN_PROVINCES names
const NAME_ALIASES = {
  "چهارمحال وبختیاری": "چهارمحال و بختیاری",
  "کهگیلویه وبویراحمد": "کهگیلویه و بویراحمد",
  "سیستان وبلوچستان": "سیستان و بلوچستان",
  "خراسان شمالی": "خراسان شمالی",
  "خراسان جنوبی": "خراسان جنوبی",
  "خراسان رضوی": "خراسان رضوی",
  "آذربایجان شرقی": "آذربایجان شرقی",
  "آذربایجان غربی": "آذربایجان غربی",
};

const provinces = [];

for (const feature of raw.features) {
  const props = feature.properties;
  let name = (props.name_fa || props["name:fa"] || props.name || props.NAME_1 || props.display_name || "").trim();
  // Remove "استان " prefix
  name = name.replace(/^استان\s+/, "");
  name = NAME_ALIASES[name] || name;

  const d = geometryToPath(feature.geometry);
  if (!d || !name) continue;

  // Compute centroid for label placement
  const coords = feature.geometry.type === "Polygon"
    ? feature.geometry.coordinates[0]
    : feature.geometry.coordinates[0][0];
  let cx = 0, cy = 0;
  for (const [lon, lat] of coords) { cx += lon; cy += lat; }
  cx /= coords.length;
  cy /= coords.length;

  provinces.push({
    name,
    d,
    cx: projectLon(cx).toFixed(1),
    cy: projectLat(cy).toFixed(1),
  });
}

console.log(`Generated ${provinces.length} provinces`);

// Write TS
const lines = [
  `// Auto-generated from GeoJSON — do not edit manually.`,
  `// Run: node scripts/generate-iran-map-paths.mjs`,
  ``,
  `export interface IranMapProvince {`,
  `  name: string;`,
  `  d: string;`,
  `  cx: number;`,
  `  cy: number;`,
  `}`,
  ``,
  `export const IRAN_MAP_PROVINCES: IranMapProvince[] = ${JSON.stringify(
    provinces.map(p => ({ name: p.name, d: p.d, cx: Number(p.cx), cy: Number(p.cy) })),
    null,
    2
  )};`,
  ``,
  `export const IRAN_MAP_VIEWBOX = "0 0 ${WIDTH} ${HEIGHT}";`,
  ``,
];

writeFileSync(OUTPUT, lines.join("\n"), "utf-8");
console.log(`Wrote ${OUTPUT}`);
