// "Roofline" — the in-game realtor website on the agent's computer.
(function (HH) {
  "use strict";
  const UI = HH.ui, esc = HH.esc, $ = HH.$;
  const G = () => HH.game;
  const S = (UI.site = {});
  const PAGE = 24;

  const FEATS = [
    ["pool", "Pool", (L) => L.f.pool], ["fenced", "Fenced yard", (L) => L.f.fenced && L.type !== "condo"], ["office", "Home office / den", (L) => L.f.office],
    ["basement", "Basement", (L) => L.basement > 0], ["primaryMain", "Bedroom on main floor", (L) => L.f.primaryMain], ["adu", "In-law suite / ADU", (L) => L.f.adu],
    ["workshop", "Workshop", (L) => L.f.workshop], ["fireplace", "Fireplace", (L) => L.f.fireplace], ["kitchen", "Updated kitchen", (L) => L.f.kitchen],
    ["hardwood", "Hardwood floors", (L) => L.f.hardwood], ["deck", "Deck / patio / balcony", (L) => L.f.deck], ["porch", "Screened porch", (L) => L.f.porch],
    ["ac", "Air conditioning", (L) => L.f.ac], ["solar", "Solar panels", (L) => L.f.solar], ["ev", "EV charger", (L) => L.f.ev],
    ["hotTub", "Hot tub", (L) => L.f.hotTub], ["garden", "Garden beds", (L) => L.f.garden], ["rv", "RV / boat parking", (L) => L.f.rv],
    ["view", "View", (L) => L.f.view], ["waterfront", "Waterfront", (L) => L.f.waterfront], ["nearWater", "Near water (≤400 m)", (L) => L.loc.waterM < 400],
    ["nearPark", "Near a park (≤250 m)", (L) => L.loc.nearPark], ["transit", "Near transit", (L) => L.loc.transit], ["golf", "Golf course lot", (L) => L.f.golf],
    ["gym", "Gym (home or building)", (L) => !!L.f.gym || L.extras.indexOf("gym") >= 0], ["elevator", "Elevator building", (L) => !!L.f.elevator],
    ["bigDog", "Big dogs allowed", (L) => L.bigDogOK], ["pets", "Pets allowed", (L) => L.pets !== "No pets"], ["rentals", "Rentals allowed", (L) => !L.noRentals],
    ["quick", "Can close in ≤30 days", (L) => L.closeDays <= 30],
  ];
  const EXCL = [
    ["pending", "Pending sales", (L) => L.status !== "active"], ["busy", "Busy streets", (L) => L.loc.busy], ["highway", "Near a highway", (L) => L.loc.highway],
    ["rail", "Near railroad tracks", (L) => L.loc.rail], ["flood", "Flood zones", (L) => L.flood], ["fixer", "Fixer-uppers & “needs TLC”", (L) => L.condition <= 1],
    ["issues", "Major repair disclosures", (L) => L.issues.major || L.issues.asIs], ["carpet", "Carpet", (L) => L.f.carpet], ["poolEx", "Pools", (L) => L.f.pool],
    ["hoa", "HOA", (L) => L.hoa > 0], ["multi", "Multi-story homes", (L) => L.stories > 1],
  ];
  const FEAT = Object.fromEntries(FEATS.map((f) => [f[0], f]));
  const EX = Object.fromEntries(EXCL.map((f) => [f[0], f]));
  const SORTS = [["newest", "Newest"], ["priceAsc", "Price (low to high)"], ["priceDesc", "Price (high to low)"], ["sqft", "Square feet"], ["ppsf", "Price per sq ft"], ["beds", "Bedrooms"], ["lot", "Lot size"], ["walk", "Walk Score"], ["school", "School rating"], ["commute", "Commute time"], ["monthly", "Monthly cost"]];

  const blankFilters = () => ({ q: "", hoods: [], priceMin: 0, priceMax: 0, beds: 0, baths: 0, types: [], sqftMin: 0, sqftMax: 0, lotMin: 0, yearMin: 0, yearMax: 0, hoaMax: -1, garage: 0, commuteIdx: -1, commuteMax: 0, schoolMin: 0, monthlyMax: 0, walkMin: 0, condMin: 0, feats: [], excl: [], savedOnly: false, fitsOnly: false });

  // ---------- how well a listing fits what the agent KNOWS about the client ----------
  // Hidden wants the agent hasn't uncovered are never used here.
  const fitCache = new Map();
  let fitKey = "";
  const showFit = () => G().client && G().client.diff !== "hard";
  function friendly(x) {
    const l = x.label;
    if (/^Budget/.test(l)) return "Over budget";
    if (l === "In a preferred neighborhood") return "Not in their neighborhoods";
    if (/^Commute/.test(l)) return "Commute too long";
    if (/^Property type/.test(l)) return "Wrong home type";
    if (/bedrooms$/.test(l)) return "Not enough bedrooms";
    if (/baths$/.test(l)) return "Not enough baths";
    return `Fails “${l}”`;
  }
  function fitInfo(L) {
    const g = G(), c = g.client;
    const key = (g.round ? g.round.seed : "") + "|" + c.name + "|" + Object.keys(g.revealed).filter((k) => g.revealed[k]).sort().join(",");
    if (key !== fitKey) { fitKey = key; fitCache.clear(); }
    let f = fitCache.get(L.id);
    if (f) return f;
    const ev = HH.evaluate(c, L);
    const known = ev.checks.filter((x) => !x.hidden || g.revealed[x.topic]);
    const rows = [], fails = [], partial = [];
    if (L.status !== "active") { fails.push("Already under contract"); rows.push({ label: "Available (not already pending)", ok: false }); }
    known.filter((x) => x.kind !== "nice").forEach((x) => {
      const ok = x.ok === "partial" && !g.revealed.budget ? false : x.ok;
      rows.push({ label: x.label, ok, note: ok === "partial" ? x.note : "" });
      if (ok === false) fails.push(friendly(x)); else if (ok === "partial") partial.push(x.label);
    });
    const nice = known.filter((x) => x.kind === "nice");
    f = { ok: !fails.length, fails, partial, rows, nice, niceOk: nice.filter((x) => x.ok).length };
    fitCache.set(L.id, f);
    return f;
  }
  S.fitInfo = fitInfo;
  function fitBadge(L) {
    if (!showFit()) return "";
    const f = fitInfo(L);
    const niceTxt = f.nice.length ? `<span class="fit-nice" title="Nice-to-haves this home has">💚 ${f.niceOk}/${f.nice.length}</span>` : "";
    if (f.fails.length) return `<div class="fit no" title="${esc(f.fails.join(" · "))}">✗ ${esc(f.fails[0])}${f.fails.length > 1 ? ` <span style="font-weight:600">+${f.fails.length - 1} more</span>` : ""}</div>`;
    if (f.partial.length) return `<div class="fit meh">🟡 Over budget, but within their stretch${niceTxt}</div>`;
    return `<div class="fit ok">✓ Fits the brief${niceTxt}</div>`;
  }

  let F = blankFilters(), sort = "newest", page = 0, view = "grid", hist = [], histI = -1, detailId = null, map = null, markerLayer = null;
  const artCache = new Map();
  S.art = function (L) { if (!artCache.has(L.id)) artCache.set(L.id, HH.art.house(L)); return artCache.get(L.id); };

  function matches(L, f, skip) {
    if (f.q) { const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean); for (const t of terms) if (L.searchText.indexOf(t) < 0) return false; }
    if (f.savedOnly && !G().saved.has(L.id)) return false;
    if (f.fitsOnly && showFit() && !fitInfo(L).ok) return false;
    if (skip !== "hoods" && f.hoods.length && f.hoods.indexOf(L.hoodId) < 0) return false;
    if (f.priceMin && L.price < f.priceMin) return false;
    if (f.priceMax && L.price > f.priceMax) return false;
    if (f.beds && L.beds < f.beds) return false;
    if (f.baths && L.baths < f.baths) return false;
    if (skip !== "types" && f.types.length && f.types.indexOf(L.type) < 0) return false;
    if (f.sqftMin && L.sqft < f.sqftMin) return false;
    if (f.sqftMax && L.sqft > f.sqftMax) return false;
    if (f.lotMin && L.lotAcres < f.lotMin) return false;
    if (f.yearMin && L.yearBuilt < f.yearMin) return false;
    if (f.yearMax && L.yearBuilt > f.yearMax) return false;
    if (f.hoaMax >= 0 && L.hoa > f.hoaMax) return false;
    if (f.garage && (L.garage < f.garage || L.carport)) return false;
    if (f.commuteIdx >= 0 && f.commuteMax && L.commute[f.commuteIdx] > f.commuteMax) return false;
    if (f.schoolMin && L.schoolRating < f.schoolMin) return false;
    if (f.monthlyMax && L.monthly > f.monthlyMax) return false;
    if (f.walkMin && L.walk < f.walkMin) return false;
    if (f.condMin && L.condition < f.condMin) return false;
    for (const k of f.feats) if (skip !== "f:" + k && FEAT[k] && !FEAT[k][2](L)) return false;
    for (const k of f.excl) if (skip !== "x:" + k && EX[k] && EX[k][2](L)) return false;
    return true;
  }
  function sorted(list) {
    const k = sort, ci = F.commuteIdx >= 0 ? F.commuteIdx : 0;
    const by = {
      newest: (a, b) => a.dom - b.dom, priceAsc: (a, b) => a.price - b.price, priceDesc: (a, b) => b.price - a.price, sqft: (a, b) => b.sqft - a.sqft,
      ppsf: (a, b) => a.ppsf - b.ppsf, beds: (a, b) => b.beds - a.beds || a.price - b.price, lot: (a, b) => b.lotAcres - a.lotAcres, walk: (a, b) => b.walk - a.walk,
      school: (a, b) => b.schoolRating - a.schoolRating, commute: (a, b) => a.commute[ci] - b.commute[ci], monthly: (a, b) => a.monthly - b.monthly,
    }[k];
    return list.slice().sort((a, b) => by(a, b) || (a.id < b.id ? -1 : 1));
  }
  const results = () => sorted(G().market.listings.filter((L) => matches(L, F)));

  // ---------- open ----------
  S.open = function () {
    if (UI.meeting && UI.meeting.stop) UI.meeting.stop();
    F = blankFilters(); sort = "newest"; page = 0; view = "grid"; hist = [{ type: "search" }]; histI = 0; detailId = null;
    if (map) { try { map.remove(); } catch (e) { /* ignore */ } map = null; }
    artCache.clear();
    const g = G();
    const el = $("#screen-computer");
    el.innerHTML = `${UI.hud({ step: "search" })}
      <div class="desktop">
        <div class="browser">
          <div class="browser-bar"><div class="dots"><i></i><i></i><i></i></div>
            <button class="nav" data-back title="Back">◀</button><button class="nav" data-fwd title="Forward">▶</button><button class="nav" data-home title="Home">⟳</button>
            <div class="url" data-url></div>
            <button class="nav" data-meeting title="Back to the meeting notes">🗒️</button></div>
          <div class="site">
            <div class="site-head">
              <div class="brand" data-home><span style="display:inline-flex;background:#e85d3f;border-radius:9px;padding:3px">${UI.LOGO_SVG.replace('width="54" height="54"', 'width="28" height="28"')}</span><div>roofline<br><small>Homes for sale · ${esc(g.market.city.name)}, ${g.market.city.state}</small></div></div>
              <form class="site-search" data-search><input class="input" data-q placeholder="Search keywords: &quot;pantry&quot;, &quot;workshop&quot;, a street name…" autocomplete="off"><button class="btn btn-primary">🔍</button></form>
              <div class="site-nav"><button class="only-narrow" data-filters-toggle>⚙️ Filters</button><button data-saved>♡ Saved <span data-saved-n>(0)</span></button><button data-calc>🧮 Mortgage</button><button data-guide>🗺️ Neighborhoods</button></div>
            </div>
            <div class="site-main"><aside class="filters" data-filters></aside><div class="results" data-results></div></div>
          </div>
        </div>
        <div class="side-col"><div class="brief-wrap" data-brief="site"></div><div class="shortlist" data-shortlist></div></div>
      </div>`;
    UI.show("computer");
    UI.bindHud(el);
    UI.renderBrief();
    bindChrome(el);
    el.querySelector("[data-results]").addEventListener("click", onCardClick);
    renderFilters();
    renderResults();
    renderShortlist();
    updateUrl();
    if (g.submitted || g.ready) showWaiting();
    UI.coach("site-welcome", ".browser .site-head", "Welcome to <b>Roofline</b>, the listings website. Your job: find up to <b>3 homes</b> your client will love.", { delay: 600, side: "below" });
    UI.coach("site-brief", ".side-col [data-brief] .brief", "Your client's brief stays right here while you search.", { side: "left" });
    UI.coach("site-filters", "[data-filters]", "Use the <b>filters</b> to narrow down the listings. Start with their budget, neighborhoods and bedrooms.", { side: "right" });
    if (showFit()) {
      UI.coach("site-fit", ".cards .card .fit", "Every listing shows if it <b>fits the brief</b>: green means it checks every box you know about. 💚 counts their nice-to-haves.");
      UI.coach("site-toggle", ".fits-toggle", "Shortcut: tick this to <b>hide every home that breaks the brief</b>.", { side: "below" });
    }
    UI.coach("site-open", ".cards .card", "<b>Click a home</b> to open it: real Street View, seller disclosures, floor plan and more. The ⭐ adds it to your picks.", { side: "right" });
  };

  function bindChrome(el) {
    el.querySelector("[data-back]").addEventListener("click", () => go(-1));
    el.querySelector("[data-fwd]").addEventListener("click", () => go(1));
    HH.$$("[data-home]", el).forEach((b) => b.addEventListener("click", () => { closeDetail(true); F.savedOnly = false; renderFilters(); renderResults(); }));
    el.querySelector("[data-meeting]").addEventListener("click", () => notesModal());
    const q = el.querySelector("[data-q]");
    let deb;
    q.addEventListener("input", () => { clearTimeout(deb); deb = setTimeout(() => { F.q = q.value.trim(); page = 0; renderResults(); renderFilters(); }, 250); });
    el.querySelector("[data-search]").addEventListener("submit", (e) => { e.preventDefault(); F.q = q.value.trim(); page = 0; closeDetail(true); renderResults(); renderFilters(); });
    el.querySelector("[data-saved]").addEventListener("click", () => { F.savedOnly = !F.savedOnly; page = 0; closeDetail(true); renderResults(); renderNav(); });
    el.querySelector("[data-calc]").addEventListener("click", () => calculator());
    el.querySelector("[data-guide]").addEventListener("click", () => guide());
    el.querySelector("[data-filters-toggle]").addEventListener("click", () => el.querySelector("[data-filters]").classList.toggle("open"));
  }
  function renderNav() {
    const n = G().saved.size;
    HH.$$("[data-saved-n]").forEach((x) => (x.textContent = `(${n})`));
    const b = $("[data-saved]");
    if (b) b.classList.toggle("on", F.savedOnly);
  }

  // ---------- history ----------
  function push(entry) { hist = hist.slice(0, histI + 1); hist.push(entry); histI = hist.length - 1; updateNavBtns(); }
  function go(d) {
    const j = histI + d;
    if (j < 0 || j >= hist.length) return;
    histI = j;
    const e = hist[j];
    if (e.type === "detail") openDetail(e.id, true); else closeDetail(true);
    updateNavBtns();
  }
  function updateNavBtns() {
    const b = $("[data-back]"), f = $("[data-fwd]");
    if (b) b.disabled = histI <= 0;
    if (f) f.disabled = histI >= hist.length - 1;
  }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function updateUrl() {
    const u = $("[data-url]");
    if (!u) return;
    const city = G().market.city;
    if (detailId) { const L = G().market.byId[detailId]; u.innerHTML = `<span class="lock">🔒</span>roofline.house/<b>${slug(city.name)}-${city.state.toLowerCase()}/${slug(L.hoodName)}/${slug(L.address)}</b>`; }
    else {
      const parts = [];
      if (F.q) parts.push("q=" + encodeURIComponent(F.q));
      if (F.priceMax) parts.push("max=" + F.priceMax);
      if (F.beds) parts.push("beds=" + F.beds);
      if (F.hoods.length) parts.push("hoods=" + F.hoods.join(","));
      if (F.feats.length) parts.push("has=" + F.feats.join(","));
      u.innerHTML = `<span class="lock">🔒</span>roofline.house/<b>${slug(city.name)}-${city.state.toLowerCase()}/${F.savedOnly ? "saved" : "for-sale"}</b>${parts.length ? "?" + esc(parts.join("&")) : ""}`;
    }
    updateNavBtns();
  }

  // ---------- filters ----------
  function opts(values, sel, fmt, anyLabel) {
    return `<option value="0">${anyLabel || "Any"}</option>` + values.map((v) => `<option value="${v}" ${Number(sel) === v ? "selected" : ""}>${fmt(v)}</option>`).join("");
  }
  const PRICES = (() => { const a = []; for (let p = 100000; p <= 1000000; p += 50000) a.push(p); for (let p = 1100000; p <= 2000000; p += 100000) a.push(p); for (let p = 2250000; p <= 5000000; p += 250000) a.push(p); return a; })();

  function renderFilters() {
    const g = G(), m = g.market, city = m.city;
    const el = $("[data-filters]");
    if (!el) return;
    const base = (skip) => m.listings.filter((L) => matches(L, F, skip));
    const hoodBase = base("hoods"), typeBase = base("types");
    const pills = (key, vals, fmt) => `<div class="pills" data-pills="${key}">${vals.map((v) => `<button type="button" data-v="${v}" class="${F[key] === v ? "on" : ""}">${fmt(v)}</button>`).join("")}</div>`;
    const cur = results();
    el.innerHTML = `
      <h5>Neighborhoods <button class="btn btn-xs btn-ghost reset" data-reset>Reset all filters</button></h5>
      <div class="checks">${city.hoods.map((h) => `<label class="ck"><input type="checkbox" data-hood="${h.id}" ${F.hoods.indexOf(h.id) >= 0 ? "checked" : ""}>${esc(h.name)} <span class="muted small">${"$".repeat(h.ppsf >= 600 ? 4 : h.ppsf >= 420 ? 3 : h.ppsf >= 260 ? 2 : 1)}</span><span class="cnt">${hoodBase.filter((L) => L.hoodId === h.id).length}</span></label>`).join("")}</div>
      <h5>Price</h5>
      <div class="frow"><select class="select" data-num="priceMin">${opts(PRICES, F.priceMin, HH.moneyShort, "No min")}</select><span>–</span><select class="select" data-num="priceMax">${opts(PRICES, F.priceMax, HH.moneyShort, "No max")}</select></div>
      <h5>Bedrooms</h5>${pills("beds", [0, 1, 2, 3, 4, 5], (v) => (v ? v + "+" : "Any"))}
      <h5>Bathrooms</h5>${pills("baths", [0, 1, 1.5, 2, 2.5, 3], (v) => (v ? v + "+" : "Any"))}
      <h5>Home type</h5>
      <div class="checks">${[["house", "Single-family house"], ["townhome", "Townhome"], ["condo", "Condo"]].map(([k, t]) => `<label class="ck"><input type="checkbox" data-type="${k}" ${F.types.indexOf(k) >= 0 ? "checked" : ""}>${t}<span class="cnt">${typeBase.filter((L) => L.type === k).length}</span></label>`).join("")}</div>
      <h5>Commute (rush hour)</h5>
      <select class="select" data-commute-idx style="margin-bottom:6px"><option value="-1">Choose a destination…</option>${city.work.map((w, i) => `<option value="${i}" ${F.commuteIdx === i ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select>
      <select class="select" data-num="commuteMax" ${F.commuteIdx < 0 ? "disabled" : ""}>${opts([10, 15, 20, 25, 30, 35, 40, 45, 50, 60], F.commuteMax, (v) => `≤ ${v} min`, "Any time")}</select>
      <h5>Square feet</h5>
      <div class="frow"><select class="select" data-num="sqftMin">${opts([500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 3500, 4000, 5000], F.sqftMin, HH.num, "No min")}</select><span>–</span><select class="select" data-num="sqftMax">${opts([750, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 3500, 4000, 5000, 7500], F.sqftMax, HH.num, "No max")}</select></div>
      <h5>Monthly cost (est.)</h5>
      <select class="select" data-num="monthlyMax">${opts([1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 10000, 12500, 15000, 20000], F.monthlyMax, (v) => "≤ " + HH.money(v) + "/mo", "Any")}</select>
      <h5>HOA fee</h5>
      <select class="select" data-hoa><option value="-1">Any</option>${[[0, "No HOA"], [50, "≤ $50/mo"], [100, "≤ $100/mo"], [200, "≤ $200/mo"], [300, "≤ $300/mo"], [500, "≤ $500/mo"]].map(([v, t]) => `<option value="${v}" ${F.hoaMax === v ? "selected" : ""}>${t}</option>`).join("")}</select>
      <h5>Garage spaces</h5>${pills("garage", [0, 1, 2, 3], (v) => (v ? v + "+" : "Any"))}
      <h5>Lot size</h5>
      <select class="select" data-num="lotMin">${opts([0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1], F.lotMin, (v) => `≥ ${v} acres`, "Any")}</select>
      <h5>Year built</h5>
      <div class="frow"><input class="input" type="number" data-yr="yearMin" placeholder="Min" min="1800" max="2026" value="${F.yearMin || ""}"><span>–</span><input class="input" type="number" data-yr="yearMax" placeholder="Max" min="1800" max="2026" value="${F.yearMax || ""}"></div>
      <h5>Condition</h5>
      <select class="select" data-num="condMin"><option value="0">Any condition</option><option value="2" ${F.condMin === 2 ? "selected" : ""}>Good or better</option><option value="3" ${F.condMin === 3 ? "selected" : ""}>Move-in ready only</option></select>
      <h5>Schools &amp; walkability</h5>
      <div class="frow"><select class="select" data-num="schoolMin">${opts([5, 6, 7, 8, 9], F.schoolMin, (v) => `Schools ${v}+`, "Any school")}</select><select class="select" data-num="walkMin">${opts([50, 70, 90], F.walkMin, (v) => `Walk ${v}+`, "Any walk")}</select></div>
      <h5>Must have</h5>
      <div class="checks">${FEATS.map(([k, t]) => { const n = cur.filter(FEAT[k][2]).length; const on = F.feats.indexOf(k) >= 0; return `<label class="ck"><input type="checkbox" data-feat="${k}" ${on ? "checked" : ""}>${t}<span class="cnt">${on ? "" : n}</span></label>`; }).join("")}</div>
      <h5>Hide homes with</h5>
      <div class="checks">${EXCL.map(([k, t]) => `<label class="ck"><input type="checkbox" data-excl="${k}" ${F.excl.indexOf(k) >= 0 ? "checked" : ""}>${t}</label>`).join("")}</div>`;
    const changed = () => { page = 0; renderResults(); renderFilters(); };
    HH.$$("[data-hood]", el).forEach((c) => c.addEventListener("change", () => { toggleIn(F.hoods, c.dataset.hood, c.checked); changed(); }));
    HH.$$("[data-type]", el).forEach((c) => c.addEventListener("change", () => { toggleIn(F.types, c.dataset.type, c.checked); changed(); }));
    HH.$$("[data-feat]", el).forEach((c) => c.addEventListener("change", () => { toggleIn(F.feats, c.dataset.feat, c.checked); changed(); }));
    HH.$$("[data-excl]", el).forEach((c) => c.addEventListener("change", () => { toggleIn(F.excl, c.dataset.excl, c.checked); changed(); }));
    HH.$$("[data-num]", el).forEach((s) => s.addEventListener("change", () => { F[s.dataset.num] = parseFloat(s.value) || 0; changed(); }));
    HH.$$("[data-yr]", el).forEach((s) => s.addEventListener("change", () => { const v = parseInt(s.value, 10); F[s.dataset.yr] = v >= 1800 && v <= 2030 ? v : 0; changed(); }));
    el.querySelector("[data-hoa]").addEventListener("change", (e) => { F.hoaMax = parseInt(e.target.value, 10); changed(); });
    el.querySelector("[data-commute-idx]").addEventListener("change", (e) => { F.commuteIdx = parseInt(e.target.value, 10); if (F.commuteIdx < 0) F.commuteMax = 0; else if (sort === "newest") sort = "commute"; changed(); });
    HH.$$("[data-pills]", el).forEach((p) => p.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F[p.dataset.pills] = parseFloat(b.dataset.v); HH.sfx("click"); changed(); }));
    el.querySelector("[data-reset]").addEventListener("click", () => { F = blankFilters(); const qi = $("[data-q]"); if (qi) qi.value = ""; HH.sfx("remove"); changed(); });
  }
  function toggleIn(arr, v, on) { const i = arr.indexOf(v); if (on && i < 0) arr.push(v); if (!on && i >= 0) arr.splice(i, 1); }

  function activeChips() {
    const city = G().market.city, chips = [];
    const add = (label, clear) => chips.push({ label, clear });
    if (F.savedOnly) add("♡ Saved homes only", () => (F.savedOnly = false));
    if (F.fitsOnly && showFit()) add("✓ Fits the brief", () => (F.fitsOnly = false));
    if (F.q) add(`"${F.q}"`, () => { F.q = ""; const qi = $("[data-q]"); if (qi) qi.value = ""; });
    F.hoods.forEach((h) => add(city.hoods.find((x) => x.id === h).name, () => toggleIn(F.hoods, h, false)));
    if (F.priceMin) add("≥ " + HH.moneyShort(F.priceMin), () => (F.priceMin = 0));
    if (F.priceMax) add("≤ " + HH.moneyShort(F.priceMax), () => (F.priceMax = 0));
    if (F.beds) add(F.beds + "+ beds", () => (F.beds = 0));
    if (F.baths) add(F.baths + "+ baths", () => (F.baths = 0));
    F.types.forEach((t) => add(HH.cap(t), () => toggleIn(F.types, t, false)));
    if (F.commuteIdx >= 0 && F.commuteMax) add(`≤ ${F.commuteMax} min to ${city.work[F.commuteIdx].name}`, () => (F.commuteMax = 0));
    if (F.sqftMin) add("≥ " + HH.num(F.sqftMin) + " sqft", () => (F.sqftMin = 0));
    if (F.sqftMax) add("≤ " + HH.num(F.sqftMax) + " sqft", () => (F.sqftMax = 0));
    if (F.monthlyMax) add("≤ " + HH.money(F.monthlyMax) + "/mo", () => (F.monthlyMax = 0));
    if (F.hoaMax >= 0) add(F.hoaMax === 0 ? "No HOA" : "HOA ≤ $" + F.hoaMax, () => (F.hoaMax = -1));
    if (F.garage) add(F.garage + "+ garage", () => (F.garage = 0));
    if (F.lotMin) add("≥ " + F.lotMin + " ac", () => (F.lotMin = 0));
    if (F.yearMin) add("Built ≥ " + F.yearMin, () => (F.yearMin = 0));
    if (F.yearMax) add("Built ≤ " + F.yearMax, () => (F.yearMax = 0));
    if (F.condMin) add(F.condMin === 3 ? "Move-in ready" : "Good condition+", () => (F.condMin = 0));
    if (F.schoolMin) add("Schools " + F.schoolMin + "+", () => (F.schoolMin = 0));
    if (F.walkMin) add("Walk " + F.walkMin + "+", () => (F.walkMin = 0));
    F.feats.forEach((k) => add("✓ " + FEAT[k][1], () => toggleIn(F.feats, k, false)));
    F.excl.forEach((k) => add("✗ " + EX[k][1], () => toggleIn(F.excl, k, false)));
    return chips;
  }

  // ---------- results ----------
  function cardHtml(L) {
    const g = G();
    const picked = g.picks.indexOf(L.id) >= 0, saved = g.saved.has(L.id);
    const tags = [];
    if (L.status === "pending") tags.push(`<span class="tag tag-pending">Pending</span>`);
    if (L.badges.indexOf("new") >= 0) tags.push(`<span class="tag tag-new">New</span>`);
    if (L.badges.indexOf("pricecut") >= 0) tags.push(`<span class="tag tag-cut">Price cut</span>`);
    if (L.badges.indexOf("openhouse") >= 0) tags.push(`<span class="tag tag-open">Open house</span>`);
    if (L.badges.indexOf("newbuild") >= 0) tags.push(`<span class="tag tag-newbuild">New build</span>`);
    const ci = F.commuteIdx;
    return `<div class="card ${L.status === "pending" ? "pending" : ""} ${picked ? "picked" : ""}" data-open="${L.id}">
      <div class="ph">${S.art(L)}<div class="tags">${tags.join("")}</div>
        <button class="pick ${picked ? "on" : ""}" data-pick="${L.id}" title="${picked ? "Remove from client picks" : "Add to client picks"}">⭐</button>
        <button class="heart ${saved ? "on" : ""}" data-heart="${L.id}" title="Save">${saved ? "♥" : "♡"}</button></div>
      <div class="body">
        <div class="price">${HH.money(L.price)}${L.origPrice > L.price ? `<s>${HH.moneyShort(L.origPrice)}</s>` : ""}</div>
        <div class="facts"><b>${L.beds === 0 ? "Studio" : L.beds + "</b> bd"} · <b>${HH.baths(L.baths)}</b> ba · <b>${HH.num(L.sqft)}</b> sqft${L.lotAcres ? ` · ${L.lotAcres} ac` : ""}</div>
        <div class="addr">${esc(L.address)}, ${esc(L.hoodName)}</div>
        <div class="meta"><span>${L.typeLabel}</span><span>${L.yearBuilt}</span>${L.hoa ? `<span>HOA $${L.hoa}</span>` : ""}${ci >= 0 ? `<span>🚗 ${L.commute[ci]} min</span>` : ""}<span>≈ ${HH.money(L.monthly)}/mo</span></div>
        ${fitBadge(L)}
      </div></div>`;
  }

  function renderResults() {
    const el = $("[data-results]");
    if (!el) return;
    const g = G(), city = g.market.city;
    const list = results();
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    page = Math.min(page, pages - 1);
    const chips = activeChips();
    el.innerHTML = `<div class="results-bar"><h4>${list.length} ${list.length === 1 ? "home" : "homes"} ${F.savedOnly ? "saved" : "for sale"} in ${esc(city.name)}, ${city.state}</h4><span class="spacer"></span>
        ${showFit() ? `<label class="fits-toggle" title="Hide homes that break something you know your client needs"><input type="checkbox" data-fits ${F.fitsOnly ? "checked" : ""}> Fits the brief only</label>` : ""}
        <label class="small muted">Sort</label><select class="select" data-sort>${SORTS.map(([k, t]) => `<option value="${k}" ${sort === k ? "selected" : ""}>${t}</option>`).join("")}</select>
        <div class="seg"><button data-view="grid" class="${view === "grid" ? "on" : ""}">▦ List</button><button data-view="map" class="${view === "map" ? "on" : ""}">🗺️ Map</button></div></div>
      ${chips.length ? `<div class="active-filters">${chips.map((c, i) => `<button class="af" data-chip="${i}">${esc(c.label)} ✕</button>`).join("")}</div>` : ""}
      ${view === "grid" ? `<div class="results-scroll" data-scroll>${list.length ? `<div class="cards">${list.slice(page * PAGE, page * PAGE + PAGE).map(cardHtml).join("")}</div>
          ${pages > 1 ? `<div class="pager">${Array.from({ length: pages }, (_, i) => `<button data-page="${i}" class="${i === page ? "on" : ""}">${i + 1}</button>`).join("")}</div>` : ""}`
        : `<div class="empty-state"><div class="big">🏚️</div><b>No homes match these filters.</b><br>Try loosening a few. Your client might be flexible on something!</div>`}</div>`
        : `<div class="map-view" data-map></div>`}`;
    el.querySelector("[data-sort]").addEventListener("change", (e) => { sort = e.target.value; page = 0; renderResults(); });
    const fitsBox = el.querySelector("[data-fits]");
    if (fitsBox) fitsBox.addEventListener("change", () => { F.fitsOnly = fitsBox.checked; page = 0; HH.sfx("click"); UI.coach.done("site-toggle"); renderResults(); renderFilters(); });
    HH.$$("[data-view]", el).forEach((b) => b.addEventListener("click", () => { view = b.dataset.view; HH.sfx("click"); renderResults(); }));
    HH.$$("[data-chip]", el).forEach((b) => b.addEventListener("click", () => { chips[+b.dataset.chip].clear(); page = 0; renderResults(); renderFilters(); }));
    HH.$$("[data-page]", el).forEach((b) => b.addEventListener("click", () => { page = +b.dataset.page; renderResults(); const sc = $("[data-scroll]"); if (sc) sc.scrollTop = 0; }));
    if (view === "map") renderMap(list);
    else if (map) { try { map.remove(); } catch (e) { /* ignore */ } map = null; }
    renderNav();
    updateUrl();
  }

  function onCardClick(e) {
    const pick = e.target.closest("[data-pick]");
    if (pick) { e.stopPropagation(); G().togglePick(pick.dataset.pick); return; }
    const heart = e.target.closest("[data-heart]");
    if (heart) { e.stopPropagation(); toggleSave(heart.dataset.heart); return; }
    const open = e.target.closest("[data-open]");
    if (open) { HH.sfx("click"); openDetail(open.dataset.open); }
  }
  function toggleSave(id) {
    const s = G().saved;
    if (s.has(id)) { s.delete(id); HH.sfx("remove"); } else { s.add(id); HH.sfx("save"); }
    HH.$$(`[data-heart="${id}"]`).forEach((b) => { b.classList.toggle("on", s.has(id)); b.innerHTML = b.classList.contains("btn") ? (s.has(id) ? "♥ Saved" : "♡ Save") : s.has(id) ? "♥" : "♡"; });
    renderNav();
    if (F.savedOnly) renderResults();
  }

  function renderMap(list) {
    const box = $("[data-map]");
    if (!box) return;
    if (!window.L || !window.L.map) { box.innerHTML = `<div class="map-fallback">🗺️ The map couldn't load (no internet connection?). The list view still works.</div>`; return; }
    if (map) { try { map.remove(); } catch (e) { /* ignore */ } map = null; }
    const Lf = window.L;
    map = Lf.map(box, { zoomControl: true, attributionControl: true });
    const osm = Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }).addTo(map);
    let tileErrors = 0;
    osm.on("tileerror", () => {
      if (++tileErrors !== 4 || !map) return;
      // fall back to Esri if OSM tiles are blocked (e.g. when opened from a local file)
      map.removeLayer(osm);
      Lf.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors" }).addTo(map);
    });
    markerLayer = Lf.layerGroup().addTo(map);
    const g = G();
    const pts = [];
    list.forEach((L) => {
      const cls = L.status === "pending" ? "pending" : g.picks.indexOf(L.id) >= 0 ? "picked" : g.saved.has(L.id) ? "saved" : "";
      const icon = Lf.divIcon({ className: "", html: `<div class="map-pin ${cls}">${HH.moneyShort(L.price)}</div>`, iconSize: [0, 0] });
      const mk = Lf.marker([L.lat, L.lng], { icon, title: L.address, riseOnHover: true }).addTo(markerLayer);
      mk.on("click", () => openDetail(L.id));
      pts.push([L.lat, L.lng]);
    });
    const city = g.market.city;
    city.work.forEach((w) => {
      const icon = Lf.divIcon({ className: "", html: `<div class="map-pin" style="background:#1d2b4f">💼 ${esc(w.name)}</div>`, iconSize: [0, 0] });
      Lf.marker([w.lat, w.lng], { icon, interactive: false }).addTo(markerLayer);
    });
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    else map.setView([city.hoods[0].lat, city.hoods[0].lng], 11);
    setTimeout(() => map && map.invalidateSize(), 60);
  }

  // ---------- detail ----------
  function distText(m) { return m >= 9999 ? "over 0.5 mi" : m < 160 ? `${Math.round(m * 3.28 / 10) * 10} ft` : `${(m / 1609).toFixed(1)} mi`; }

  function openDetail(id, fromHist) {
    const g = G(), L = g.market.byId[id];
    if (!L) return;
    detailId = id;
    if (!fromHist) push({ type: "detail", id });
    const site = $(".site");
    let d = site.querySelector(".detail");
    if (d) d.remove();
    d = HH.frag(detailHtml(L));
    site.appendChild(d);
    bindDetail(d, L);
    updateUrl();
    UI.coach.done("site-open");
    UI.coach("detail-check", ".detail .brief-check", "This <b>brief check</b> compares the home with everything you know about your client.", { side: "left", delay: 450 });
    UI.coach("detail-street", ".detail [data-gtab=street]", "Take a look at the real street in <b>Google Street View</b>.", { side: "below" });
    UI.coach("detail-disc", ".detail [data-disc]", "Always read the <b>seller disclosures</b>. Foundation problems, flood zones or tenants can sink a deal.", { side: "right" });
    UI.coach("detail-pick", ".detail [data-pick-detail]", "Like it? <b>Add it to your client picks</b>. You can present up to 3 homes.", { side: "below" });
  }
  function closeDetail(fromHist) {
    const d = $(".site .detail");
    if (d) d.remove();
    if (detailId && !fromHist) push({ type: "search" });
    detailId = null;
    updateUrl();
  }
  S.openDetail = openDetail;

  function detailHtml(L) {
    const g = G(), city = g.market.city, F2 = L.f;
    const picked = g.picks.indexOf(L.id) >= 0, saved = g.saved.has(L.id);
    const hood = city.hoods.find((h) => h.id === L.hoodId);
    const yes = [], no = [];
    const feat = (on, t) => (on ? yes : no).push(t);
    feat(F2.pool, "Pool"); feat(F2.fenced, "Fenced yard"); feat(F2.office, "Home office"); feat(L.basement > 0, L.basement === 2 ? "Finished basement" : "Basement (unfinished)");
    feat(F2.primaryMain, "Bedroom on main floor"); feat(F2.adu, "In-law suite / ADU"); feat(F2.workshop, "Workshop"); feat(F2.fireplace, "Fireplace");
    feat(F2.kitchen, "Updated kitchen"); feat(F2.hardwood, "Hardwood floors"); feat(F2.deck, L.type === "condo" ? "Balcony" : "Deck / patio"); feat(F2.porch, "Screened porch");
    feat(F2.ac, "Central A/C"); feat(F2.solar, "Solar panels"); feat(F2.ev, "EV charger"); feat(F2.hotTub, "Hot tub"); feat(F2.garden, "Garden beds"); feat(F2.rv, "RV / boat parking");
    feat(F2.view, L.viewLabel); feat(F2.smart, "Smart-home tech"); feat(F2.laundry, "In-unit laundry");
    if (L.f.carpet) yes.push("Carpet in some rooms");
    if (L.type === "condo") { feat(F2.elevator, "Elevator"); feat(F2.gym, "Fitness center"); feat(F2.bldgPool, "Building pool"); feat(F2.rooftop, "Rooftop deck"); feat(F2.doorman, "Concierge"); }
    const ci = (c) => `<td>${esc(c.name)}</td><td><b>${L.commute[city.work.indexOf(c)]} min</b></td>`;
    const pay = [["Principal & interest", L.pi, "#3b6fd8"], ["Property tax", Math.round(L.taxAnnual / 12), "#2a9d8f"], ["Home insurance", Math.round(L.insureAnnual / 12), "#f4b63f"], ["HOA", L.hoa, "#7b5cd6"]].filter((x) => x[1] > 0);
    const noise = L.loc.highway ? "Highway nearby (noisy)" : L.loc.rail ? "Rail line nearby (train noise)" : L.loc.busy ? "Busy street" : "Quiet residential street";
    const easyCheck = briefCheck(L);
    return `<div class="detail">
      <div class="detail-top"><button class="btn btn-sm" data-close-detail>← Back to results</button><span class="spacer"></span>
        <button class="btn btn-sm ${saved ? "on" : ""}" data-heart="${L.id}">${saved ? "♥ Saved" : "♡ Save"}</button>
        <button class="btn btn-sm ${picked ? "btn-gold" : "btn-primary"}" data-pick-detail="${L.id}">${picked ? "⭐ In client picks (remove)" : "⭐ Add to client picks"}</button></div>
      <div class="detail-scroll"><div class="detail-grid">
        <div>
          <div class="gallery">
            <div class="gallery-tabs">${[["photo", "📷 Photo"], ["street", "🚶 Street View"], ["sat", "🛰️ Satellite"], ["map", "🗺️ Map"], ["plan", "📐 Floor plan"]].map(([k, t], i) => `<button data-gtab="${k}" class="${i === 0 ? "on" : ""}">${t}</button>`).join("")}</div>
            <div class="gallery-view" data-gview>${S.art(L)}</div>
            <div class="gallery-note" data-gnote>Listing illustration. Check <b>Street View</b> to see the real street.</div>
          </div>
          <div class="d-section"><h3>📝 About this home</h3><div class="d-desc">${esc(L.description)}</div></div>
          <div class="d-section"><h3>✅ Features</h3><div class="feat-list">${yes.map((t) => `<span class="feat">${esc(t)}</span>`).join("")}${no.map((t) => `<span class="feat no">${esc(t)}</span>`).join("")}</div></div>
          <div class="d-section" data-disc><h3>⚠️ Seller disclosures</h3>${L.disclosures.length ? L.disclosures.map((t) => `<div class="disc ${/foundation|roof is near|electrical|water intrusion|AS-IS|galvanized|termite|HVAC system is/i.test(t) ? "bad" : ""}">${esc(t)}</div>`).join("") : `<div class="muted small">No disclosures reported.</div>`}</div>
          <div class="d-section"><h3>🏘️ Neighborhood: ${esc(L.hoodName)}</h3><p class="d-desc" style="margin-top:0">${esc(hood.vibe)}</p>
            <div class="kv">
              <div><span>🎓 ${esc(L.schoolName)}</span><span>${L.schoolRating}/10</span></div>
              <div><span>🏫 Nearest school</span><span>${distText(L.loc.schoolM)}</span></div>
              <div><span>🚶 Walk Score</span><span>${L.walk} · ${L.walk >= 90 ? "Walker's paradise" : L.walk >= 70 ? "Very walkable" : L.walk >= 50 ? "Somewhat walkable" : "Car-dependent"}</span></div>
              <div><span>🌳 Nearest park</span><span>${distText(L.loc.parkM)}</span></div>
              <div><span>🚌 Nearest transit stop</span><span>${distText(L.loc.transitM)}</span></div>
              <div><span>🌊 Water</span><span>${L.f.waterfront ? "Waterfront" : distText(L.loc.waterM)}</span></div>
              <div><span>🔊 Street noise</span><span>${noise}</span></div>
              <div><span>🌧️ Flood zone</span><span>${L.flood ? "Yes (zone AE)" : "No (zone X)"}</span></div>
              ${L.loc.corner ? `<div><span>📐 Lot</span><span>Corner lot</span></div>` : ""}
            </div></div>
          <div class="d-section"><h3>📈 Price history</h3><table class="history"><tr><th>Date</th><th>Event</th><th>Price</th></tr>${L.history.slice().reverse().map((h) => `<tr><td>${esc(h.date)}</td><td>${esc(h.event)}</td><td>${HH.money(h.price)}</td></tr>`).join("")}</table></div>
        </div>
        <div>
          <div class="d-price">${HH.money(L.price)}${L.origPrice > L.price ? `<s>${HH.money(L.origPrice)}</s>` : ""}${L.status === "pending" ? `<span class="tag tag-pending" style="font-size:13px">Pending</span>` : ""}</div>
          <div class="d-addr">${esc(L.address)}</div>
          <div class="d-hood">${esc(L.hoodName)}, ${esc(city.name)}, ${city.state} · ${L.typeLabel} · ${esc(L.style)}</div>
          <div class="d-facts"><div><b>${L.beds === 0 ? "Studio" : L.beds}</b>beds</div><div><b>${HH.baths(L.baths)}</b>baths</div><div><b>${HH.num(L.sqft)}</b>sq ft</div>${L.lotAcres ? `<div><b>${L.lotAcres}</b>acres</div>` : ""}<div><b>${L.yearBuilt}</b>built</div></div>
          ${easyCheck}
          <div class="pay"><div class="small muted">Estimated monthly cost (${HH.DOWN}% down, ${HH.RATE}% 30-yr fixed)</div><div class="pay-total">${HH.money(L.monthly)}/mo</div>
            <div class="pay-bar">${pay.map((p) => `<div style="flex:${p[1]};background:${p[2]}"></div>`).join("")}</div>
            ${pay.map((p) => `<div class="pay-row"><span><i style="background:${p[2]}"></i>${p[0]}</span><b>${HH.money(p[1])}</b></div>`).join("")}</div>
          <div class="d-section"><h3>🔑 Key facts</h3><div class="kv" style="grid-template-columns:1fr">
            <div><span>Status</span><span>${L.status === "pending" ? "⛔ Pending — under contract" : "For sale"}</span></div>
            <div><span>Condition</span><span>${L.conditionLabel}${L.renovated ? ` (renovated ${L.renovated})` : ""}</span></div>
            <div><span>Stories</span><span>${L.type === "condo" ? `Single-level unit on floor ${L.unitFloor} of ${L.buildingFloors}` : L.stories}</span></div>
            <div><span>Parking</span><span>${esc(L.garageType)}</span></div>
            <div><span>Basement</span><span>${["None", "Unfinished", "Finished"][L.basement]}</span></div>
            <div><span>Flooring</span><span>${L.f.hardwood ? "Hardwood" : "Tile / LVP"}${L.f.carpet ? " + carpet" : ""}</span></div>
            <div><span>HOA</span><span>${L.hoa ? "$" + L.hoa + "/mo" : "None"}</span></div>
            ${L.hoaRules.length ? `<div><span>HOA rules</span><span>${esc(L.hoaRules.join("; "))}</span></div>` : ""}
            <div><span>Pets</span><span>${esc(L.pets)}</span></div>
            <div><span>Possession</span><span>${esc(L.possession)}</span></div>
            <div><span>Property tax</span><span>${HH.money(L.taxAnnual)}/yr</span></div>
            <div><span>Price per sq ft</span><span>$${L.ppsf}</span></div>
            <div><span>Days on Roofline</span><span>${L.dom}</span></div>
            <div><span>MLS #</span><span>${esc(L.mls)}</span></div>
          </div></div>
          <div class="d-section"><h3>🚗 Rush-hour commute</h3><table class="history">${city.work.map((w) => `<tr>${ci(w)}</tr>`).join("")}</table></div>
          <div class="d-section"><div class="agent-box">${HH.art.agentAvatar("#6b7a99", L.agent.name)}<div><b>${esc(L.agent.name)}</b><br><span class="muted">Listing agent · ${esc(L.agent.brokerage)}</span></div></div></div>
        </div>
      </div></div></div>`;
  }

  // checklist of the home against everything the agent knows about the client
  function briefCheck(L) {
    const g = G(), c = g.client;
    const f = fitInfo(L);
    const unknown = c.reqs.filter((q) => q.hidden && !g.revealed[q.topic]).length + (c.commute && c.commute.hidden && !g.revealed.work ? 1 : 0);
    const verdict = f.fails.length ? `<span style="color:var(--red)">✗ Doesn't fit: ${HH.plural(f.fails.length, "problem")}</span>`
      : f.partial.length ? `<span style="color:#8a5a00">🟡 Fits only if they stretch the budget</span>` : `<span style="color:var(--green)">✓ Fits everything you know</span>`;
    return `<div class="brief-check"><div class="bc-head">📋 Brief check · ${esc(c.shortName)}</div><div class="bc-verdict">${verdict}</div>
      ${f.rows.map((x) => `<div class="check-row"><span class="ci">${x.ok === true ? "✅" : x.ok === "partial" ? "🟡" : "❌"}</span>${esc(x.label)}${x.note ? ` <span class="muted small">(${esc(x.note)})</span>` : ""}</div>`).join("")}
      ${f.nice.length ? `<div class="check-row"><span class="ci">💚</span><span>Nice-to-haves: ${f.nice.map((x) => `<span style="${x.ok ? "font-weight:700;color:var(--teal)" : "color:var(--ink-3);text-decoration:line-through"}">${esc(x.label)}</span>`).join(", ")}</span></div>` : ""}
      ${unknown && c.diff !== "easy" ? `<div class="bc-unknown">❔ ${unknown === 1 ? "1 thing" : unknown + " things"} you haven't uncovered could still rule this home out. Read the disclosures too!</div>` : ""}</div>`;
  }

  function bindDetail(d, L) {
    d.querySelector("[data-close-detail]").addEventListener("click", () => { HH.sfx("click"); closeDetail(); });
    d.querySelector("[data-heart]").addEventListener("click", () => toggleSave(L.id));
    d.querySelector("[data-pick-detail]").addEventListener("click", () => G().togglePick(L.id));
    const view = d.querySelector("[data-gview]"), note = d.querySelector("[data-gnote]");
    HH.$$("[data-gtab]", d).forEach((b) => b.addEventListener("click", () => {
      HH.$$("[data-gtab]", d).forEach((x) => x.classList.toggle("on", x === b));
      HH.sfx("click");
      const k = b.dataset.gtab;
      if (k === "photo") { view.innerHTML = S.art(L); note.innerHTML = "Listing illustration. Check <b>Street View</b> to see the real street."; }
      if (k === "street") {
        view.innerHTML = `<div class="loading"><div class="spinner"></div>Loading Street View…</div><iframe src="${UI.streetViewUrl(L)}" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" title="Street View"></iframe>`;
        note.innerHTML = `Real Google Street View of this street (listing house numbers are fictional). Drag to look around. <a href="${UI.mapsLink(L)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>`;
      }
      if (k === "sat") { view.innerHTML = `<div class="loading"><div class="spinner"></div>Loading…</div><iframe src="${UI.mapEmbedUrl(L, true)}" loading="lazy" title="Satellite map"></iframe>`; note.innerHTML = "Satellite view of the location."; }
      if (k === "map") { view.innerHTML = `<div class="loading"><div class="spinner"></div>Loading…</div><iframe src="${UI.mapEmbedUrl(L, false)}" loading="lazy" title="Map"></iframe>`; note.innerHTML = `Map of ${esc(L.hoodName)}.`; }
      if (k === "plan") { view.innerHTML = `<div class="fp-wrap">${HH.art.floorplan(L)}</div>`; note.innerHTML = "Floor plan (illustrative)."; }
    }));
  }

  // ---------- shortlist ----------
  function renderShortlist() {
    const el = $("[data-shortlist]");
    if (!el) return;
    const g = G(), coop = g.isCoop();
    const slots = [0, 1, 2].map((i) => {
      const id = g.picks[i];
      if (!id) return `<div class="slot"><span class="num">${i + 1}</span>${i === 0 ? "Your best pick goes here" : "Empty"}</div>`;
      const L = g.market.byId[id];
      const by = coop && g.pickBy[id] ? g.player(g.pickBy[id]) : null;
      const locked = !coop && g.submitted;
      return `<div class="slot filled"><span class="num">${i + 1}</span><div class="thumb">${S.art(L)}</div>
        <div class="si" data-open-slot="${id}"><b>${HH.moneyShort(L.price)} · ${L.beds === 0 ? "Studio" : L.beds + "bd"}/${HH.baths(L.baths)}ba</b><span>${esc(L.address)}</span>${by ? `<span class="by" style="--c:${by.color}">added by ${esc(by.name)}</span>` : ""}</div>
        ${locked ? "" : `<button class="sbtn" data-up="${id}" title="Move up" ${i === 0 ? "disabled" : ""}>▲</button><button class="sbtn" data-rm="${id}" title="Remove">✕</button>`}</div>`;
    }).join("");
    let action;
    if (coop) {
      const readyN = g.lobby.players.filter((p) => g.status[p.id] === "done").length;
      action = `<button class="btn ${g.ready ? "btn-teal" : "btn-primary"} btn-block" data-ready ${g.picks.length ? "" : "disabled"}>${g.ready ? "✅ Ready! (click to undo)" : "🤝 Ready to present"}</button><div class="coop-ready">${readyN}/${g.lobby.players.length} agents ready · presents when everyone is ready</div>`;
    } else {
      action = g.submitted ? `<button class="btn btn-block" disabled>✅ Picks submitted</button>` : `<button class="btn btn-primary btn-block btn-lg" data-present ${g.picks.length ? "" : "disabled"}>🚗 Present to client ▸</button>`;
    }
    el.innerHTML = `<h4>⭐ ${coop ? "Team picks" : "Client picks"} <span class="muted small" style="font-family:var(--ui)">(${g.picks.length}/3)</span></h4><div class="slots">${slots}</div>${action}`;
    HH.$$("[data-open-slot]", el).forEach((b) => b.addEventListener("click", () => openDetail(b.dataset.openSlot)));
    HH.$$("[data-up]", el).forEach((b) => b.addEventListener("click", () => g.movePick(b.dataset.up, -1)));
    HH.$$("[data-rm]", el).forEach((b) => b.addEventListener("click", () => g.togglePick(b.dataset.rm)));
    const pr = el.querySelector("[data-present]");
    if (pr) pr.addEventListener("click", () => confirmPresent());
    const rd = el.querySelector("[data-ready]");
    if (rd) rd.addEventListener("click", () => { HH.sfx("click"); g.setReady(!g.ready); });
  }
  S.renderShortlist = renderShortlist;

  function confirmPresent() {
    const g = G();
    const multi = g.mode !== "solo";
    const list = g.picks.map((id, i) => { const L = g.market.byId[id]; return `<div class="check-row"><span class="ci"><b>${i + 1}.</b></span>${esc(L.address)} — <b>${HH.money(L.price)}</b></div>`; }).join("");
    const m = UI.modal({
      title: "🚗 Ready for showing day?",
      body: `<p>You're presenting ${HH.plural(g.picks.length, "home")} to <b>${esc(g.client.name)}</b>:</p>${list}
        ${g.picks.length < 3 ? `<p class="small" style="color:#8a5a00;background:var(--gold-l);padding:8px 10px;border-radius:8px">You have room for ${3 - g.picks.length} more. More options give your client more chances to say yes.</p>` : ""}
        <p class="muted small">You can't change your picks after this.${multi ? " Submitting earlier wins ties against rival agents." : ""}${g.round.durationMs ? " Time left on the clock earns a speed bonus if they buy." : ""}</p>`,
      foot: `<button class="btn btn-ghost" data-close>Keep searching</button><button class="btn btn-primary" data-ok>Present ▸</button>`,
    });
    m.el.querySelector("[data-ok]").addEventListener("click", () => { m.close(); HH.sfx("whoosh"); g.submit(false); });
  }

  // ---------- waiting overlay ----------
  function showWaiting() {
    const g = G();
    if (g.mode === "solo") return;
    let ov = $("#screen-computer .wait-overlay");
    const players = g.lobby.players;
    const doneN = players.filter((p) => g.status[p.id] === "done").length;
    const html = `<div class="wait-card"><div class="spinner"></div><h3>${g.isCoop() ? "Waiting for your team…" : "Picks locked in!"}</h3>
      <p class="muted">${g.isCoop() ? "The client sees the team's homes once every agent is ready." : "Waiting for the other agents to present."} (${doneN}/${players.length} ready)</p>
      <div class="player-list" style="text-align:left;margin:12px 0">${players.map((p) => `<div class="player-row"><div class="pav" style="--c:${p.color}">${UI.avatar(p)}</div><span class="pname">${esc(p.name)}</span><span class="spacer"></span>${g.status[p.id] === "done" ? "✅" : "🔍 searching…"}</div>`).join("")}</div>
      ${g.isCoop() ? `<button class="btn btn-block" data-unready>↩️ Not ready, keep searching</button>` : ""}
      <div style="margin-top:10px;text-align:left">${UI.chatBox()}</div></div>`;
    if (!ov) { ov = HH.frag(`<div class="wait-overlay"></div>`); $("#screen-computer").appendChild(ov); }
    ov.innerHTML = html;
    UI.bindChat(ov);
    const un = ov.querySelector("[data-unready]");
    if (un) un.addEventListener("click", () => g.setReady(false));
  }
  function hideWaiting() { const ov = $("#screen-computer .wait-overlay"); if (ov) ov.remove(); }

  HH.on("picks", () => {
    if (UI.current !== "computer") return;
    renderShortlist();
    const g = G();
    HH.$$(".card[data-open]").forEach((c) => { const on = g.picks.indexOf(c.dataset.open) >= 0; c.classList.toggle("picked", on); const p = c.querySelector(".pick"); if (p) p.classList.toggle("on", on); });
    const d = $(".site .detail [data-pick-detail]");
    if (d) { const on = g.picks.indexOf(d.dataset.pickDetail) >= 0; d.className = `btn btn-sm ${on ? "btn-gold" : "btn-primary"}`; d.textContent = on ? "⭐ In client picks (remove)" : "⭐ Add to client picks"; }
    HH.$$("[data-hud-picks]").forEach((x) => (x.textContent = `⭐ ${g.picks.length}/3`));
    if (g.picks.length) {
      UI.coach.done("detail-pick");
      UI.coach("shortlist", "[data-shortlist]", g.isCoop()
        ? "Your <b>team's picks</b> show up here. When everyone clicks <b>Ready</b>, the client tours them."
        : "Your picks show up here. Put your favorite <b>first</b> with ▲. When you're happy, click <b>Present to client</b>. Picks lock after that!", { side: "left" });
    }
  });
  // a teammate's question can reveal more about the client while we're searching
  HH.on("revealed", () => {
    if (UI.current !== "computer") return;
    renderResults(); renderFilters();
    const d = $(".site .detail .brief-check");
    if (d && detailId) d.outerHTML = briefCheck(G().market.byId[detailId]);
  });
  HH.on("submitted", (o) => {
    if (UI.current !== "computer") return;
    renderShortlist();
    const g = G();
    if (g.submitted || g.ready) showWaiting(); else hideWaiting();
    if (o && o.reset && g.isCoop()) UI.toast("The team shortlist changed, so everyone needs to ready up again.", "", "🔁");
  });
  HH.on("status", () => {
    if (UI.current !== "computer") return;
    renderShortlist();
    const g = G();
    if (g.submitted || g.ready) showWaiting();
  });

  // ---------- easy mode: apply brief ----------
  S.bindBriefApply = function () {
    const b = $("[data-apply-brief]");
    if (!b || b._bound) return;
    b._bound = true;
    b.addEventListener("click", () => {
      const g = G(), c = g.client;
      F = blankFilters();
      F.priceMax = c.budget.max;
      if (c.hoods) F.hoods = c.hoods.slice();
      if (c.commute) { F.commuteIdx = c.commute.idx; F.commuteMax = c.commute.max; sort = "commute"; }
      F.beds = c.minBeds; F.baths = c.minBaths;
      if (c.types.length < 3) F.types = c.types.slice();
      F.excl.push("pending");
      c.reqs.filter((q) => q.kind !== "nice").forEach((q) => {
        const map = { fenced: ["f", "fenced"], pool: ["f", "pool"], noPool: ["x", "poolEx"], office: ["f", "office"], basement: ["f", "basement"], primaryMain: ["f", "primaryMain"], adu: ["f", "adu"], workshop: ["f", "workshop"], solar: ["f", "solar"], ev: ["f", "ev"], kitchen: ["f", "kitchen"], view: ["f", "view"], waterfront: ["f", "waterfront"], nearWater: ["f", "nearWater"], nearPark: ["f", "nearPark"], transit: ["f", "transit"], dogOK: ["f", "bigDog"], petsOK: ["f", "pets"], rentalOK: ["f", "rentals"], quickClose: ["f", "quick"], ac: ["f", "ac"], noCarpet: ["x", "carpet"], noFlood: ["x", "flood"], notBusy: ["x", "busy"], fireplace: ["f", "fireplace"], deck: ["f", "deck"] };
        if (map[q.key]) { const [t, k] = map[q.key]; (t === "f" ? F.feats : F.excl).push(k); }
        if (q.key === "quiet") F.excl.push("busy", "highway", "rail");
        if (q.key === "noHOA") F.hoaMax = 0;
        if (q.key === "moveIn") { F.excl.push("fixer", "issues"); }
        if (q.key === "singleStory") F.excl.push("multi");
        if (q.key === "garage2") F.garage = 2;
        if (q.key === "garage") F.garage = 1;
        if (q.key === "newerHome") F.yearMin = 2000;
        if (q.key === "schools") F.schoolMin = parseInt(q.label.match(/\d+/)[0], 10);
        if (q.key === "sqft") F.sqftMin = parseInt(q.label.replace(/,/g, "").match(/\d+/)[0], 10);
        if (q.key === "walkable") F.walkMin = 70;
        if (q.key === "older") F.yearMax = parseInt(q.label.match(/\d{4}/)[0], 10) - 1;
      });
      page = 0;
      HH.sfx("save");
      closeDetail(true);
      renderFilters(); renderResults();
      UI.toast("Applied the client's requirements as filters. Now compare the results!", "good", "⚡");
    });
  };

  // ---------- tools ----------
  function notesModal() {
    const g = G();
    const lines = [].concat(g.client.opening);
    g.asked.forEach((t) => { const tp = HH.TOPICS.find((x) => x.key === t); lines.push("— " + tp.q); lines.push(...g.client.answers[t]); });
    UI.modal({ title: "🗒️ What the client said", size: "wide", body: `<div class="talk-log">${lines.map((l) => `<div class="talk-line ${l.indexOf("— ") === 0 ? "me" : ""}">${esc(l.replace(/^— /, ""))}</div>`).join("")}</div>`, foot: `<button class="btn btn-primary" data-close>Close</button>` });
  }

  function calculator() {
    const g = G();
    const st = { price: g.client.budget.max, down: HH.DOWN, rate: HH.RATE, tax: g.market.city.tax, hoa: 0, ins: Math.round(g.client.budget.max * 0.0034 * g.market.city.insure) };
    const m = UI.modal({
      title: "🧮 Mortgage calculator",
      body: `<div class="settings-grid">
        <div class="frow row"><div style="flex:1"><label class="field">Home price</label><input class="input" type="number" data-c="price" value="${st.price}" step="5000"></div><div style="width:110px"><label class="field">Down %</label><input class="input" type="number" data-c="down" value="${st.down}" step="1" min="0" max="100"></div></div>
        <div class="frow row"><div style="flex:1"><label class="field">Rate % (30-yr)</label><input class="input" type="number" data-c="rate" value="${st.rate}" step="0.1"></div><div style="flex:1"><label class="field">Tax % / yr</label><input class="input" type="number" data-c="tax" value="${st.tax}" step="0.05"></div></div>
        <div class="frow row"><div style="flex:1"><label class="field">Insurance $/yr</label><input class="input" type="number" data-c="ins" value="${st.ins}" step="50"></div><div style="flex:1"><label class="field">HOA $/mo</label><input class="input" type="number" data-c="hoa" value="${st.hoa}" step="10"></div></div>
        <div class="pay"><div class="small muted">Estimated monthly payment</div><div class="pay-total" data-out></div><div class="small muted" data-out2></div></div>
        <p class="muted small">Listing pages already show this estimate for every home (${HH.DOWN}% down, ${HH.RATE}%).</p></div>`,
      foot: `<button class="btn btn-primary" data-close>Close</button>`,
    });
    const calc = () => {
      HH.$$("[data-c]", m.el).forEach((i) => (st[i.dataset.c] = parseFloat(i.value) || 0));
      const pi = st.rate > 0 ? HH.mortgage(st.price, st.rate, 30, st.down) : (st.price * (1 - st.down / 100)) / 360;
      const total = pi + (st.price * st.tax) / 100 / 12 + st.ins / 12 + st.hoa;
      m.el.querySelector("[data-out]").textContent = HH.money(total) + "/mo";
      m.el.querySelector("[data-out2]").textContent = `P&I ${HH.money(pi)} · tax ${HH.money((st.price * st.tax) / 1200)} · insurance ${HH.money(st.ins / 12)} · HOA ${HH.money(st.hoa)}`;
    };
    HH.$$("[data-c]", m.el).forEach((i) => i.addEventListener("input", calc));
    calc();
  }

  function guide() {
    const g = G(), city = g.market.city;
    const rows = city.hoods.map((h) => {
      const ls = g.market.listings.filter((L) => L.hoodId === h.id);
      const prices = ls.map((L) => L.price).sort((a, b) => a - b);
      const med = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
      const walk = ls.length ? Math.round(ls.reduce((a, L) => a + L.walk, 0) / ls.length) : 0;
      return `<div class="res-panel" style="box-shadow:var(--shadow-1);padding:12px 14px"><div class="row"><b style="font-size:16px">${esc(h.name)}</b><span class="spacer"></span><span class="muted small">${ls.length} listings</span></div>
        <div class="muted small" style="margin:4px 0 8px">${esc(h.vibe)}</div>
        <div class="row wrap small"><span class="chip">Median ${med ? HH.moneyShort(med) : "—"}</span><span class="chip">~$${h.ppsf}/sqft</span><span class="chip">Schools ${h.school[0]}–${h.school[1]}</span><span class="chip">Walk ~${walk}</span><span class="chip">Built ${h.era[0]}–${Math.min(2025, h.era[1])}</span>${h.hoa > 0.5 ? `<span class="chip">Mostly HOA</span>` : ""}</div></div>`;
    }).join("");
    UI.modal({ title: `🗺️ ${esc(city.name)} neighborhood guide`, size: "wide", body: `<p class="muted">${esc(city.blurb)} Property tax here is about ${city.tax}% per year.</p><div style="display:grid;gap:10px">${rows}</div>`, foot: `<button class="btn btn-primary" data-close>Close</button>` });
  }
})(window.HH);
