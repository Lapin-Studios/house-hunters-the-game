// Procedural floor plans (balanced binary-partition layout).
(function (HH) {
  "use strict";
  HH.art = HH.art || {};

  function layout(rooms, x, y, w, h, out, depth) {
    if (rooms.length === 1) { out.push({ room: rooms[0], x, y, w, h }); return; }
    const total = rooms.reduce((a, b) => a + b.a, 0);
    let acc = 0, split = 1, best = Infinity;
    for (let i = 1; i < rooms.length; i++) {
      acc += rooms[i - 1].a;
      const d = Math.abs(acc - total / 2);
      if (d < best) { best = d; split = i; }
    }
    const A = rooms.slice(0, split), B = rooms.slice(split);
    const fa = A.reduce((a, b) => a + b.a, 0) / total;
    if (w >= h) { layout(A, x, y, w * fa, h, out, depth + 1); layout(B, x + w * fa, y, w * (1 - fa), h, out, depth + 1); }
    else { layout(A, x, y, w, h * fa, out, depth + 1); layout(B, x, y + h * fa, w, h * (1 - fa), out, depth + 1); }
  }

  const ICON = { Living: "🛋️", Kitchen: "🍳", Dining: "🍽️", Bedroom: "🛏️", "Primary Suite": "🛏️", Bath: "🛁", "Half Bath": "🚽", Office: "💻", Garage: "🚗", Laundry: "🧺", "Rec Room": "🎱", Den: "📚", "Guest Suite (ADU)": "🏡", Workshop: "🔧", Storage: "📦", Balcony: "🌿", Flex: "✨", Mudroom: "👢" };
  const FILL = { Living: "#fff4e0", Kitchen: "#e8f6ef", Dining: "#fdf0e6", Bedroom: "#e8eefc", "Primary Suite": "#dde6fb", Bath: "#e3f4f8", "Half Bath": "#e3f4f8", Office: "#f2ebfa", Garage: "#ececec", Laundry: "#eef3f3", "Rec Room": "#fbeef1", Den: "#f4efe6", "Guest Suite (ADU)": "#fff0d6", Workshop: "#efece6", Storage: "#f1f1ef", Balcony: "#e9f5e1", Flex: "#f6f6ee", Mudroom: "#f1ede6" };

  function floorsFor(L) {
    const r = HH.rng(L.art.seed ^ 0xf100);
    const F = L.f;
    const floors = [];
    const beds = L.beds, baths = L.baths;
    const fullBaths = Math.floor(baths), half = baths % 1 ? 1 : 0;
    if (L.type === "condo") {
      const rooms = [{ n: "Living", a: 3 }, { n: "Kitchen", a: 1.6 }];
      if (beds === 0) rooms[0].n = "Living";
      for (let i = 0; i < beds; i++) rooms.push({ n: i === 0 ? "Primary Suite" : "Bedroom", a: i === 0 ? 2.1 : 1.6 });
      for (let i = 0; i < fullBaths; i++) rooms.push({ n: "Bath", a: 0.8 });
      if (half) rooms.push({ n: "Half Bath", a: 0.4 });
      if (F.office) rooms.push({ n: "Den", a: 1 });
      if (F.deck) rooms.push({ n: "Balcony", a: 0.7 });
      if (F.laundry) rooms.push({ n: "Laundry", a: 0.35 });
      floors.push({ name: `Unit ${L.unit || ""}`, sqft: L.sqft, rooms });
      return floors;
    }
    const levels = Math.min(3, L.stories);
    const basementSq = L.basement === 2 ? Math.round(L.sqft * 0.25) : 0;
    const perFloor = (L.sqft - basementSq) / levels;
    const main = [{ n: "Living", a: 3 }, { n: "Kitchen", a: 1.8 }, { n: "Dining", a: 1.3 }];
    let bedsLeft = beds, fullLeft = fullBaths;
    const upper = [];
    if (levels === 1) {
      for (let i = 0; i < beds; i++) main.push({ n: i === 0 ? "Primary Suite" : "Bedroom", a: i === 0 ? 2.2 : 1.5 });
      for (let i = 0; i < fullBaths; i++) main.push({ n: "Bath", a: 0.75 });
      bedsLeft = 0; fullLeft = 0;
    } else {
      if (F.primaryMain) { main.push({ n: "Primary Suite", a: 2.2 }, { n: "Bath", a: 0.8 }); bedsLeft--; fullLeft--; }
      for (let i = 0; i < bedsLeft; i++) upper.push({ n: i === 0 && !F.primaryMain ? "Primary Suite" : "Bedroom", a: i === 0 && !F.primaryMain ? 2.2 : 1.5 });
      for (let i = 0; i < Math.max(0, fullLeft); i++) upper.push({ n: "Bath", a: 0.75 });
      if (upper.length < 2) upper.push({ n: "Flex", a: 1.2 });
    }
    if (half) main.push({ n: "Half Bath", a: 0.4 });
    if (F.office) main.push({ n: "Office", a: 1.1 });
    if (F.laundry) main.push({ n: "Laundry", a: 0.45 });
    if (L.extras.indexOf("mudroom") >= 0) main.push({ n: "Mudroom", a: 0.4 });
    if (L.garage && /Attached/.test(L.garageType)) main.push({ n: "Garage", a: 1.4 * Math.min(3, L.garage) });
    floors.push({ name: levels > 1 ? "Main level" : "Floor plan", sqft: Math.round(perFloor), rooms: main });
    if (levels > 1) {
      if (levels === 3) {
        const half2 = Math.ceil(upper.length / 2);
        floors.push({ name: "Second floor", sqft: Math.round(perFloor), rooms: upper.slice(0, half2) });
        floors.push({ name: "Third floor", sqft: Math.round(perFloor), rooms: upper.slice(half2).length ? upper.slice(half2) : [{ n: "Flex", a: 1 }] });
      } else floors.push({ name: "Upper level", sqft: Math.round(perFloor), rooms: upper });
    }
    if (L.basement === 2) floors.push({ name: "Finished basement", sqft: basementSq, rooms: [{ n: "Rec Room", a: 3 }, { n: "Storage", a: 0.8 }, r.chance(0.5) ? { n: "Bath", a: 0.6 } : { n: "Flex", a: 1 }] });
    else if (L.basement === 1) floors.push({ name: "Basement (unfinished)", sqft: 0, rooms: [{ n: "Storage", a: 3 }, { n: "Laundry", a: 0.6 }] });
    if (F.adu) floors.push({ name: "Guest suite / ADU", sqft: r.int(380, 650), rooms: [{ n: "Guest Suite (ADU)", a: 2.4 }, { n: "Bath", a: 0.7 }, { n: "Kitchen", a: 0.9 }] });
    if (F.workshop) floors.push({ name: "Workshop", sqft: r.int(200, 450), rooms: [{ n: "Workshop", a: 1 }] });
    // jitter for variety
    floors.forEach((f) => f.rooms.forEach((rm) => (rm.a *= r.range(0.85, 1.18))));
    return floors;
  }

  HH.art.floorplan = function (L) {
    const floors = floorsFor(L);
    let html = `<div class="floorplans">`;
    floors.forEach((f) => {
      const W = 360, H = f.rooms.length <= 2 ? 120 : 220;
      const rooms = f.rooms.slice().sort((a, b) => b.a - a.a);
      const out = [];
      layout(rooms, 4, 4, W - 8, H - 8, out, 0);
      const ftPerPx = f.sqft ? Math.sqrt(f.sqft / ((W - 8) * (H - 8))) : 0;
      let svg = `<svg viewBox="0 0 ${W} ${H}" class="fp-svg" role="img" aria-label="${HH.esc(f.name)} floor plan">`;
      svg += `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" fill="#fff" stroke="#3b3b3b" stroke-width="4"/>`;
      out.forEach((o) => {
        const n = o.room.n;
        svg += `<rect x="${o.x.toFixed(1)}" y="${o.y.toFixed(1)}" width="${o.w.toFixed(1)}" height="${o.h.toFixed(1)}" fill="${FILL[n] || "#f7f7f7"}" stroke="#3b3b3b" stroke-width="2"/>`;
        // door gap
        svg += `<line x1="${(o.x + o.w * 0.3).toFixed(1)}" y1="${o.y.toFixed(1)}" x2="${(o.x + o.w * 0.3 + Math.min(14, o.w * 0.3)).toFixed(1)}" y2="${o.y.toFixed(1)}" stroke="${FILL[n] || "#f7f7f7"}" stroke-width="3"/>`;
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        const small = o.w < 52 || o.h < 34;
        svg += `<text x="${cx.toFixed(1)}" y="${(cy - (small ? 0 : 5)).toFixed(1)}" text-anchor="middle" font-size="${small ? 12 : 15}" dominant-baseline="middle">${ICON[n] || ""}</text>`;
        if (!small) {
          svg += `<text x="${cx.toFixed(1)}" y="${(cy + 12).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="600" fill="#333" font-family="Inter, Arial, sans-serif">${n}</text>`;
          if (ftPerPx) svg += `<text x="${cx.toFixed(1)}" y="${(cy + 23).toFixed(1)}" text-anchor="middle" font-size="8" fill="#777" font-family="Inter, Arial, sans-serif">${Math.round(o.w * ftPerPx)}' × ${Math.round(o.h * ftPerPx)}'</text>`;
        }
      });
      svg += `</svg>`;
      html += `<figure class="fp"><figcaption>${HH.esc(f.name)}${f.sqft ? ` · ~${HH.num(f.sqft)} sq ft` : ""}</figcaption>${svg}</figure>`;
    });
    html += `<p class="fp-note">Floor plans are illustrative and not to scale.</p></div>`;
    return html;
  };
})(window.HH);
