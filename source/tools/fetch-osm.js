// Downloads OpenStreetMap data for every neighborhood in world-config.js.
// Usage: node tools/fetch-osm.js <cacheDir>
// Data © OpenStreetMap contributors, ODbL. Requests are made one at a time, politely.
const fs = require("fs");
const path = require("path");
const cities = require("./world-config");

const cacheDir = process.argv[2] || path.join(__dirname, ".osm-cache");
fs.mkdirSync(cacheDir, { recursive: true });

const HALF_LAT = 0.0032;
const HALF_LNG = 0.0040;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  for (const city of cities) {
    for (const h of city.hoods) {
      const file = path.join(cacheDir, `${city.id}-${h.id}.json`);
      if (fs.existsSync(file) && fs.statSync(file).size > 1000) continue;
      const bbox = [h.lng - HALF_LNG, h.lat - HALF_LAT, h.lng + HALF_LNG, h.lat + HALF_LAT].map((v) => v.toFixed(5)).join(",");
      const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox}`;
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const res = await fetch(url, { headers: { "User-Agent": "HouseHuntersGameDataBuilder/1.0 (one-time dataset build)" } });
          if (!res.ok) throw new Error("HTTP " + res.status);
          const text = await res.text();
          fs.writeFileSync(file, text);
          console.log(`ok   ${city.id}-${h.id}  ${(text.length / 1e6).toFixed(2)} MB`);
          break;
        } catch (e) {
          console.log(`fail ${city.id}-${h.id} attempt ${attempt}: ${e.message}`);
          await sleep(3000 * attempt);
        }
      }
      await sleep(1500);
    }
  }
}
main();
