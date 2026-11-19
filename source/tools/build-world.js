// Builds js/data/world.js from cached OpenStreetMap data (see fetch-osm.js).
// Usage: node tools/build-world.js <cacheDir>
// For every neighborhood it finds real house footprints, the street each one faces,
// the Street View camera heading toward the house, and real nearby features
// (parks, schools, water, busy roads, rail, transit, shops).
// Map data © OpenStreetMap contributors (ODbL).
const fs = require("fs");
const path = require("path");
const cities = require("./world-config");

const cacheDir = process.argv[2] || path.join(__dirname, ".osm-cache");
const OUT = path.join(__dirname, "..", "js", "data", "world.js");

const MAX_HOMES = 46;
const MAX_CONDOS = 8;

// ---------- deterministic RNG ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---------- geometry (local planar meters) ----------
function makeProj(lat0, lng0) {
  const kx = Math.cos((lat0 * Math.PI) / 180) * 111320, ky = 110540;
  return { x: (lng) => (lng - lng0) * kx, y: (lat) => (lat - lat0) * ky, lng: (x) => x / kx + lng0, lat: (y) => y / ky + lat0 };
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx, qy = ay + t * dy;
  return { d: Math.hypot(px - qx, py - qy), qx, qy };
}
function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polyArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(a / 2);
}
function bearing(lat1, lng1, lat2, lng2) {
  const toR = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * toR) * Math.cos(lat2 * toR);
  const x = Math.cos(lat1 * toR) * Math.sin(lat2 * toR) - Math.sin(lat1 * toR) * Math.cos(lat2 * toR) * Math.cos((lng2 - lng1) * toR);
  return (Math.atan2(y, x) / toR + 360) % 360;
}

// ---------- street name formatting ----------
const SUFFIX = { Street: "St", Avenue: "Ave", Road: "Rd", Drive: "Dr", Lane: "Ln", Boulevard: "Blvd", Court: "Ct", Place: "Pl", Circle: "Cir", Terrace: "Ter", Parkway: "Pkwy", Trail: "Trl", Highway: "Hwy", Cove: "Cv", Square: "Sq", Crossing: "Xing", Point: "Pt", Path: "Path", Run: "Run", Loop: "Loop", Pass: "Pass", Bend: "Bnd", Ridge: "Rdg", Hollow: "Holw", Heights: "Hts", Expressway: "Expy", Pike: "Pike", Alley: "Aly", Glen: "Gln", Grove: "Grv", Meadow: "Mdw", Meadows: "Mdws", Creek: "Crk", Hill: "Hl", Hills: "Hls", Park: "Park", Row: "Row", Walk: "Walk", Way: "Way", Vista: "Vis", View: "Vw" };
const DIRS = { North: "N", South: "S", East: "E", West: "W", Northeast: "NE", Northwest: "NW", Southeast: "SE", Southwest: "SW" };
function shortStreet(name) {
  const w = name.split(/\s+/);
  if (w.length > 1 && DIRS[w[0]]) w[0] = DIRS[w[0]];
  if (w.length > 1 && DIRS[w[w.length - 1]]) w[w.length - 1] = DIRS[w[w.length - 1]];
  for (let i = w.length - 1; i >= 1; i--) {
    if (SUFFIX[w[i]]) { w[i] = SUFFIX[w[i]]; break; }
  }
  return w.join(" ");
}

const ROAD_CLASS = { living_street: 0, residential: 0, unclassified: 1, tertiary: 2, tertiary_link: 2, secondary: 3, secondary_link: 3, primary: 4, primary_link: 4, trunk: 5, trunk_link: 5, motorway: 6, motorway_link: 6 };
const BAD_TAGS = ["amenity", "shop", "office", "tourism", "craft", "religion", "healthcare", "man_made", "disused:shop", "public_transport", "railway", "aeroway", "military", "historic:civilization"];
const HOUSE_BUILDINGS = new Set(["house", "detached", "residential", "yes", "bungalow", "semidetached_house", "terrace", "farm", "cabin"]);
const BAD_LANDUSE = new Set(["commercial", "retail", "industrial", "railway", "military", "religious", "cemetery", "construction", "garages", "education"]);

function processHood(city, hood) {
  const file = path.join(cacheDir, `${city.id}-${hood.id}.json`);
  if (!fs.existsSync(file)) { console.warn("missing cache:", file); return null; }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const P = makeProj(hood.lat, hood.lng);
  const nodes = new Map();
  for (const e of data.elements) if (e.type === "node") nodes.set(e.id, e);

  const roads = []; // {name, cls, segs:[[ax,ay,bx,by]]}
  const major = []; // segments of class >= 3
  const highway = []; // motorway/trunk segments
  const parks = [], water = [], rail = [], golf = [];
  const badAreas = [];
  const schools = [], transit = [], shops = [];
  const buildings = [];

  function wayPts(w) {
    const pts = [];
    for (const id of w.nodes || []) { const n = nodes.get(id); if (n) pts.push([P.x(n.lon), P.y(n.lat)]); }
    return pts;
  }
  function segsOf(pts) { const s = []; for (let i = 1; i < pts.length; i++) s.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]); return s; }
  function centroid(pts) { let x = 0, y = 0; const n = pts.length - (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1] ? 1 : 0); for (let i = 0; i < n; i++) { x += pts[i][0]; y += pts[i][1]; } return [x / n, y / n]; }

  for (const e of data.elements) {
    const t = e.tags || {};
    if (e.type === "node") {
      const x = P.x(e.lon), y = P.y(e.lat);
      if (t.amenity === "school") schools.push([x, y]);
      if (t.highway === "bus_stop" || t.railway === "station" || t.railway === "halt" || t.railway === "tram_stop" || t.public_transport === "station") transit.push([x, y]);
      if (t.shop || ["restaurant", "cafe", "bar", "pub", "fast_food", "ice_cream", "bakery", "library", "pharmacy"].includes(t.amenity)) shops.push([x, y]);
      continue;
    }
    if (e.type !== "way") continue;
    const pts = wayPts(e);
    if (pts.length < 2) continue;
    const closed = e.nodes[0] === e.nodes[e.nodes.length - 1];
    if (t.highway && ROAD_CLASS[t.highway] !== undefined && t.area !== "yes") {
      const cls = ROAD_CLASS[t.highway];
      const segs = segsOf(pts);
      if (t.name && cls <= 5 && !/link/.test(t.highway)) roads.push({ name: t.name, cls, segs });
      if (cls >= 3) major.push(...segs);
      if (cls >= 5) highway.push(...segs);
    }
    if (t.leisure === "park" || t.leisure === "playground" || t.leisure === "nature_reserve" || t.landuse === "recreation_ground" || t.leisure === "dog_park") parks.push({ segs: segsOf(pts), pts: closed ? pts : null });
    if (t.leisure === "golf_course") golf.push({ segs: segsOf(pts), pts: closed ? pts : null });
    if (t.natural === "water" || t.waterway === "river" || t.waterway === "canal" || t.waterway === "riverbank" || t.natural === "coastline" || t.leisure === "marina" || t.natural === "bay") water.push({ segs: segsOf(pts), pts: closed ? pts : null });
    if (t.railway === "rail" || t.railway === "light_rail") rail.push(...segsOf(pts));
    if (t.amenity === "school") schools.push(centroid(pts));
    if (t.shop || ["restaurant", "cafe", "bar", "pub", "fast_food"].includes(t.amenity)) shops.push(centroid(pts));
    if (closed && (BAD_LANDUSE.has(t.landuse) || ["school", "university", "college", "hospital", "parking", "place_of_worship", "prison"].includes(t.amenity))) badAreas.push(pts);
    if (closed && t.building) buildings.push({ e, t, pts });
  }

  function distToShapes(x, y, shapes) {
    let best = Infinity;
    for (const s of shapes) {
      if (s.pts && s.pts.length > 3 && pointInPoly(x, y, s.pts)) return 0;
      for (const g of s.segs) { const d = segDist(x, y, ...g).d; if (d < best) best = d; }
    }
    return best;
  }
  function distToSegs(x, y, segs) { let best = Infinity; for (const g of segs) { const d = segDist(x, y, ...g).d; if (d < best) best = d; } return best; }
  function distToPts(x, y, pts) { let best = Infinity; for (const p of pts) { const d = Math.hypot(x - p[0], y - p[1]); if (d < best) best = d; } return best; }

  const candidates = [];
  for (const b of buildings) {
    const t = b.t;
    if (BAD_TAGS.some((k) => t[k])) continue;
    if (t.name && t.building !== "house") continue;
    const levels = parseFloat(t["building:levels"] || "0");
    let kind;
    const area = polyArea(b.pts);
    const bigPlain = hood.condo && (t.building === "yes" || t.building === "residential") && area >= 420 && area <= 4500 && !t.name;
    if (t.building === "apartments" || t.building === "condominium" || bigPlain) {
      if (!(area >= 250 && area <= 4500) || levels > 40) continue;
      if (!hood.condo && hood.mix[2] <= 0) continue;
      kind = 2;
    } else if (HOUSE_BUILDINGS.has(t.building)) {
      if (levels > 3) continue;
      if (t.building === "terrace" || t.building === "semidetached_house") { if (area < 50 || area > 500) continue; kind = 1; }
      else { if (area < 85 || area > 480) continue; kind = 0; }
    } else continue;
    const [cx, cy] = centroid(b.pts);
    if (Math.hypot(cx, cy) > 520) continue; // keep inside the core of the bbox so POI distances are meaningful
    if (badAreas.some((poly) => pointInPoly(cx, cy, poly))) continue;
    // nearest named road
    let best = null;
    for (const r of roads) for (const g of r.segs) {
      const s = segDist(cx, cy, ...g);
      if (!best || s.d < best.d) best = { d: s.d, qx: s.qx, qy: s.qy, road: r };
    }
    if (!best) continue;
    const maxD = kind === 2 ? 75 : 48;
    if (best.d < 6 || best.d > maxD) continue;
    if (best.road.cls >= 5) continue; // nobody's front door is on a highway
    // corner lot: a second, differently named road within 30 m
    let corner = false;
    for (const r of roads) if (r.name !== best.road.name) for (const g of r.segs) if (segDist(cx, cy, ...g).d < 30) { corner = true; break; }
    const lat = P.lat(cy), lng = P.lng(cx);
    const rlat = P.lat(best.qy), rlng = P.lng(best.qx);
    candidates.push({
      kind, area, lat, lng, rlat, rlng,
      heading: bearing(rlat, rlng, lat, lng),
      street: shortStreet(best.road.name),
      roadCls: best.road.cls,
      corner,
      levels,
      park: distToShapes(cx, cy, parks),
      golf: distToShapes(cx, cy, golf),
      water: distToShapes(cx, cy, water),
      school: distToPts(cx, cy, schools),
      major: distToSegs(cx, cy, major),
      hwy: distToSegs(cx, cy, highway),
      rail: distToSegs(cx, cy, rail),
      transit: distToPts(cx, cy, transit),
      shops: shops.filter((p) => Math.hypot(cx - p[0], cy - p[1]) < 600).length,
      x: cx, y: cy,
    });
  }

  // pick a spread-out sample
  const rnd = mulberry32(hashStr(city.id + hood.id));
  for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
  const chosen = [];
  let nHomes = 0, nCondos = 0;
  const wantCondos = hood.condo ? 30 : hood.mix[2] > 0 ? MAX_CONDOS : 0;
  const maxHomes = hood.condo ? Math.round(30 * (hood.mix[0] + hood.mix[1])) : MAX_HOMES;
  for (const c of candidates) {
    if (c.kind === 2 ? nCondos >= wantCondos : nHomes >= maxHomes) continue;
    if (chosen.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < (c.kind === 2 ? 60 : 28))) continue;
    chosen.push(c);
    if (c.kind === 2) nCondos++; else nHomes++;
  }

  const streets = [];
  const r1 = (v) => Math.round(v);
  const cap = (v) => (isFinite(v) ? Math.min(9999, Math.round(v)) : 9999);
  const homes = chosen.map((c) => {
    let si = streets.indexOf(c.street);
    if (si < 0) { streets.push(c.street); si = streets.length - 1; }
    const flags = (c.corner ? 1 : 0) | (c.roadCls >= 3 ? 2 : 0) | (c.hwy < 220 ? 4 : 0) | (c.rail < 250 ? 8 : 0);
    return [+c.lat.toFixed(6), +c.lng.toFixed(6), +c.rlat.toFixed(6), +c.rlng.toFixed(6), r1(c.heading), r1(c.area), si, c.kind, flags,
      cap(c.park), cap(c.school), cap(c.water), cap(c.major), cap(c.transit), Math.min(99, c.shops), cap(c.golf), c.levels || 0];
  });
  const stats = { candidates: candidates.length, homes: nHomes, condos: nCondos, roads: roads.length };
  return { homes, streets, stats };
}

const outCities = [];
let total = 0;
for (const city of cities) {
  const oc = { ...city, hoods: [] };
  for (const h of city.hoods) {
    const r = processHood(city, h);
    const stats = r ? r.stats : { candidates: 0, homes: 0, condos: 0 };
    console.log(`${(city.id + "/" + h.id).padEnd(28)} candidates ${String(stats.candidates).padStart(4)}  homes ${String(stats.homes).padStart(3)}  condos ${stats.condos}`);
    if (!r || r.homes.length < (h.condo ? 8 : 12)) { console.warn("  !! too few homes, neighborhood skipped"); continue; }
    total += r.homes.length;
    oc.hoods.push({ ...h, streets: r.streets, homes: r.homes });
  }
  outCities.push(oc);
}

const header = `// AUTO-GENERATED by tools/build-world.js — do not edit by hand.
// Real house locations: Map data © OpenStreetMap contributors (ODbL 1.0, https://www.openstreetmap.org/copyright).
// Home tuple: [lat, lng, streetLat, streetLng, svHeading, footprintM2, streetIdx, kind(0 house,1 townhome,2 condo), flags(1 corner,2 busy street,4 near highway,8 near rail),
//              parkM, schoolM, waterM, majorRoadM, transitM, shops600m, golfM, osmLevels]
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + "window.HH_WORLD = " + JSON.stringify({ cities: outCities }) + ";\n");
console.log(`\nWrote ${OUT}  (${total} homes, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
