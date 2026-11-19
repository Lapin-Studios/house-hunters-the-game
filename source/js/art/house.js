// Procedural SVG "listing photo" for a home, built from its attributes.
(function (HH) {
  "use strict";
  HH.art = HH.art || {};
  let uid = 0;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt < 0) { r = Math.round(r * (1 + amt)); g = Math.round(g * (1 + amt)); b = Math.round(b * (1 + amt)); }
    else { r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt); }
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  HH.shade = shade;

  function tree(kind, x, y, s, r) {
    const k = kind;
    if (k === "palm") {
      const h = 70 * s;
      let out = `<path d="M${x} ${y} q ${4 * s} ${-h / 2} ${-2 * s} ${-h}" stroke="#8b6b4a" stroke-width="${5 * s}" fill="none" stroke-linecap="round"/>`;
      const tx = x - 2 * s, ty = y - h;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const ex = tx + Math.cos(a) * 26 * s, ey = ty + Math.sin(a) * 12 * s + 8 * s;
        out += `<path d="M${tx} ${ty} Q ${(tx + ex) / 2} ${ty - 10 * s} ${ex} ${ey}" stroke="#3f8f4f" stroke-width="${5 * s}" fill="none" stroke-linecap="round"/>`;
      }
      return out;
    }
    if (k === "desert") {
      if (r.chance(0.5)) {
        return `<g fill="#5f8f4e"><rect x="${x - 5 * s}" y="${y - 44 * s}" width="${10 * s}" height="${44 * s}" rx="${5 * s}"/><rect x="${x - 17 * s}" y="${y - 30 * s}" width="${7 * s}" height="${16 * s}" rx="${3.5 * s}"/><rect x="${x - 17 * s}" y="${y - 17 * s}" width="${14 * s}" height="${6 * s}" rx="3"/><rect x="${x + 9 * s}" y="${y - 36 * s}" width="${7 * s}" height="${18 * s}" rx="${3.5 * s}"/><rect x="${x + 3 * s}" y="${y - 22 * s}" width="${13 * s}" height="${6 * s}" rx="3"/></g>`;
      }
      return `<g><rect x="${x - 2 * s}" y="${y - 38 * s}" width="${4 * s}" height="${38 * s}" fill="#7a6248"/><ellipse cx="${x}" cy="${y - 44 * s}" rx="${22 * s}" ry="${12 * s}" fill="#9aaf6a"/><ellipse cx="${x + 6 * s}" cy="${y - 50 * s}" rx="${13 * s}" ry="${8 * s}" fill="#b0c47e"/></g>`;
    }
    if (k === "evergreen") {
      return `<g><rect x="${x - 3 * s}" y="${y - 14 * s}" width="${6 * s}" height="${14 * s}" fill="#6b4f36"/><polygon points="${x},${y - 92 * s} ${x - 22 * s},${y - 12 * s} ${x + 22 * s},${y - 12 * s}" fill="#2f6b45"/><polygon points="${x},${y - 92 * s} ${x - 14 * s},${y - 45 * s} ${x + 6 * s},${y - 45 * s}" fill="#3c8256"/></g>`;
    }
    const leaf = k === "oak" ? "#557a3a" : r.pick(["#5b9a4a", "#6aa84f", "#4f8a3f", "#7aa95c"]);
    return `<g><rect x="${x - 3.5 * s}" y="${y - 30 * s}" width="${7 * s}" height="${30 * s}" fill="#6b4f36"/><circle cx="${x}" cy="${y - 48 * s}" r="${24 * s}" fill="${leaf}"/><circle cx="${x - 14 * s}" cy="${y - 38 * s}" r="${15 * s}" fill="${shade(leaf, -0.12)}"/><circle cx="${x + 13 * s}" cy="${y - 40 * s}" r="${16 * s}" fill="${shade(leaf, 0.1)}"/></g>`;
  }

  function windowSvg(x, y, w, h, trim, opts) {
    opts = opts || {};
    let s = `<rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" fill="${trim}" rx="1"/>`;
    if (opts.boarded) {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#8a6a45"/><line x1="${x}" y1="${y + 3}" x2="${x + w}" y2="${y + h - 3}" stroke="#6b4f30" stroke-width="3"/><line x1="${x + w}" y1="${y + 3}" x2="${x}" y2="${y + h - 3}" stroke="#6b4f30" stroke-width="3"/>`;
      return s;
    }
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glass${opts.gid})"/>`;
    if (!opts.modern) s += `<line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${trim}" stroke-width="1.6"/><line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${trim}" stroke-width="1.6"/>`;
    if (opts.lit) s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffd77a" opacity=".55"/>`;
    if (opts.shutters) s += `<rect x="${x - 9}" y="${y - 2}" width="6" height="${h + 4}" fill="${opts.shutters}"/><rect x="${x + w + 3}" y="${y - 2}" width="6" height="${h + 4}" fill="${opts.shutters}"/>`;
    return s;
  }

  HH.art.house = function (L, opts) {
    opts = opts || {};
    const A = L.art;
    const r = HH.rng(A.seed);
    const id = "h" + (++uid);
    const [body, roofC, trim, door] = A.palette;
    const W = 400, H = 250, G = 206;
    const climate = A.trees;
    const desert = climate === "desert";
    const seattle = L.cityId === "seattle";
    const sky = opts.night ? ["#22325a", "#5a5f8f"] : seattle && r.chance(0.5) ? ["#b9c6d2", "#e3e8ec"] : r.chance(0.2) ? ["#f6b98a", "#fde7c8"] : ["#8ec9f0", "#e1f2fb"];
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="house-svg" role="img" aria-label="Illustration of ${HH.esc(L.address)}">`;
    s += `<defs><linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>`;
    s += `<linearGradient id="glass${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe8f7"/><stop offset=".55" stop-color="#8fb7d3"/><stop offset="1" stop-color="#5f88a6"/></linearGradient>`;
    s += `<pattern id="brick${id}" width="16" height="8" patternUnits="userSpaceOnUse"><rect width="16" height="8" fill="${body}"/><path d="M0 0H16M0 4H16M4 0V4M12 4V8" stroke="${shade(body, -0.25)}" stroke-width=".8"/></pattern>`;
    s += `<pattern id="siding${id}" width="10" height="7" patternUnits="userSpaceOnUse"><rect width="10" height="7" fill="${body}"/><path d="M0 6.5H10" stroke="${shade(body, -0.12)}" stroke-width=".9"/></pattern>`;
    s += `<pattern id="batten${id}" width="9" height="10" patternUnits="userSpaceOnUse"><rect width="9" height="10" fill="${body}"/><path d="M8.5 0V10" stroke="${shade(body, -0.1)}" stroke-width="1.2"/></pattern>`;
    s += `<pattern id="shingle${id}" width="12" height="7" patternUnits="userSpaceOnUse"><rect width="12" height="7" fill="${roofC}"/><path d="M0 6.5H12M6 0V3.5" stroke="${shade(roofC, -0.2)}" stroke-width=".8"/></pattern>`;
    s += `</defs>`;
    if (!opts.noSky) s += `<rect width="${W}" height="${H}" fill="url(#sky${id})"/>`;
    // clouds
    for (let i = 0; i < (opts.noSky ? 0 : 2); i++) {
      const cx = r.int(30, 370), cy = r.int(18, 55);
      s += `<g fill="#fff" opacity=".8"><ellipse cx="${cx}" cy="${cy}" rx="${r.int(20, 32)}" ry="9"/><ellipse cx="${cx + 14}" cy="${cy - 6}" rx="14" ry="9"/></g>`;
    }
    // far hills
    if (opts.noSky) { /* title street: shared sky */ }
    else if (desert) s += `<path d="M0 ${G - 40} L60 ${G - 85} L110 ${G - 55} L170 ${G - 100} L240 ${G - 50} L300 ${G - 80} L400 ${G - 45} V${G} H0Z" fill="#c9a98a" opacity=".55"/>`;
    else if (seattle) s += `<path d="M260 ${G - 30} L320 ${G - 110} L380 ${G - 30}Z" fill="#dfe6ee" opacity=".8"/><path d="M300 ${G - 80} L320 ${G - 110} L338 ${G - 82}Z" fill="#fff"/>`;
    if (!opts.noSky) s += `<path d="M0 ${G - 30} Q 100 ${G - 52} 200 ${G - 34} T 400 ${G - 30} V${G} H0Z" fill="${desert ? "#d8bc95" : "#9cc28a"}" opacity=".7"/>`;
    // ground
    const grass = desert ? "#d9c19b" : L.condition === 0 ? "#a3a35c" : L.condition === 1 ? "#8fae5a" : "#7dbb5b";
    s += `<rect x="0" y="${G}" width="${W}" height="${H - G}" fill="${grass}"/>`;
    s += `<rect x="0" y="${H - 14}" width="${W}" height="14" fill="#b8b8b0"/><rect x="0" y="${H - 15}" width="${W}" height="2" fill="#d9d9d2"/>`;

    if (L.type === "condo") return s + condo(L, A, r, id, body, roofC, trim, door, G, W, H) + sign(L, 330, G + 30) + "</svg>";
    if (L.type === "townhome") return s + townhome(L, A, r, id, A.palette, G) + sign(L, 70, G + 28) + "</svg>";

    // ---------- single-family ----------
    const stories = Math.min(3, A.stories);
    const floorH = 44;
    const bw = Math.round(HH.clamp(150 * A.wide, 112, 210));
    const gW = A.garage && !A.garageDetached ? Math.min(3, A.garage) * 40 + 14 : 0;
    const totalW = bw + gW;
    const x0 = Math.round(200 - totalW / 2);
    const bh = stories * floorH + 8;
    const y0 = G - bh;
    const fill = A.style === "Brick Cottage" || A.style === "Italianate" || (A.palette === HH.PALETTES.Brick[0]) ? `url(#brick${id})` : /Farmhouse/.test(A.style) ? `url(#batten${id})` : /Spanish|Southwest|Mediterranean|Modern|Contemporary/.test(A.style) ? body : `url(#siding${id})`;
    const tileRoof = /Spanish|Mediterranean|Southwest/.test(A.style);

    // back trees
    const nt = r.int(1, 3);
    for (let i = 0; i < nt; i++) s += tree(climate, r.chance(0.5) ? r.int(20, x0 - 10) : r.int(x0 + totalW + 10, 385), G + 2, r.range(0.8, 1.15), r);

    // driveway
    if (A.garage) {
      const gx = A.garageDetached ? x0 + totalW + 18 : x0 + bw + 6;
      s += `<path d="M${gx} ${G} L${gx + (A.garageDetached ? 46 : gW - 12)} ${G} L${gx + (A.garageDetached ? 70 : gW + 14)} ${H - 14} L${gx - 20} ${H - 14}Z" fill="#c9c6bf"/>`;
    }
    // walkway
    s += `<path d="M${x0 + bw / 2 - 7} ${G} h14 l6 ${H - 14 - G} h-26z" fill="#d8d2c4"/>`;

    // fence (sides)
    if (A.fence) {
      const fc = r.chance(0.5) ? "#f4f1ea" : "#b08a5f";
      const fy = G - 20;
      const drawFence = (fx1, fx2) => {
        let f = `<rect x="${fx1}" y="${fy + 6}" width="${fx2 - fx1}" height="3" fill="${shade(fc, -0.15)}"/><rect x="${fx1}" y="${fy + 14}" width="${fx2 - fx1}" height="3" fill="${shade(fc, -0.15)}"/>`;
        for (let fx = fx1; fx < fx2; fx += 7) f += `<path d="M${fx} ${G} V${fy + 3} l2.5 -3 l2.5 3 V${G}Z" fill="${fc}"/>`;
        return f;
      };
      if (x0 > 30) s += drawFence(4, x0 - 4);
      const right = A.garageDetached ? x0 + totalW + 80 : x0 + totalW + 4;
      if (right < 380) s += drawFence(right, 396);
    }
    // pool peek
    if (A.pool) {
      const px = x0 > 90 ? 18 : 318;
      s += `<g><rect x="${px}" y="${G - 4}" width="60" height="10" rx="3" fill="#4fc3f7" stroke="#e0f2f1" stroke-width="2"/><path d="M${px + 46} ${G - 4} v-26" stroke="#555" stroke-width="2"/><path d="M${px + 30} ${G - 30} q16 -14 32 0z" fill="#ff7043"/><path d="M${px + 30} ${G - 30} q16 -6 32 0" fill="#ffab91"/></g>`;
    }

    // detached garage
    if (A.garage && A.garageDetached) {
      const gx = x0 + totalW + 16, gw = 54 + (A.garage > 1 ? 20 : 0);
      s += `<rect x="${gx}" y="${G - 40}" width="${gw}" height="40" fill="${shade(body, -0.05)}"/><polygon points="${gx - 5},${G - 40} ${gx + gw / 2},${G - 62} ${gx + gw + 5},${G - 40}" fill="${roofC}"/>`;
      s += garageDoor(gx + 7, G - 31, gw - 14, 31, trim);
    }

    // main body
    s += `<rect x="${x0}" y="${y0}" width="${bw}" height="${bh}" fill="${fill}"/>`;
    s += `<rect x="${x0}" y="${y0}" width="${bw}" height="${bh}" fill="none" stroke="${shade(body, -0.3)}" stroke-width="1"/>`;
    if (A.style === "Tudor" && stories > 1) {
      // half timbering on upper floor
      const uy = y0, uh = floorH;
      s += `<rect x="${x0}" y="${uy}" width="${bw}" height="${uh}" fill="${trim === "#4a3226" || trim === "#3b2a20" ? "#efe5d0" : body}"/>`;
      for (let tx = x0 + 12; tx < x0 + bw; tx += 22) s += `<path d="M${tx} ${uy} V${uy + uh} M${tx} ${uy + uh} L${tx + 11} ${uy}" stroke="${trim}" stroke-width="3"/>`;
      s += `<rect x="${x0}" y="${uy + uh - 3}" width="${bw}" height="4" fill="${trim}"/>`;
    }
    // attached garage block
    if (gW) {
      const gx = x0 + bw, gy = G - floorH - 4;
      s += `<rect x="${gx}" y="${gy}" width="${gW}" height="${floorH + 4}" fill="${fill}" stroke="${shade(body, -0.3)}"/>`;
      if (A.roof === "flat" || A.roof === "shed") s += `<rect x="${gx - 2}" y="${gy - 6}" width="${gW + 4}" height="7" fill="${shade(roofC, 0)}"/>`;
      else s += `<polygon points="${gx - 4},${gy} ${gx + 8},${gy - 18} ${gx + gW},${gy - 18} ${gx + gW + 6},${gy}" fill="${tileRoof ? roofC : `url(#shingle${id})`}"/>`;
      const n = Math.min(3, A.garage);
      if (n >= 2 && r.chance(0.6)) s += garageDoor(gx + 8, G - 34, gW - 16, 34, trim);
      else for (let i = 0; i < n; i++) s += garageDoor(gx + 8 + i * 40, G - 34, 32, 34, trim);
    }

    // roof
    const ov = 10;
    let roofTop = y0;
    const rf = tileRoof ? roofC : `url(#shingle${id})`;
    if (A.roof === "flat") {
      s += `<rect x="${x0 - 4}" y="${y0 - 8}" width="${bw + 8}" height="9" fill="${shade(roofC, -0.05)}"/>`;
      roofTop = y0 - 8;
    } else if (A.roof === "shed") {
      const rh = 26;
      s += `<polygon points="${x0 - ov},${y0 + 2} ${x0 - ov},${y0 - 6} ${x0 + bw + ov},${y0 - rh} ${x0 + bw + ov},${y0 - rh + 8}" fill="${shade(roofC, -0.05)}"/>`;
      s += `<polygon points="${x0},${y0} ${x0 + bw},${y0 - rh + 8} ${x0 + bw},${y0}" fill="${fill}"/>`;
      roofTop = y0 - rh;
    } else {
      const steep = A.roof === "steep" ? 0.55 : A.roof === "gable" ? 0.36 : A.roof === "hip" ? 0.26 : 0.17;
      const rh = Math.round(bw * steep * (A.roof === "lowhip" ? 1 : 0.85));
      if (A.roof === "hip" || A.roof === "lowhip") {
        const inset = A.roof === "lowhip" ? bw * 0.22 : bw * 0.3;
        s += `<polygon points="${x0 - ov},${y0 + 2} ${x0 + inset},${y0 - rh} ${x0 + bw - inset},${y0 - rh} ${x0 + bw + ov},${y0 + 2}" fill="${rf}"/>`;
      } else {
        s += `<polygon points="${x0 - ov},${y0 + 2} ${x0 + bw / 2},${y0 - rh} ${x0 + bw + ov},${y0 + 2}" fill="${rf}"/>`;
        s += `<polyline points="${x0 - ov},${y0 + 2} ${x0 + bw / 2},${y0 - rh} ${x0 + bw + ov},${y0 + 2}" fill="none" stroke="${shade(roofC, -0.3)}" stroke-width="3"/>`;
        // gable window (attic / half story)
        if (rh > 34) s += windowSvg(x0 + bw / 2 - 9, y0 - rh * 0.5, 18, 16, trim, { gid: id });
        if (A.style === "Victorian") s += `<path d="M${x0 + bw / 2 - 30} ${y0 - rh * 0.25} L${x0 + bw / 2} ${y0 - rh + 6} L${x0 + bw / 2 + 30} ${y0 - rh * 0.25}" stroke="${trim}" stroke-width="3" fill="none"/>`;
      }
      if (L.condition === 0) s += `<path d="M${x0 + bw * 0.6} ${y0 - rh * 0.3} l14 4 l-6 8z" fill="${shade(roofC, -0.4)}"/>`;
      roofTop = y0 - rh;
    }
    // chimney
    if (A.chimney && A.roof !== "flat") {
      const cx = x0 + bw * (r.chance(0.5) ? 0.24 : 0.72);
      s += `<rect x="${cx}" y="${roofTop + 4}" width="13" height="${Math.max(18, y0 - roofTop - 2)}" fill="#9c4a3a"/><rect x="${cx - 2}" y="${roofTop + 2}" width="17" height="4" fill="#7a3a2e"/>`;
    }
    // solar
    if (A.solar && A.roof !== "flat") {
      const sx = x0 + bw * 0.55, sy = A.roof === "shed" ? y0 - 18 : y0 - (y0 - roofTop) * 0.55;
      s += `<g><polygon points="${sx},${sy + 16} ${sx + 10},${sy} ${sx + 44},${sy} ${sx + 34},${sy + 16}" fill="#1f3a5f" stroke="#c9d6e3" stroke-width=".8"/><path d="M${sx + 15} ${sy + 16} L${sx + 25} ${sy} M${sx + 5} ${sy + 8} H${sx + 39}" stroke="#c9d6e3" stroke-width=".6"/></g>`;
    } else if (A.solar) {
      s += `<rect x="${x0 + 12}" y="${y0 - 16}" width="40" height="8" fill="#1f3a5f"/>`;
    }

    // windows & door
    const modern = /Modern|Contemporary|Tall/.test(A.style);
    const shut = A.style === "Colonial" || A.style === "Cape Cod" ? shade(door, -0.1) : null;
    for (let f = 0; f < stories; f++) {
      const fy = y0 + 8 + (stories - 1 - f) * floorH + 8;
      const isGround = f === 0;
      const n = Math.max(2, Math.floor(bw / 46));
      const spacing = bw / n;
      for (let i = 0; i < n; i++) {
        const wx = x0 + spacing * i + spacing / 2;
        if (isGround && Math.abs(wx - (x0 + bw / 2)) < spacing / 2) continue; // door slot
        const ww = modern ? 30 : 22, wh = modern ? 28 : 24;
        s += windowSvg(Math.round(wx - ww / 2), fy, ww, wh, trim, { gid: id, modern, shutters: shut, boarded: L.condition === 0 && isGround && i === 0, lit: opts.night && r.chance(0.6) });
      }
    }
    // door
    const dx = x0 + bw / 2 - 11, dy = G - 36;
    s += `<rect x="${dx - 3}" y="${dy - 3}" width="28" height="39" fill="${trim}"/><rect x="${dx}" y="${dy}" width="22" height="36" fill="${door}"/><circle cx="${dx + 17}" cy="${dy + 19}" r="1.6" fill="#e9c46a"/>`;
    if (!modern) s += `<rect x="${dx + 4}" y="${dy + 4}" width="14" height="10" fill="url(#glass${id})" opacity=".8"/>`;
    // porch
    if (A.porch) {
      const px1 = x0 + bw * 0.12, px2 = x0 + bw * 0.88, py = G - floorH + 2;
      s += `<polygon points="${px1 - 6},${py} ${px1 + 4},${py - 10} ${px2 - 4},${py - 10} ${px2 + 6},${py}" fill="${shade(roofC, 0.08)}"/>`;
      s += `<rect x="${px1 - 6}" y="${py}" width="${px2 - px1 + 12}" height="4" fill="${trim}"/>`;
      const cols = A.style === "Craftsman" || A.style === "Bungalow" ? 4 : 3;
      for (let i = 0; i < cols; i++) {
        const cx = px1 + ((px2 - px1) * i) / (cols - 1);
        if (Math.abs(cx - (x0 + bw / 2)) < 16) continue;
        s += A.style === "Craftsman" || A.style === "Bungalow" ? `<path d="M${cx - 3} ${py + 4} h6 l3 ${G - py - 6} h-12z" fill="${trim}"/>` : `<rect x="${cx - 2.5}" y="${py + 4}" width="5" height="${G - py - 4}" fill="${trim}"/>`;
      }
      s += `<rect x="${px1 - 8}" y="${G - 4}" width="${px2 - px1 + 16}" height="5" fill="${shade(trim, -0.15)}"/>`;
    }
    s += `<rect x="${dx - 6}" y="${G}" width="34" height="4" fill="#cfc8b8"/>`;
    // shrubs
    for (let i = 0; i < 4; i++) {
      const sx = x0 + 8 + (i < 2 ? i * 18 : bw - 26 - (i - 2) * 18);
      if (desert) s += `<g fill="#7f9a55"><path d="M${sx} ${G} l-6 -12 l8 6 l2 -14 l3 14 l7 -8 l-4 14z"/></g>`;
      else s += `<ellipse cx="${sx + 6}" cy="${G - 4}" rx="11" ry="8" fill="${r.pick(["#4f8a3f", "#5b9a4a", "#3f7a36"])}"/>`;
    }
    if (L.condition === 0) for (let i = 0; i < 9; i++) { const gx2 = r.int(10, 390); s += `<path d="M${gx2} ${G + 18} l-3 -14 l5 9 l2 -12 l3 13 l4 -8 l-2 12z" fill="#7d8a3a"/>`; }
    // front trees
    s += tree(climate, r.chance(0.5) ? Math.max(24, x0 - 26) : Math.min(380, x0 + totalW + (A.garageDetached ? 92 : 26)), G + 22, r.range(0.95, 1.25), r);
    s += sign(L, Math.max(22, x0 - 6), G + 28);
    s += "</svg>";
    return s;
  };

  function garageDoor(x, y, w, h, trim) {
    let s = `<rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 2}" fill="${trim}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f1efe8"/>`;
    for (let i = 1; i < 4; i++) s += `<line x1="${x}" y1="${y + (h * i) / 4}" x2="${x + w}" y2="${y + (h * i) / 4}" stroke="#cfcac0" stroke-width="1.2"/>`;
    return s;
  }

  function sign(L, x, y) {
    const pending = L.status === "pending";
    return `<g class="for-sale-sign"><rect x="${x - 1.5}" y="${y - 40}" width="3" height="40" fill="#5b4636"/><rect x="${x}" y="${y - 38}" width="30" height="3" fill="#5b4636"/><rect x="${x + 2}" y="${y - 34}" width="27" height="18" rx="2" fill="#fff" stroke="#e85d3f" stroke-width="1.5"/><text x="${x + 15.5}" y="${y - 26.5}" font-size="5.4" font-weight="800" text-anchor="middle" fill="#e85d3f" font-family="Fredoka, Arial, sans-serif">FOR SALE</text><text x="${x + 15.5}" y="${y - 20}" font-size="4.2" text-anchor="middle" fill="#334" font-family="Arial, sans-serif">roofline</text>${pending ? `<rect x="${x + 1}" y="${y - 15}" width="29" height="6" fill="#d62828"/><text x="${x + 15.5}" y="${y - 10.6}" font-size="4.2" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">PENDING</text>` : ""}</g>`;
  }

  function condo(L, A, r, id, body, roofC, trim, door, G, W) {
    const floors = HH.clamp(A.floors || 6, 3, 14);
    const fh = Math.min(15, Math.floor(170 / floors));
    const bw = 170, x0 = 115, y0 = G - floors * fh - 10;
    let s = "";
    // neighbors
    s += `<rect x="20" y="${G - 110}" width="80" height="110" fill="${shade(body, -0.25)}" opacity=".7"/><rect x="300" y="${G - 140}" width="85" height="140" fill="${shade(body, -0.35)}" opacity=".7"/>`;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) s += `<rect x="${30 + j * 24}" y="${G - 100 + i * 16}" width="12" height="8" fill="#cfe1ee" opacity=".6"/>`;
    s += `<rect x="${x0}" y="${y0}" width="${bw}" height="${G - y0}" fill="${body}" stroke="${shade(body, -0.3)}"/>`;
    s += `<rect x="${x0 - 4}" y="${y0 - 6}" width="${bw + 8}" height="7" fill="${trim === "#9fb7c7" ? "#3a3f44" : roofC}"/>`;
    const targetF = HH.clamp(A.unitFloor, 1, floors);
    const cols = 6;
    for (let f = 0; f < floors; f++) {
      const fy = G - 10 - (f + 1) * fh + 2;
      for (let c = 0; c < cols; c++) {
        const wx = x0 + 10 + c * ((bw - 20) / cols);
        const mine = f + 1 === targetF && (c === 2 || c === 3);
        s += `<rect x="${wx}" y="${fy}" width="${(bw - 20) / cols - 6}" height="${fh - 5}" fill="${mine ? "#ffd166" : `url(#glass${id})`}" ${mine ? 'stroke="#ef8a17" stroke-width="1.5"' : ""}/>`;
      }
      if (f % 2 === 1 && fh >= 10) s += `<rect x="${x0 + 6}" y="${fy + fh - 4}" width="${bw - 12}" height="2" fill="${shade(body, -0.3)}"/>`;
    }
    const ty = G - 10 - targetF * fh + fh / 2;
    s += `<g><path d="M${x0 + bw + 6} ${ty} l12 -7 v14z" fill="#ef8a17"/><rect x="${x0 + bw + 18}" y="${ty - 9}" width="58" height="18" rx="4" fill="#ef8a17"/><text x="${x0 + bw + 47}" y="${ty + 4}" font-size="9" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">Unit ${HH.esc(L.unit || "")}</text></g>`;
    // lobby
    s += `<rect x="${x0 + bw / 2 - 22}" y="${G - 24}" width="44" height="24" fill="url(#glass${id})" stroke="${trim}"/><rect x="${x0 + bw / 2 - 30}" y="${G - 28}" width="60" height="5" fill="${door}"/>`;
    s += tree("deciduous", 100, G + 20, 0.7, r) + tree("deciduous", 300, G + 20, 0.75, r);
    return s;
  }

  function townhome(L, A, r, id, pal, G) {
    let s = "";
    const units = 3, uw = 78, x0 = 200 - (units * uw) / 2;
    const h = A.stories * 42 + 8;
    for (let u = 0; u < units; u++) {
      const ux = x0 + u * uw;
      const col = u === 1 ? pal[0] : shade(pal[0], u === 0 ? -0.12 : 0.12);
      s += `<rect x="${ux}" y="${G - h}" width="${uw}" height="${h}" fill="${col}" stroke="${shade(col, -0.3)}"/>`;
      s += `<polygon points="${ux - 3},${G - h} ${ux + uw / 2},${G - h - 28} ${ux + uw + 3},${G - h}" fill="${pal[1]}"/>`;
      for (let f = 0; f < A.stories; f++) {
        const fy = G - h + 10 + f * 42;
        if (f === A.stories - 1) { s += windowSvg(ux + 8, fy + 4, 20, 22, pal[2], { gid: id }); s += `<rect x="${ux + 46}" y="${fy}" width="22" height="38" fill="${pal[3]}" stroke="${pal[2]}" stroke-width="3"/>`; }
        else { s += windowSvg(ux + 10, fy, 22, 22, pal[2], { gid: id }); s += windowSvg(ux + 46, fy, 22, 22, pal[2], { gid: id }); }
      }
      if (u === 1) s += `<rect x="${ux + 2}" y="${G - h - 2}" width="${uw - 4}" height="${h}" fill="none" stroke="#ef8a17" stroke-width="2.5" stroke-dasharray="5 3"/>`;
    }
    s += tree(A.trees, 40, G + 20, 1, r) + tree(A.trees, 360, G + 20, 0.9, r);
    return s;
  }
})(window.HH);
