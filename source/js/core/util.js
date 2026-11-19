// Shared helpers: seeded RNG, formatting, DOM, storage.
window.HH = window.HH || {};
(function (HH) {
  "use strict";
  HH.VERSION = "1.1.0";
  // local calendar date as YYYY-MM-DD (used for the Daily Client)
  HH.dateKey = function (d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  // ---------- hashing / RNG (deterministic across peers) ----------
  HH.hash = function (str) {
    let h = 2166136261 >>> 0;
    str = String(str);
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return h >>> 0;
  };

  HH.rng = function (seed) {
    let a = (typeof seed === "number" ? seed : HH.hash(seed)) >>> 0;
    const next = function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const r = {
      next,
      float: (lo, hi) => lo + (hi - lo) * next(),
      range: (lo, hi) => lo + (hi - lo) * next(),
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      chance: (p) => next() < p,
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      shuffle: (arr) => {
        const a2 = arr.slice();
        for (let i = a2.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          const t = a2[i]; a2[i] = a2[j]; a2[j] = t;
        }
        return a2;
      },
      weighted: (items, weights) => {
        let total = 0;
        for (const w of weights) total += w;
        let x = next() * total;
        for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x < 0) return items[i]; }
        return items[items.length - 1];
      },
      sample: (arr, n) => r.shuffle(arr).slice(0, n),
      gauss: () => (next() + next() + next() - 1.5) / 0.5, // approx N(0,1)-ish, bounded
      seed: () => Math.floor(next() * 4294967296) >>> 0,
    };
    return r;
  };

  HH.randomSeed = function () {
    if (window.crypto && crypto.getRandomValues) {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] >>> 0;
    }
    return Math.floor(Math.random() * 4294967296) >>> 0;
  };

  // ---------- math ----------
  HH.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  HH.lerp = (a, b, t) => a + (b - a) * t;
  HH.distM = function (lat1, lng1, lat2, lng2) {
    const R = 6371000, toR = Math.PI / 180;
    const dLat = (lat2 - lat1) * toR, dLng = (lng2 - lng1) * toR;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  // Estimated rush-hour drive time in whole minutes.
  HH.driveMinutes = function (lat1, lng1, lat2, lng2) {
    const km = (HH.distM(lat1, lng1, lat2, lng2) / 1000) * 1.32;
    let min;
    if (km < 4) min = km / 0.42;
    else if (km < 12) min = 4 / 0.42 + (km - 4) / 0.62;
    else min = 4 / 0.42 + 8 / 0.62 + (km - 12) / 0.9;
    return Math.max(3, Math.round(min * 1.12 + 3));
  };
  HH.mortgage = function (price, ratePct, years, downPct) {
    const loan = price * (1 - downPct / 100);
    const r = ratePct / 100 / 12, n = years * 12;
    return (loan * r) / (1 - Math.pow(1 + r, -n));
  };
  HH.RATE = 6.4; // assumed 30-year fixed rate for estimates
  HH.DOWN = 20;

  // ---------- formatting ----------
  HH.money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  HH.moneyShort = function (n) {
    if (n >= 999500) return "$" + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, "") + "M";
    if (n >= 1000) return "$" + Math.round(n / 1000) + "K";
    return "$" + Math.round(n);
  };
  HH.num = (n) => Math.round(n).toLocaleString("en-US");
  HH.plural = (n, word, pluralWord) => `${n} ${n === 1 ? word : pluralWord || word + "s"}`;
  HH.baths = (b) => (b % 1 === 0 ? String(b) : b.toFixed(1));
  HH.acres = (a) => (a >= 1 ? a.toFixed(2) : a.toFixed(2).replace(/^0/, "0")) + " ac";
  HH.niceRound = function (x) {
    if (x >= 2e6) return Math.round(x / 50000) * 50000;
    if (x >= 1e6) return Math.round(x / 25000) * 25000;
    if (x >= 400000) return Math.round(x / 10000) * 10000;
    return Math.round(x / 5000) * 5000;
  };
  HH.ordinal = function (n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  HH.fmtTime = function (ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };
  HH.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  };
  HH.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  HH.listJoin = function (arr, conj) {
    conj = conj || "and";
    if (arr.length <= 1) return arr.join("");
    if (arr.length === 2) return arr[0] + " " + conj + " " + arr[1];
    return arr.slice(0, -1).join(", ") + ", " + conj + " " + arr[arr.length - 1];
  };

  // ---------- DOM ----------
  HH.$ = (sel, root) => (root || document).querySelector(sel);
  HH.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  HH.html = function (el, markup) {
    if (typeof el === "string") el = HH.$(el);
    if (el) el.innerHTML = markup;
    return el;
  };
  HH.frag = function (markup) {
    const t = document.createElement("template");
    t.innerHTML = markup.trim();
    return t.content.firstElementChild;
  };

  // ---------- storage ----------
  HH.store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem("hhtg." + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("hhtg." + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  // ---------- tiny event bus ----------
  const listeners = {};
  HH.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  HH.emit = (ev, data) => { (listeners[ev] || []).slice().forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); };

  HH.uid = function () {
    return HH.randomSeed().toString(36) + Date.now().toString(36).slice(-4);
  };
})(window.HH);
