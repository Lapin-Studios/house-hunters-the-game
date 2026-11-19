// Generates the housing market (all listings) for a city from a seed.
// Every peer in a multiplayer game runs this with the same seed and gets identical listings.
(function (HH) {
  "use strict";

  const CLIMATE = {
    austin:   { oneStory: 0.55, pool: 0.16, basement: 0.03, ac: 0.99, fireplace: 0.45, porch: 0.12, trees: "oak", solar: 0.09, viewLabel: "Hill Country view" },
    denver:   { oneStory: 0.45, pool: 0.03, basement: 0.65, ac: 0.72, fireplace: 0.6, porch: 0.06, trees: "deciduous", solar: 0.06, viewLabel: "Mountain view" },
    columbus: { oneStory: 0.35, pool: 0.04, basement: 0.7, ac: 0.88, fireplace: 0.55, porch: 0.1, trees: "deciduous", solar: 0.03, viewLabel: "Skyline view" },
    phoenix:  { oneStory: 0.85, pool: 0.45, basement: 0.02, ac: 1, fireplace: 0.3, porch: 0.05, trees: "desert", solar: 0.15, viewLabel: "Mountain view" },
    seattle:  { oneStory: 0.3, pool: 0.02, basement: 0.5, ac: 0.3, fireplace: 0.65, porch: 0.05, trees: "evergreen", solar: 0.04, viewLabel: "Water & mountain view" },
    nashville:{ oneStory: 0.45, pool: 0.08, basement: 0.25, ac: 0.98, fireplace: 0.55, porch: 0.2, trees: "deciduous", solar: 0.04, viewLabel: "Skyline view" },
    atlanta:  { oneStory: 0.4, pool: 0.1, basement: 0.4, ac: 0.99, fireplace: 0.6, porch: 0.25, trees: "deciduous", solar: 0.04, viewLabel: "Skyline view" },
    tampa:    { oneStory: 0.78, pool: 0.42, basement: 0, ac: 1, fireplace: 0.1, porch: 0.35, trees: "palm", solar: 0.07, viewLabel: "Water view" },
  };
  const DEFAULT_CLIMATE = CLIMATE.austin;

  const BROKERAGES = ["Keystone Realty Group", "Front Porch Properties", "Bluebird Homes", "Cornerstone & Co.", "Open Gate Realty", "Hearth & Key Real Estate", "Brick Lane Realty", "Northstar Home Partners", "Welcome Mat Realty", "True North Properties"];
  const AGENT_FIRST = ["Dana", "Marcus", "Priya", "Tom", "Lena", "Carlos", "Beth", "Andre", "Kim", "Rosa", "Greg", "Nadia", "Jules", "Owen", "Tasha", "Ravi", "Molly", "Hector", "Jin", "Shay"];
  const AGENT_LAST = ["Whitfield", "Okafor", "Brennan", "Delgado", "Nguyen", "Sato", "Holloway", "Patel", "Romero", "Fischer", "Kowalski", "Haddad", "Ellison", "Park", "Moreau", "Lindqvist"];
  const SCHOOL_NAMES = ["Lincoln", "Maple Grove", "Riverside", "Oak Hill", "Jefferson", "Cedar Ridge", "Willow Creek", "Franklin", "Sunnyside", "Parkview", "Highland", "Lakeview", "Meadowbrook", "Washington", "Pinecrest", "Bridgeport", "Hawthorne", "Brookside", "Fairview", "Summit"];
  const BUILDERS = ["Lone Pine Homes", "Arbor Lane Builders", "Clearwater Construction", "Hearthstone Homebuilders", "Graystone Custom Homes"];

  const EXTRAS = [
    { key: "pantry", text: "walk-in pantry" }, { key: "wine", text: "wine fridge" }, { key: "shelves", text: "built-in bookshelves" },
    { key: "clawfoot", text: "clawfoot tub" }, { key: "skylights", text: "skylights" }, { key: "vaulted", text: "vaulted ceilings" },
    { key: "mudroom", text: "mudroom with cubbies" }, { key: "heatedfloors", text: "heated bathroom floors" },
    { key: "outdoorkitchen", text: "outdoor kitchen", yard: true }, { key: "firepit", text: "fire pit", yard: true },
    { key: "chickens", text: "chicken coop", yard: true }, { key: "sportcourt", text: "backyard sport court", yard: true },
    { key: "gym", text: "home gym" }, { key: "sauna", text: "sauna" }, { key: "musicroom", text: "soundproofed music room" },
    { key: "dogrun", text: "dog run", yard: true }, { key: "generator", text: "whole-house generator" },
    { key: "tankless", text: "tankless water heater" }, { key: "farmsink", text: "farmhouse sink" },
    { key: "pizzaoven", text: "wood-fired pizza oven", yard: true }, { key: "koi", text: "koi pond", yard: true },
    { key: "treehouse", text: "treehouse", yard: true }, { key: "puttinggreen", text: "putting green", yard: true },
    { key: "library", text: "reading nook" }, { key: "theater", text: "media room" }, { key: "craftroom", text: "craft room" },
  ];
  HH.EXTRAS = EXTRAS;

  const PALETTES = {
    Craftsman: [["#7f9a7a", "#4b3b2f", "#f3ead7", "#9c3b2e"], ["#5d7d8f", "#3c3c3c", "#efe9dc", "#c08a2e"], ["#a86a4a", "#3b2f2a", "#efe4cf", "#2f5d50"], ["#c9b37e", "#4a4038", "#fbf6ea", "#7a2f2f"]],
    Bungalow: [["#e3c178", "#5a4636", "#fffaf0", "#2d6a4f"], ["#8fb3c7", "#4a4a4a", "#ffffff", "#b5523b"], ["#d98c6a", "#433028", "#fff6ea", "#3d5a80"], ["#b9c99a", "#4d4033", "#fbf8ef", "#8c2f39"]],
    Ranch: [["#d9c6a5", "#6b5644", "#ffffff", "#7a3e2b"], ["#a7b8a8", "#4f4f4f", "#f7f7f2", "#335c67"], ["#e8dcc6", "#5a4a3c", "#ffffff", "#a23e48"], ["#c7d3dd", "#555555", "#ffffff", "#2b4162"]],
    Colonial: [["#f2efe6", "#3d3d3d", "#ffffff", "#1d3557"], ["#c44536", "#2f2f2f", "#ffffff", "#1b1b1b"], ["#9db4c0", "#383838", "#ffffff", "#7b2d26"], ["#e9e2d0", "#4a4a4a", "#ffffff", "#2f4b3a"]],
    Tudor: [["#efe5d0", "#4a3a33", "#4a3226", "#7a2f2f"], ["#e6dccb", "#3d3530", "#3b2a20", "#2e4a3d"]],
    Victorian: [["#7d4e8a", "#3b2f3f", "#f6e7b0", "#2e8b57"], ["#2f6d73", "#3a3030", "#f3d9a4", "#b23a48"], ["#e3a857", "#4d3a2e", "#fff3d6", "#3b5998"], ["#c96f6f", "#3c2c2c", "#f8edd8", "#3f6e4a"]],
    Modern: [["#f4f4f2", "#2b2b2b", "#2b2b2b", "#c08457"], ["#3a3f44", "#1f1f1f", "#c8a27a", "#e6b655"], ["#d8d4cc", "#333333", "#6b4f3a", "#2b2b2b"]],
    Farmhouse: [["#fafafa", "#2b2b2b", "#2b2b2b", "#1f1f1f"], ["#f1efe9", "#3a3a3a", "#3a3a3a", "#7a5c3e"], ["#e8e4da", "#2f2f2f", "#ffffff", "#3c5a73"]],
    Spanish: [["#efd9b4", "#b3532f", "#ffffff", "#5a3a22"], ["#f4e6cf", "#a8482b", "#f9f3e8", "#2f5d50"], ["#e6c79c", "#9b4a2a", "#ffffff", "#6b2f2f"]],
    Southwest: [["#d8b48a", "#a0593a", "#efe0c8", "#5b3a29"], ["#e3c9a3", "#8f5a3c", "#f5ead9", "#2e5d6b"], ["#cfa77c", "#7d4f35", "#efe2cf", "#3d3d3d"]],
    Mediterranean: [["#f2e3c6", "#c0653f", "#ffffff", "#2a6f97"], ["#f6efe0", "#b3592f", "#ffffff", "#7a4a2a"], ["#e9d6b5", "#a6533a", "#ffffff", "#3a5a40"]],
    MidCentury: [["#e8c547", "#3f3f3f", "#ffffff", "#2a9d8f"], ["#8ab17d", "#353535", "#f4f1de", "#e76f51"], ["#f4a261", "#3a3a3a", "#ffffff", "#264653"], ["#d9d4c7", "#3f3f3f", "#ffffff", "#e63946"]],
    Traditional: [["#cfc6b8", "#4e4b48", "#ffffff", "#5b2333"], ["#b8c4bb", "#4a4a4a", "#ffffff", "#283d3b"], ["#e2d4c0", "#5a4d41", "#ffffff", "#1f3b57"], ["#b5a58c", "#4a3f35", "#f6f0e6", "#6a2e35"]],
    Brick: [["#a2483a", "#3b3b3b", "#f3ede2", "#1f3d2b"], ["#8c3f33", "#2f2f2f", "#ffffff", "#2b3d5a"], ["#b5654a", "#3d3530", "#f7efe2", "#3a3a3a"]],
    Contemporary: [["#c9c3b6", "#3a3a3a", "#ffffff", "#8a5a44"], ["#9aa6a6", "#2f2f2f", "#e8e2d6", "#c49a4a"], ["#e4ddd0", "#454545", "#5c4632", "#2b2b2b"]],
    CapeCod: [["#dfe8ee", "#3e3e3e", "#ffffff", "#9d2933"], ["#f3efe6", "#4a4a4a", "#ffffff", "#1d4e89"], ["#c8d5b9", "#3e3e3e", "#ffffff", "#7a3e2b"]],
    Condo: [["#d9d4cc", "#3a3f44", "#9fb7c7", "#c08457"], ["#b8b2a7", "#2f3437", "#a7c4d4", "#2b2b2b"], ["#c66b4f", "#2d2d2d", "#b6cdd6", "#3b3b3b"], ["#8e9aa3", "#2c3135", "#c4d6df", "#e6b655"]],
    Townhome: [["#c9b8a3", "#3d3d3d", "#ffffff", "#2f4b3a"], ["#9fb0b8", "#383838", "#ffffff", "#7a2f2f"], ["#e0d2bc", "#4a4038", "#ffffff", "#1f3b57"]],
  };
  const STYLE_ART = {
    // label -> {art: palette key, roof: gable|hip|flat|gambrel|steep|lowhip|shed, porch: bool}
    "Craftsman": { art: "Craftsman", roof: "gable", porch: true },
    "Bungalow": { art: "Bungalow", roof: "gable", porch: true },
    "Foursquare": { art: "Colonial", roof: "hip", porch: true },
    "Tudor": { art: "Tudor", roof: "steep", porch: false },
    "Victorian": { art: "Victorian", roof: "steep", porch: true },
    "Brick Cottage": { art: "Brick", roof: "steep", porch: false },
    "Italianate": { art: "Brick", roof: "lowhip", porch: true },
    "Colonial": { art: "Colonial", roof: "gable", porch: false },
    "Cape Cod": { art: "CapeCod", roof: "steep", porch: false },
    "Ranch": { art: "Ranch", roof: "lowhip", porch: false },
    "Mid-Century Modern": { art: "MidCentury", roof: "shed", porch: false },
    "Split-Level": { art: "Traditional", roof: "gable", porch: false },
    "Traditional": { art: "Traditional", roof: "hip", porch: false },
    "Contemporary": { art: "Contemporary", roof: "shed", porch: false },
    "Modern": { art: "Modern", roof: "flat", porch: false },
    "Modern Farmhouse": { art: "Farmhouse", roof: "gable", porch: true },
    "Spanish Revival": { art: "Spanish", roof: "lowhip", porch: false },
    "Southwest Stucco": { art: "Southwest", roof: "flat", porch: false },
    "Mediterranean": { art: "Mediterranean", roof: "lowhip", porch: false },
    "Tall-and-Skinny": { art: "Modern", roof: "shed", porch: false },
    "Townhome": { art: "Townhome", roof: "gable", porch: false },
    "Condo": { art: "Condo", roof: "flat", porch: false },
    "Historic Loft": { art: "Condo", roof: "flat", porch: false },
  };
  HH.STYLE_ART = STYLE_ART;
  HH.PALETTES = PALETTES;

  function pickStyle(r, city, hood, year, kind) {
    if (kind === 2) return year < 1945 ? "Historic Loft" : "Condo";
    if (kind === 1) return "Townhome";
    const c = city.id;
    if (year < 1900) return c === "columbus" ? r.pick(["Italianate", "Brick Cottage", "Victorian"]) : "Victorian";
    if (year < 1946) {
      const opts = {
        seattle: ["Craftsman", "Craftsman", "Foursquare", "Tudor", "Bungalow"],
        denver: ["Bungalow", "Bungalow", "Tudor", "Foursquare", "Victorian"],
        columbus: ["Brick Cottage", "Foursquare", "Tudor", "Colonial", "Bungalow"],
        austin: ["Bungalow", "Craftsman", "Tudor", "Bungalow"],
        atlanta: ["Craftsman", "Bungalow", "Tudor", "Craftsman"],
        nashville: ["Bungalow", "Craftsman", "Tudor", "Victorian"],
        tampa: ["Bungalow", "Craftsman", "Mediterranean", "Bungalow"],
        phoenix: ["Spanish Revival", "Bungalow"],
      }[c] || ["Bungalow", "Craftsman", "Tudor"];
      return r.pick(opts);
    }
    if (year < 1976) {
      if (c === "phoenix") return r.pick(["Ranch", "Ranch", "Mid-Century Modern", "Southwest Stucco"]);
      if (c === "tampa") return r.pick(["Ranch", "Ranch", "Mid-Century Modern"]);
      return r.pick(["Ranch", "Ranch", "Mid-Century Modern", "Split-Level", "Cape Cod", "Colonial"]);
    }
    if (year < 2005) {
      if (c === "phoenix") return r.pick(["Southwest Stucco", "Southwest Stucco", "Ranch", "Spanish Revival"]);
      if (c === "tampa") return r.pick(["Mediterranean", "Ranch", "Mediterranean", "Traditional"]);
      return r.pick(["Traditional", "Traditional", "Colonial", "Contemporary", "Ranch", "Split-Level"]);
    }
    if (c === "phoenix") return r.pick(["Southwest Stucco", "Modern", "Spanish Revival", "Modern Farmhouse"]);
    if (c === "tampa") return r.pick(["Mediterranean", "Modern", "Modern Farmhouse"]);
    if (c === "nashville" && hood.ppsf >= 400) return r.pick(["Tall-and-Skinny", "Modern Farmhouse", "Modern Farmhouse", "Craftsman"]);
    return r.pick(["Modern Farmhouse", "Modern", "Contemporary", "Traditional", "Craftsman"]);
  }
  const ONE_STORY_STYLES = new Set(["Ranch", "Bungalow", "Mid-Century Modern", "Southwest Stucco", "Spanish Revival", "Mediterranean"]);
  const TWO_STORY_STYLES = new Set(["Colonial", "Foursquare", "Victorian", "Tall-and-Skinny", "Italianate", "Split-Level", "Townhome"]);

  function priceRound(r, p) {
    if (p >= 1e6) return Math.round(p / 25000) * 25000 - (r.chance(0.3) ? 1000 : 0);
    const base = Math.round(p / 5000) * 5000;
    return r.chance(0.5) ? base - 100 : base;
  }

  const DAY = 86400000;
  function dateStr(t) {
    const d = new Date(t);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function genListing(city, hood, tuple, idx, r, today) {
    const [lat, lng, slat, slng, heading, area, si, kind, flags, parkM, schoolM, waterM, majorM, transitM, shops, golfM, levels] = tuple;
    const cl = CLIMATE[city.id] || DEFAULT_CLIMATE;
    const L = { id: `${city.id}-${hood.id}-${idx}`, cityId: city.id, hoodId: hood.id, hoodName: hood.name, lat, lng, svLat: slat, svLng: slng, svHeading: heading, kind };
    L.type = kind === 2 ? "condo" : kind === 1 ? "townhome" : "house";
    L.typeLabel = { house: "Single-Family", townhome: "Townhome", condo: "Condo" }[L.type];

    // ---- year built ----
    const [e0, e1] = hood.era;
    let year = Math.round(e0 + (e1 - e0) * Math.pow(r.next(), 1.1));
    if (e1 >= 2015 && e0 < 1990 && kind === 0 && r.chance(0.13)) year = r.int(2016, 2025);
    L.yearBuilt = year;
    L.newBuild = year >= 2021;
    L.style = pickStyle(r, city, hood, year, kind);

    // ---- size / stories ----
    const fp = area * 10.764;
    if (kind === 2) {
      L.stories = 1;
      L.unitFloor = Math.max(1, Math.min(levels > 1 ? Math.round(levels) : r.int(3, 18), r.int(1, 24)));
      L.buildingFloors = Math.max(L.unitFloor, levels > 0 ? Math.round(levels) : L.unitFloor + r.int(0, 6));
      L.sqft = Math.round((r.chance(0.2) ? r.range(520, 760) : r.range(700, 1750)) / 10) * 10;
    } else if (kind === 1) {
      L.stories = r.chance(0.3) ? 3 : 2;
      L.sqft = Math.round(r.range(1150, 2500) / 10) * 10;
    } else {
      let one = cl.oneStory;
      if (ONE_STORY_STYLES.has(L.style)) one += 0.3;
      if (TWO_STORY_STYLES.has(L.style)) one -= 0.6;
      if (year >= 2005) one -= 0.15;
      if (area > 260) one += 0.12;
      if (area < 120) one -= 0.1;
      L.stories = levels >= 1 ? Math.min(3, Math.round(levels)) : r.chance(HH.clamp(one, 0.04, 0.96)) ? 1 : (L.style === "Tall-and-Skinny" && r.chance(0.3) ? 3 : 2);
      // keep the style label consistent with the real story count
      const remap1 = { Colonial: "Ranch", Foursquare: "Bungalow", Victorian: "Bungalow", "Tall-and-Skinny": "Modern", Italianate: "Brick Cottage" };
      const remap2 = { Ranch: "Traditional", Bungalow: "Craftsman", "Mid-Century Modern": "Contemporary" };
      if (L.stories === 1 && remap1[L.style]) L.style = remap1[L.style];
      if (L.stories >= 2 && remap2[L.style]) L.style = remap2[L.style];
      let sq = L.stories === 1 ? fp * r.range(0.6, 0.76) : L.stories === 2 ? fp * r.range(1.08, 1.3) : fp * r.range(1.5, 1.75);
      L.sqft = Math.round(HH.clamp(sq, 650, 7200) / 10) * 10;
    }
    // basement
    L.basement = 0;
    if (kind === 0 && r.chance(cl.basement * (year > 2010 ? 0.6 : 1))) L.basement = r.chance(0.55) ? 2 : 1;
    if (L.basement === 2) L.sqft = Math.round((L.sqft + fp * r.range(0.45, 0.65)) / 10) * 10;

    // beds & baths
    if (kind === 2) {
      L.beds = L.sqft < 650 ? 0 : L.sqft < 950 ? 1 : L.sqft < 1350 ? 2 : r.chance(0.6) ? 2 : 3;
      L.baths = L.beds <= 1 ? (r.chance(0.2) ? 1.5 : 1) : r.chance(0.6) ? 2 : 2.5;
    } else {
      let beds = Math.round(L.sqft / 610) + (r.chance(0.25) ? 1 : 0) - (r.chance(0.2) ? 1 : 0);
      beds = HH.clamp(beds, L.sqft > 1000 ? 2 : 1, Math.min(7, Math.floor(L.sqft / 330)));
      L.beds = beds;
      let baths = 1 + (L.sqft - 900) / 900 + (year >= 2000 ? 0.5 : 0) + (r.chance(0.3) ? 0.5 : 0);
      baths = Math.round(baths * 2) / 2;
      if (beds >= 3) baths = Math.max(baths, 1.5);
      if (kind === 1) baths = Math.max(baths, 2.5);
      L.baths = HH.clamp(baths, 1, Math.min(7, beds + 1.5));
    }

    // lot
    if (kind === 2) L.lotAcres = 0;
    else if (kind === 1) L.lotAcres = Math.round(r.range(0.02, 0.06) * 100) / 100;
    else {
      let lot = r.range(hood.lot[0], hood.lot[1]) * ((flags & 1) ? 1.12 : 1);
      lot = Math.max(lot, (area * 2.4) / 4047);
      L.lotAcres = Math.round(lot * 100) / 100;
    }

    // garage / parking
    if (kind === 2) {
      L.garage = r.chance(0.8) ? 1 : 0;
      L.garageType = L.garage ? (r.chance(0.7) ? "Garage parking (1 space)" : "Assigned surface spot") : "Street parking";
      if (L.garage && r.chance(0.15)) { L.garage = 2; L.garageType = "Garage parking (2 spaces)"; }
    } else if (kind === 1) {
      L.garage = r.chance(0.6) ? 2 : 1;
      L.garageType = `Attached ${L.garage}-car garage`;
    } else if (year < 1946) {
      const g = r.weighted([0, 1, 2], [0.45, 0.38, 0.17]);
      L.garage = g;
      L.garageType = g ? `Detached ${g}-car garage` : "Driveway / street parking";
    } else if (year < 1976) {
      const g = r.weighted([0, 1, 2], [0.2, 0.32, 0.48]);
      L.garage = g;
      L.garageType = g ? (city.id === "phoenix" && r.chance(0.45) ? `${g}-car carport` : `Attached ${g}-car garage`) : "Driveway parking";
    } else {
      const big = L.sqft > 3200;
      const g = r.weighted([1, 2, 3], [0.04, big ? 0.6 : 0.86, big ? 0.36 : 0.1]);
      L.garage = g;
      L.garageType = `Attached ${g}-car garage`;
    }
    L.carport = /carport/.test(L.garageType);

    // condition & renovation
    const age = 2026 - year;
    if (year >= 2019) L.condition = 3;
    else {
      const cheap = hood.ppsf < 260;
      const fixerP = cheap ? 0.15 : 0.05, tlcP = age > 30 ? 0.2 : 0.1;
      L.condition = r.weighted([0, 1, 2, 3], [fixerP, tlcP, 0.42, 0.33]);
    }
    L.renovated = 0;
    if (age > 22 && L.condition >= 2 && r.chance(0.6)) L.renovated = r.int(2012, 2025);
    if (L.renovated && L.condition === 2 && r.chance(0.5)) L.condition = 3;
    L.conditionLabel = ["Fixer-upper", "Needs TLC", "Good", "Move-in ready"][L.condition];

    // ---- features ----
    const lux = hood.ppsf >= 500;
    const F = {};
    const isHouse = kind === 0;
    F.pool = isHouse && r.chance(cl.pool * (lux ? 1.4 : 1) * (L.lotAcres > 0.25 ? 1.3 : 0.8));
    F.fenced = isHouse ? r.chance(0.6) : kind === 1 ? r.chance(0.3) : false;
    if (F.pool) F.fenced = true;
    F.office = r.chance(kind === 2 ? 0.14 : L.sqft > 2400 ? 0.6 : L.sqft > 1600 ? 0.38 : 0.15);
    F.fireplace = r.chance(kind === 2 ? 0.18 : cl.fireplace);
    F.ac = year >= 2005 ? true : r.chance(cl.ac);
    F.solar = isHouse && r.chance(cl.solar * (year >= 2015 ? 1.6 : 1));
    F.ev = r.chance(year >= 2015 ? 0.22 : kind === 2 ? 0.1 : 0.06);
    F.hardwood = r.chance(year < 1950 ? 0.85 : year >= 2010 ? 0.5 : 0.4);
    F.carpet = r.chance(F.hardwood ? 0.18 : (city.id === "phoenix" || city.id === "tampa") ? 0.35 : 0.6);
    F.kitchen = year >= 2010 || L.renovated >= 2012 || (L.condition === 3 && r.chance(0.5)) || r.chance(0.12);
    if (L.condition <= 1) F.kitchen = r.chance(0.08);
    F.primaryMain = L.stories === 1 || kind === 2 || r.chance(0.28);
    F.adu = isHouse && r.chance((["austin", "seattle", "denver", "nashville", "atlanta"].includes(city.id) ? 0.07 : 0.035) + (L.lotAcres > 0.2 ? 0.06 : 0));
    F.workshop = isHouse && r.chance(0.08 + (L.lotAcres > 0.3 ? 0.14 : 0) + (L.garage >= 2 && year < 1990 ? 0.04 : 0));
    F.deck = kind !== 2 ? r.chance(0.62) : r.chance(0.55); // condo: balcony
    F.porch = kind !== 2 && r.chance(cl.porch + (STYLE_ART[L.style] && STYLE_ART[L.style].porch ? 0.1 : 0));
    F.waterfront = waterM < 45;
    F.golf = golfM < 120;
    F.view = F.waterfront || (kind === 2 && L.unitFloor >= 6 && r.chance(0.65)) ||
      r.chance(({ queenanne: 0.45, arcadia: 0.35, ahwatukee: 0.3, highlands: 0.3, tarrytown: 0.12, westseattle: 0.25, ballard: 0.1, travisheights: 0.12 })[hood.id] || 0.03);
    F.smart = r.chance(year >= 2015 ? 0.45 : 0.1);
    F.garden = isHouse && L.lotAcres > 0.18 && r.chance(0.25);
    F.hotTub = r.chance(F.pool ? 0.32 : 0.05) && kind !== 2;
    F.rv = isHouse && L.lotAcres > 0.3 && r.chance(0.18);
    F.laundry = kind !== 2 || r.chance(0.75);
    if (kind === 2) {
      F.elevator = year > 1970 ? r.chance(0.92) : r.chance(0.35);
      F.gym = r.chance(year > 2000 ? 0.7 : 0.3);
      F.doorman = r.chance(hood.ppsf >= 550 ? 0.35 : 0.1);
      F.rooftop = r.chance(year > 2005 ? 0.45 : 0.12);
      F.bldgPool = r.chance(["phoenix", "tampa", "austin", "atlanta"].includes(city.id) ? 0.6 : 0.18);
    }
    L.f = F;
    L.viewLabel = F.waterfront ? "Waterfront" : kind === 2 ? (r.chance(0.5) ? "City skyline view" : cl.viewLabel) : cl.viewLabel;

    // ---- real location attributes (from OpenStreetMap) ----
    L.loc = {
      parkM: parkM, schoolM: schoolM, waterM: waterM, transitM: transitM, majorM: majorM,
      busy: !!(flags & 2), highway: !!(flags & 4), rail: !!(flags & 8), corner: !!(flags & 1),
      nearPark: parkM < 250, nearWater: waterM < 300, transit: transitM < 350,
    };
    L.loc.quiet = !L.loc.busy && !L.loc.highway && !L.loc.rail;
    const walk = 16 + 15.5 * Math.log2(1 + shops) + (transitM < 300 ? 7 : 0) + (parkM < 300 ? 3 : 0) + r.int(-4, 4);
    L.walk = Math.round(HH.clamp(walk, 4, 98));
    L.schoolRating = HH.clamp(r.int(hood.school[0], hood.school[1]) + (r.chance(0.1) ? -1 : 0), 1, 10);
    L.schoolName = SCHOOL_NAMES[HH.hash(hood.id + Math.floor(lat * 120) + Math.floor(lng * 120)) % SCHOOL_NAMES.length] + " Elementary";

    // flood
    let floodP = waterM < 80 ? 0.7 : waterM < 220 ? 0.3 : 0.02;
    if (city.id === "tampa") floodP += 0.15;
    L.flood = kind === 2 && L.unitFloor > 2 ? false : r.chance(Math.min(0.9, floodP));

    // HOA
    L.hoa = 0;
    L.hoaRules = [];
    if (kind === 2) L.hoa = Math.round(r.range(240, 520) * (hood.ppsf / 450) * (F.doorman ? 1.4 : 1) / 5) * 5;
    else if (kind === 1) L.hoa = Math.round(r.range(140, 320) / 5) * 5;
    else if (r.chance(hood.hoa)) L.hoa = Math.round((F.golf || lux ? r.range(120, 300) : r.range(30, 140)) / 5) * 5;
    if (L.hoa) {
      if (r.chance(0.45)) L.hoaRules.push("No short-term rentals");
      if (r.chance(0.15)) L.hoaRules.push("No rentals in the first 2 years");
      if (kind === 0 && r.chance(0.3)) L.hoaRules.push("No RVs or boats in driveway");
      if (r.chance(0.2)) L.hoaRules.push("Exterior changes need HOA approval");
    }
    L.noRentals = L.hoaRules.some((x) => /rentals/.test(x));
    // pet policy
    if (kind === 2) L.pets = r.weighted(["Pets allowed", "Cats & dogs under 25 lb", "Cats only", "No pets"], [0.5, 0.25, 0.1, 0.15]);
    else if (L.hoa && r.chance(0.12)) L.pets = "Max 2 pets";
    else L.pets = "Pets allowed";
    L.bigDogOK = L.pets === "Pets allowed" || L.pets === "Max 2 pets";
    L.dogOK = L.pets !== "Cats only" && L.pets !== "No pets";

    // possession / timeline
    const occ = r.weighted(["vacant", "owner", "tenant"], [0.3, 0.55, 0.15]);
    if (occ === "vacant") { L.closeDays = r.pick([14, 21]); L.possession = "Vacant — quick close possible"; }
    else if (occ === "owner") { L.closeDays = r.pick([30, 30, 45]); L.possession = `Owner-occupied — ${L.closeDays}-day close`; }
    else { L.closeDays = r.pick([60, 75, 90]); L.possession = `Tenant-occupied — lease ends in ${Math.round(L.closeDays / 30)} months`; }

    // disclosures
    const D = [];
    L.issues = { asIs: false, major: false };
    if (L.condition <= 1) {
      const pool = [
        `Roof is near the end of its life (installed ${year < 1995 ? r.int(1996, 2004) : year}).`,
        "Foundation settling noted; structural engineer's report available.",
        `Original ${Math.min(1980, Math.floor(year / 10) * 10)}s electrical panel may need replacement.`,
        `HVAC system is ${r.int(18, 27)} years old.`,
        "Galvanized plumbing in parts of the home.",
        `Termite damage repaired in ${r.int(2008, 2022)}.`,
      ];
      if (L.basement) pool.push(`Past water intrusion in the basement (last occurred ${r.int(2015, 2024)}).`);
      D.push(...r.sample(pool, L.condition === 0 ? 2 : 1));
      L.issues.major = true;
      if (L.condition === 0 && r.chance(0.65)) { D.push("Sold strictly AS-IS. Seller will make no repairs."); L.issues.asIs = true; }
    } else {
      if (r.chance(0.3)) D.push(r.pick([`New roof installed in ${r.int(2018, 2025)}.`, `HVAC replaced in ${r.int(2017, 2025)}.`, `Water heater replaced in ${r.int(2019, 2025)}.`, "Pre-listing inspection available — no major issues."]));
    }
    if (L.flood) D.push("Located in a FEMA flood zone (AE). Flood insurance required by lenders.");
    if (L.loc.rail) D.push("Freight/commuter rail line nearby.");
    if (L.hoaRules.length) D.push("HOA rules: " + L.hoaRules.join("; ") + ".");
    L.disclosures = D;

    // ---- price ----
    let ppsf = hood.ppsf * (kind === 1 ? 0.93 : 1);
    ppsf *= Math.pow(2000 / Math.max(500, L.sqft), kind === 2 ? 0.05 : 0.14);
    let m = 1;
    m *= [0.7, 0.86, 0.98, 1.05][L.condition];
    if (L.newBuild) m *= 1.1; else if (L.renovated >= 2016) m *= 1.04;
    if (kind === 0) {
      const mid = (hood.lot[0] + hood.lot[1]) / 2;
      m *= HH.clamp(1 + 0.18 * (L.lotAcres - mid) / mid, 0.86, 1.35);
    }
    if (F.pool) m *= 1.04;
    if (F.view) m *= 1.06;
    if (F.waterfront) m *= 1.22;
    if (F.golf) m *= 1.05;
    if (F.adu) m *= 1.07;
    if (F.solar) m *= 1.02;
    m *= 1 + (L.garage - 1.5) * 0.02;
    if (L.loc.busy) m *= 0.91;
    if (L.loc.highway) m *= 0.94;
    if (L.loc.rail) m *= 0.95;
    if (L.flood) m *= 0.97;
    m *= 1 + (L.schoolRating - 7) * 0.012;
    if (L.walk > 80) m *= 1.03;
    if (kind === 2) { m *= 1 + L.unitFloor * 0.004; if (F.doorman) m *= 1.05; }
    m *= r.range(0.94, 1.06);
    L.price = Math.max(60000, priceRound(r, L.sqft * ppsf * m));
    L.ppsf = Math.round(L.price / L.sqft);

    // ---- market status ----
    L.dom = r.weighted([0, 1, 2], [0.35, 0.4, 0.25]);
    L.dom = L.dom === 0 ? r.int(0, 6) : L.dom === 1 ? r.int(7, 30) : r.int(31, 140);
    L.history = [];
    const listedT = today - L.dom * DAY;
    L.origPrice = L.price;
    if (L.dom > 21 && r.chance(0.45)) {
      L.origPrice = priceRound(r, L.price * r.range(1.03, 1.09));
      L.history.push({ date: dateStr(listedT), event: "Listed for sale", price: L.origPrice });
      L.history.push({ date: dateStr(today - r.int(2, Math.max(3, L.dom - 10)) * DAY), event: "Price cut", price: L.price });
    } else {
      L.history.push({ date: dateStr(listedT), event: "Listed for sale", price: L.price });
    }
    if (r.chance(0.6)) {
      const soldYear = r.int(Math.max(year + 1, 1990), 2021);
      const back = Math.pow(1.045, 2026 - soldYear);
      L.history.push({ date: `${r.pick(["Mar", "Jun", "Aug", "Oct", "Apr", "Jul"])} ${r.int(1, 28)}, ${soldYear}`, event: "Sold", price: Math.round(L.price / back / r.range(1.0, 1.3) / 1000) * 1000 });
    }
    L.status = r.chance(0.07) ? "pending" : "active";
    if (L.status === "pending") L.history.push({ date: dateStr(today - r.int(0, Math.min(L.dom, 6)) * DAY), event: "Pending (under contract)", price: L.price });
    L.badges = [];
    if (L.status === "pending") L.badges.push("pending");
    if (L.dom <= 3) L.badges.push("new");
    if (L.origPrice > L.price) L.badges.push("pricecut");
    if (L.status === "active" && r.chance(0.15)) L.badges.push("openhouse");
    if (L.newBuild && kind === 0) L.badges.push("newbuild");

    // ---- costs ----
    L.taxAnnual = Math.round(L.price * city.tax / 100);
    L.insureAnnual = Math.round((L.price * 0.0034 * city.insure + (L.flood ? 1400 : 0)) / 10) * 10;
    if (kind === 2) L.insureAnnual = Math.round(L.insureAnnual * 0.35 / 10) * 10;
    L.pi = Math.round(HH.mortgage(L.price, HH.RATE, 30, HH.DOWN));
    L.monthly = Math.round(L.pi + L.taxAnnual / 12 + L.insureAnnual / 12 + L.hoa);

    // ---- address ----
    const street = hood.streets[si];
    L.street = street;
    const base = (HH.hash(hood.id + street) % 64 + 1) * 100;
    L.num = base + 2 * r.int(1, 48) + (r.chance(0.5) ? 1 : 0);
    if (kind === 2) L.unit = "#" + L.unitFloor + String(r.int(1, 12)).padStart(2, "0");
    L.address = `${L.num} ${street}${L.unit ? " " + L.unit : ""}`;
    L.mls = city.id.slice(0, 3).toUpperCase() + "-" + (1000000 + (HH.hash(L.id + today) % 8999999));

    // ---- extras (description-only details) ----
    const extraPool = EXTRAS.filter((x) => !(x.yard && (kind === 2 || L.lotAcres < 0.08)));
    L.extras = r.sample(extraPool, r.weighted([0, 1, 2, 3], [0.15, 0.4, 0.3, 0.15])).map((x) => x.key);

    // ---- listing agent ----
    L.agent = { name: r.pick(AGENT_FIRST) + " " + r.pick(AGENT_LAST), brokerage: r.pick(BROKERAGES) };

    // ---- art ----
    const sa = STYLE_ART[L.style] || STYLE_ART.Traditional;
    const pal = r.pick(PALETTES[sa.art] || PALETTES.Traditional);
    L.art = { style: L.style, palette: pal, roof: sa.roof, stories: L.stories, garage: kind === 0 ? Math.min(3, L.garage) : kind === 1 ? 1 : 0, garageDetached: /Detached|carport/.test(L.garageType), porch: F.porch || (sa.porch && r.chance(0.7)), chimney: F.fireplace, fence: F.fenced, pool: F.pool, solar: F.solar, trees: cl.trees, condition: L.condition, seed: r.seed(), floors: L.buildingFloors || 0, unitFloor: L.unitFloor || 0, wide: HH.clamp((L.sqft / L.stories) / 1800, 0.65, 1.35) };

    L.description = describe(L, city, hood, r);
    L.searchText = (L.address + " " + L.hoodName + " " + L.style + " " + L.typeLabel + " " + L.description + " " + L.disclosures.join(" ")).toLowerCase();
    return L;
  }

  function extraText(key) { const x = EXTRAS.find((e) => e.key === key); return x ? x.text : key; }
  HH.extraText = extraText;

  function describe(L, city, hood, r) {
    const F = L.f, s = [];
    const decade = Math.floor(L.yearBuilt / 10) * 10;
    const style = L.style.toLowerCase();
    const bedWord = L.beds === 0 ? "studio" : `${L.beds}-bedroom`;
    if (L.type === "condo") {
      s.push(r.pick([
        `Lock-and-leave living in this ${bedWord} condo on the ${HH.ordinal(L.unitFloor)} floor${F.view ? " with " + L.viewLabel.toLowerCase() + "s" : ""}.`,
        `Welcome to ${hood.name}! This bright ${bedWord} ${L.style === "Historic Loft" ? "historic loft" : "condo"} puts the whole neighborhood at your doorstep.`,
        `Sleek ${bedWord} residence on the ${HH.ordinal(L.unitFloor)} floor of a ${L.yearBuilt < 1945 ? "beautifully converted historic" : "well-run"} building.`,
      ]));
    } else if (L.condition === 0) {
      s.push(r.pick([
        `Calling all investors and DIYers! This ${decade}s ${style} has great bones and is priced to sell.`,
        `Bring your vision and your toolbox: a ${bedWord} ${style} in ${hood.name} ready for a full makeover.`,
        `Opportunity knocks! Needs a lot of love, but the location in ${hood.name} can't be beat.`,
      ]));
    } else if (L.condition === 1) {
      s.push(r.pick([
        `Charming ${decade}s ${style} that needs some TLC — make it your own!`,
        `Solid ${bedWord} ${style} with original character. Some updates needed.`,
      ]));
    } else if (L.newBuild) {
      s.push(`Brand-new ${style} by ${r.pick(BUILDERS)} — never lived in, with builder warranty.`);
    } else {
      s.push(r.pick([
        `Welcome home to this ${L.condition === 3 ? "beautifully updated" : "well-kept"} ${bedWord} ${style} in the heart of ${hood.name}.`,
        `Move right in to this ${r.pick(["light-filled", "inviting", "classic", "spacious", "stylish"])} ${style}${L.renovated ? ", thoughtfully renovated in " + L.renovated : ""}.`,
        `This ${L.yearBuilt < 1950 ? "character-filled" : "sharp"} ${style} checks all the boxes in ${hood.name}.`,
      ]));
    }
    if (F.kitchen) s.push(r.pick(["The updated kitchen features quartz counters and stainless appliances.", "Chef's kitchen with a big island, gas range, and plenty of storage.", "Renovated kitchen opens to the living area — perfect for entertaining."]));
    else if (L.condition >= 2) s.push(r.pick(["Original kitchen is clean and functional, ready for your personal touch.", "Kitchen is dated but well maintained."]));
    if (F.primaryMain && L.stories > 1) s.push("Primary suite is conveniently located on the main level.");
    if (F.office) s.push(r.pick(["A dedicated home office makes working from home easy.", "Bonus room works perfectly as a home office.", "Quiet den/office with French doors."]));
    if (L.basement === 2) s.push("Finished basement adds a rec room and extra living space.");
    else if (L.basement === 1) s.push("Unfinished basement offers storage and room to grow.");
    if (F.adu) s.push(r.pick(["Separate guest suite / ADU with its own entrance — great for in-laws or rental income.", "Detached casita (ADU) with kitchenette and bath: in-law suite or income potential!"]));
    if (L.type !== "condo") {
      const yard = [];
      if (F.fenced) yard.push("fully fenced backyard");
      if (F.pool) yard.push(city.id === "tampa" ? "screened pool" : "sparkling pool");
      if (F.hotTub) yard.push("hot tub");
      if (F.deck) yard.push(r.pick(["covered patio", "deck", "flagstone patio"]));
      if (F.porch) yard.push(city.id === "tampa" ? "screened lanai" : "screened porch");
      if (F.garden) yard.push("raised garden beds");
      if (yard.length) s.push(`Outside you'll find a ${HH.listJoin(yard)}${L.lotAcres >= 0.4 ? " on a generous " + L.lotAcres.toFixed(2) + "-acre lot" : ""}.`);
      else if (L.lotAcres < 0.1) s.push("Low-maintenance yard means more time for fun.");
    } else {
      const am = [];
      if (F.elevator) am.push("elevator");
      if (F.gym) am.push("fitness center");
      if (F.bldgPool) am.push("pool");
      if (F.rooftop) am.push("rooftop deck");
      if (F.doorman) am.push("24-hour concierge");
      if (am.length) s.push(`Building amenities include ${HH.listJoin(am)}.`);
      if (F.deck) s.push("Private balcony for morning coffee.");
    }
    if (F.workshop) s.push(r.pick(["Detached workshop with power — ideal for hobbies.", "Oversized garage with a workbench and workshop space."]));
    if (F.solar) s.push("Owned solar panels keep utility bills low.");
    if (F.ev) s.push("EV charger already installed in the garage.");
    if (F.rv) s.push("Side gate with RV/boat parking.");
    if (F.fireplace) s.push(r.pick(["Cozy up by the fireplace on cool nights.", "Wood-burning fireplace anchors the living room."]));
    if (F.hardwood) s.push(L.yearBuilt < 1950 ? "Original hardwood floors throughout." : "Hardwood floors in the main living areas.");
    if (F.view) s.push(`Enjoy the ${L.viewLabel.toLowerCase()}!`);
    if (L.extras.length) s.push(`Extras include ${HH.listJoin(L.extras.map(extraText).map((t) => (/^[aeiou]/.test(t) ? "an " : "a ") + t))}.`);
    if (L.loc.nearPark) s.push("Just steps from a neighborhood park.");
    if (L.walk >= 75) s.push("Walk to restaurants, coffee, and shops.");
    if (L.loc.transit && L.walk < 75) s.push("Transit stop around the corner.");
    if (L.loc.busy) s.push(r.pick(["Convenient location on a main road.", "Easy access to major thoroughfares."]));
    if (L.badges.includes("pricecut")) s.push("Motivated seller — just reduced!");
    if (L.closeDays <= 21) s.push("Vacant and ready for a quick close.");
    if (L.issues.asIs) s.push("Sold as-is.");
    return s.join(" ");
  }

  // ---------- public API ----------
  HH.getCity = function (cityId) {
    return HH_WORLD.cities.find((c) => c.id === cityId);
  };

  HH.generateMarket = function (cityId, seed, today) {
    const city = HH.getCity(cityId);
    if (!city) throw new Error("Unknown city " + cityId);
    today = today || Date.UTC(2026, 10, 17);
    const r = HH.rng(seed ^ 0x51ab1e);
    let total = 0;
    for (const h of city.hoods) total += h.homes.length;
    const target = 150;
    const listings = [];
    for (const hood of city.hoods) {
      const p = Math.min(1, (target / total) * (hood.condo ? 1.2 : 1));
      hood.homes.forEach((tuple, idx) => {
        const hr = HH.rng((seed ^ HH.hash(hood.id + ":" + idx)) >>> 0);
        if (hr.next() >= p) return;
        listings.push(genListing(city, hood, tuple, idx, hr, today));
      });
    }
    // stable sort: newest first by default
    listings.sort((a, b) => a.dom - b.dom || (a.id < b.id ? -1 : 1));
    const byId = {};
    listings.forEach((l) => { byId[l.id] = l; });
    let checksum = 0;
    for (const l of listings) checksum = (checksum + l.price + l.beds * 7 + l.sqft * 3 + (l.f.pool ? 11 : 0)) % 1000000007;
    // commute cache helper
    const work = city.work;
    listings.forEach((l) => { l.commute = work.map((w) => HH.driveMinutes(l.lat, l.lng, w.lat, w.lng)); });
    return { city, listings, byId, checksum, seed, today };
  };
})(window.HH);
