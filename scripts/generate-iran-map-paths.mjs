/**
 * Convert Iran provinces GeoJSON to simplified SVG paths for inline map.
 * Also embeds city positions and water-body paths.
 * Output: lib/iran-map-paths.ts
 */
import { readFileSync, writeFileSync } from "fs";

const INPUT = "iran-provinces.geojson";
const OUTPUT = "lib/iran-map-paths.ts";

const raw = JSON.parse(readFileSync(INPUT, "utf-8"));

const LON_MIN = 43.5;
const LON_MAX = 64.0;
const LAT_MIN = 24.5;
const LAT_MAX = 40.5;
const WIDTH = 900;
const HEIGHT = 680;

function projectLon(lon) {
  return ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * WIDTH;
}
function projectLat(lat) {
  return HEIGHT - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * HEIGHT;
}

// Douglas-Peucker
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

const TOLERANCE = 0.02;

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

const NAME_ALIASES = {
  "چهارمحال وبختیاری": "چهارمحال و بختیاری",
  "کهگیلویه وبویراحمد": "کهگیلویه و بویراحمد",
  "سیستان وبلوچستان": "سیستان و بلوچستان",
};

// Compute proper centroid using signed-area method
function polygonCentroid(ring) {
  let area = 0, cx = 0, cy = 0;
  for (let i = 0, len = ring.length; i < len; i++) {
    const j = (i + 1) % len;
    const cross = ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
    area += cross;
    cx += (ring[i][0] + ring[j][0]) * cross;
    cy += (ring[i][1] + ring[j][1]) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-10) {
    let sx = 0, sy = 0;
    for (const [lon, lat] of ring) { sx += lon; sy += lat; }
    return [sx / ring.length, sy / ring.length];
  }
  cx /= (6 * area);
  cy /= (6 * area);
  return [cx, cy];
}

// Manual centroid offsets for provinces where auto centroid lands poorly
const CENTROID_OFFSETS = {
  "هرمزگان": [0, -0.4],
  "بوشهر": [0.2, 0],
  "گیلان": [0, 0.15],
  "مازندران": [0, 0.2],
  "گلستان": [0, 0.1],
};

const provinces = [];

for (const feature of raw.features) {
  const props = feature.properties;
  let name = (props.name_fa || props["name:fa"] || props.name || "").trim();
  name = name.replace(/^استان\s+/, "");
  name = NAME_ALIASES[name] || name;

  const d = geometryToPath(feature.geometry);
  if (!d || !name) continue;

  // Best centroid from largest polygon ring
  let mainRing;
  if (feature.geometry.type === "Polygon") {
    mainRing = feature.geometry.coordinates[0];
  } else {
    let maxArea = 0;
    for (const poly of feature.geometry.coordinates) {
      let a = 0;
      for (let i = 0; i < poly[0].length; i++) {
        const j = (i + 1) % poly[0].length;
        a += poly[0][i][0] * poly[0][j][1] - poly[0][j][0] * poly[0][i][1];
      }
      a = Math.abs(a);
      if (a > maxArea) { maxArea = a; mainRing = poly[0]; }
    }
  }

  let [cxLon, cyLat] = polygonCentroid(mainRing);
  const offset = CENTROID_OFFSETS[name];
  if (offset) { cxLon += offset[0]; cyLat += offset[1]; }

  provinces.push({
    name,
    d,
    cx: Number(projectLon(cxLon).toFixed(1)),
    cy: Number(projectLat(cyLat).toFixed(1)),
  });
}

console.log(`Generated ${provinces.length} provinces`);

// --- Cities from iran-provinces-data.ts ---
// Read the TS file and extract city data
const cityTsContent = readFileSync("lib/iran-provinces-data.ts", "utf-8");
const dataMatch = cityTsContent.match(/export const IRAN_PROVINCES_DATA[\s\S]*?=\s*(\[[\s\S]*\]);?\s*$/);
let cityPoints = [];
if (dataMatch) {
  const provincesArr = eval(dataMatch[1]);
  const capitalCities = new Set();
  for (const prov of provincesArr) {
    // First city in each province tends to be important; also include all
    for (const city of prov.cities) {
      cityPoints.push({
        name: city.name,
        province: prov.name,
        x: Number(projectLon(city.lng).toFixed(1)),
        y: Number(projectLat(city.lat).toFixed(1)),
      });
    }
  }
}

// Only keep major cities to avoid clutter: province capitals + cities with distinctive names
// We'll include the first city per province as "capital" marker
const provinceCityMap = new Map();
for (const c of cityPoints) {
  if (!provinceCityMap.has(c.province)) {
    provinceCityMap.set(c.province, []);
  }
  provinceCityMap.get(c.province).push(c);
}

// Select representative cities: include known major cities + first per province
const MAJOR_CITIES = new Set([
  "تهران", "اصفهان", "شیراز", "تبریز", "مشهد", "اهواز", "کرج",
  "کرمان", "ارومیه", "رشت", "زاهدان", "همدان", "یزد", "اردبیل",
  "بندرعباس", "کرمانشاه", "ساری", "قزوین", "زنجان", "سنندج",
  "گرگان", "بجنورد", "بیرجند", "بوشهر", "ایلام", "یاسوج",
  "خرم‌آباد", "سمنان", "شهرکرد", "قم", "اراک", "بندر عباس",
]);

const selectedCities = cityPoints.filter(c => MAJOR_CITIES.has(c.name));
console.log(`Selected ${selectedCities.length} major cities`);

// --- Water bodies (approximate outlines) ---
// Persian Gulf simplified path
const PERSIAN_GULF_COORDS = [
  [48.5, 29.5], [49.0, 28.8], [49.5, 27.8], [50.0, 27.0],
  [50.5, 26.5], [51.5, 25.8], [52.5, 25.5], [53.5, 25.3],
  [54.5, 25.5], [55.5, 25.8], [56.0, 26.2], [56.3, 26.8],
  [56.5, 27.2], [57.0, 27.0], [57.5, 26.5], [58.0, 25.8],
  [58.5, 25.3], [59.0, 25.0], [60.0, 25.2], [61.0, 25.1],
];

const CASPIAN_COORDS = [
  [48.8, 38.5], [49.2, 38.8], [49.5, 39.2], [50.0, 39.5],
  [50.5, 39.8], [51.0, 40.0], [51.5, 40.2], [52.0, 40.0],
  [52.5, 39.5], [53.0, 39.2], [53.5, 38.8], [54.0, 38.2],
  [54.0, 37.5], [53.8, 37.0], [53.5, 36.8], [52.5, 36.9],
  [51.5, 36.8], [50.5, 37.0], [49.5, 37.5], [49.0, 38.0],
  [48.8, 38.5],
];

function waterPath(coords) {
  return coords
    .map(([lon, lat], i) => {
      const x = projectLon(lon).toFixed(1);
      const y = projectLat(lat).toFixed(1);
      return i === 0 ? `M${x},${y}` : `L${x},${y}`;
    })
    .join("");
}

const persianGulfPath = waterPath(PERSIAN_GULF_COORDS);
const caspianPath = waterPath(CASPIAN_COORDS) + "Z";

// Persian Gulf label position
const pgLabelX = projectLon(52.0).toFixed(1);
const pgLabelY = projectLat(26.5).toFixed(1);
const caspianLabelX = projectLon(51.5).toFixed(1);
const caspianLabelY = projectLat(38.5).toFixed(1);

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
  `export interface IranMapCity {`,
  `  name: string;`,
  `  province: string;`,
  `  x: number;`,
  `  y: number;`,
  `}`,
  ``,
  `export interface IranMapWater {`,
  `  name: string;`,
  `  d: string;`,
  `  labelX: number;`,
  `  labelY: number;`,
  `}`,
  ``,
  `export const IRAN_MAP_PROVINCES: IranMapProvince[] = ${JSON.stringify(provinces, null, 2)};`,
  ``,
  `export const IRAN_MAP_CITIES: IranMapCity[] = ${JSON.stringify(selectedCities, null, 2)};`,
  ``,
  `export const IRAN_MAP_WATERS: IranMapWater[] = ${JSON.stringify([
    { name: "خلیج فارس", d: persianGulfPath, labelX: Number(pgLabelX), labelY: Number(pgLabelY) },
    { name: "دریای خزر", d: caspianPath, labelX: Number(caspianLabelX), labelY: Number(caspianLabelY) },
  ], null, 2)};`,
  ``,
  `export const IRAN_MAP_VIEWBOX = "0 0 ${WIDTH} ${HEIGHT}";`,
  ``,
];

writeFileSync(OUTPUT, lines.join("\n"), "utf-8");
console.log(`Wrote ${OUTPUT}`);
