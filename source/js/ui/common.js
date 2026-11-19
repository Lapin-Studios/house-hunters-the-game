// Shared UI: screens, modals, toasts, HUD, profile, career & achievements.
(function (HH) {
  "use strict";
  const $ = HH.$, esc = HH.esc;
  const UI = (HH.ui = HH.ui || {});

  // ---------- screens ----------
  UI.current = null;
  UI.show = function (name) {
    HH.$$(".screen").forEach((s) => s.classList.toggle("active", s.id === "screen-" + name));
    UI.current = name;
    HH.emit("screen", name);
  };

  // ---------- toasts ----------
  UI.toast = function (text, kind, icon, ms) {
    const el = HH.frag(`<div class="toast ${kind || ""}">${icon ? `<span class="t-icon">${icon}</span>` : ""}<div>${text}</div></div>`);
    $("#toasts").appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, ms || 3200);
  };

  // ---------- modals ----------
  UI.modal = function (opts) {
    const back = HH.frag(`<div class="modal-back"><div class="modal ${opts.size || ""}" role="dialog" aria-modal="true">
      <div class="modal-head"><h2>${opts.title || ""}</h2>${opts.noClose ? "" : `<button class="modal-x" data-close aria-label="Close">✕</button>`}</div>
      <div class="modal-body">${opts.body || ""}</div>
      ${opts.foot ? `<div class="modal-foot">${opts.foot}</div>` : ""}
    </div></div>`);
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); if (opts.onClose) opts.onClose(); };
    const onKey = (e) => { if (e.key === "Escape" && !opts.noClose) close(); };
    document.addEventListener("keydown", onKey);
    back.addEventListener("click", (e) => {
      if ((e.target === back && !opts.noClose && !opts.sticky) || e.target.closest("[data-close]")) { HH.sfx("click"); close(); }
    });
    $("#modal-root").appendChild(back);
    const m = { el: back, body: back.querySelector(".modal-body"), close };
    if (opts.onOpen) opts.onOpen(m);
    const first = back.querySelector("input, .btn-primary");
    if (first && opts.autofocus !== false) setTimeout(() => first.focus(), 50);
    return m;
  };
  UI.confirm = function (title, text, okLabel, onOk, danger) {
    const m = UI.modal({
      title, body: `<p>${text}</p>`,
      foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ok>${okLabel}</button>`,
    });
    m.el.querySelector("[data-ok]").addEventListener("click", () => { m.close(); onOk(); });
    return m;
  };
  UI.closeModals = () => HH.$$("#modal-root .modal-back").forEach((m) => m.remove());

  // ---------- profile ----------
  UI.COLORS = ["#e85d3f", "#2a9d8f", "#3b6fd8", "#7b5cd6", "#f4b63f", "#d6457a", "#2f9e5b", "#1d2b4f"];
  const AGENT_NAMES = ["Agent Ace", "Casey Keys", "Robin Realty", "Sam Sold", "Jamie Deeds", "Alex Escrow", "Taylor Turnkey", "Morgan Mortgage"];
  UI.profile = HH.store.get("profile", null) || { name: AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)], color: UI.COLORS[Math.floor(Math.random() * UI.COLORS.length)] };
  UI.saveProfile = () => HH.store.set("profile", UI.profile);
  if (!HH.store.get("profile", null)) UI.saveProfile();
  UI.prefs = HH.store.get("prefs", { textSpeed: 1, reducedMotion: false, seenHelp: false });
  UI.savePrefs = () => { HH.store.set("prefs", UI.prefs); document.body.classList.toggle("reduced-motion", !!UI.prefs.reducedMotion); };
  document.body.classList.toggle("reduced-motion", !!UI.prefs.reducedMotion);

  UI.avatar = (p) => HH.art.agentAvatar(p.color, p.name);
  UI.cleanName = (n) => String(n || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 18) || "Agent";

  // ---------- career & achievements ----------
  const CAREER0 = { earnings: 0, deals: 0, rounds: 0, starsSum: 0, starsN: 0, cities: {}, biggest: 0, streak: 0, bestStreak: 0, ach: {}, games: 0, wins: 0 };
  UI.career = Object.assign({}, CAREER0, HH.store.get("career", {}));
  UI.saveCareer = () => HH.store.set("career", UI.career);
  UI.RANKS = [
    { at: 0, name: "Rookie Agent", icon: "🔑" },
    { at: 25000, name: "Licensed Agent", icon: "📋" },
    { at: 100000, name: "Senior Agent", icon: "🏡" },
    { at: 250000, name: "Top Producer", icon: "📈" },
    { at: 500000, name: "Managing Broker", icon: "🏢" },
    { at: 1000000, name: "Real Estate Legend", icon: "👑" },
  ];
  UI.rankFor = function (e) {
    let cur = UI.RANKS[0], next = null;
    for (let i = 0; i < UI.RANKS.length; i++) { if (e >= UI.RANKS[i].at) { cur = UI.RANKS[i]; next = UI.RANKS[i + 1] || null; } }
    return { cur, next, pct: next ? (e - cur.at) / (next.at - cur.at) : 1 };
  };
  UI.ACH = [
    { id: "first", icon: "🔑", name: "Sold!", desc: "Close your first deal." },
    { id: "five", icon: "⭐", name: "Dream Home", desc: "Earn a 5-star review." },
    { id: "million", icon: "💎", name: "Seven Figures", desc: "Sell a $1,000,000+ home." },
    { id: "bargain", icon: "🏷️", name: "Bargain Hunter", desc: "Sell a home 15%+ under budget with 4+ stars." },
    { id: "mind", icon: "🔮", name: "Mind Reader", desc: "Uncover every hidden preference in a meeting." },
    { id: "speed", icon: "⚡", name: "Speed Closer", desc: "Close a deal with over half the clock left." },
    { id: "streak", icon: "🔥", name: "Hot Streak", desc: "Close 3 deals in a row." },
    { id: "perfect", icon: "🎯", name: "Nailed It", desc: "Present the single best match on the market." },
    { id: "hard", icon: "🧗", name: "Tough Crowd", desc: "Close a deal on Hard." },
    { id: "rival", icon: "🥇", name: "Top Dog", desc: "Win a Rival Agents game." },
    { id: "team", icon: "🤝", name: "Team Player", desc: "Close a deal in Team Brokerage mode." },
    { id: "cities", icon: "🗺️", name: "Coast to Coast", desc: "Close a deal in all 8 cities." },
    { id: "trap", icon: "🪤", name: "Rookie Mistake", desc: "Present a home that's already under contract. Oops." },
  ];
  UI.unlock = function (id) {
    if (UI.career.ach[id]) return;
    const a = UI.ACH.find((x) => x.id === id);
    if (!a) return;
    UI.career.ach[id] = Date.now();
    UI.saveCareer();
    const now = Date.now();
    UI._achAt = Math.max(now + 900, (UI._achAt || 0) + 1600);
    setTimeout(() => { HH.sfx("success"); UI.toast(`<b>Achievement unlocked:</b> ${esc(a.name)}<br><span style="font-weight:500">${esc(a.desc)}</span>`, "gold", a.icon, 4500); }, UI._achAt - now);
  };

  // ---------- HUD ----------
  UI.hud = function (opts) {
    const G = HH.game;
    const r = G.round;
    const city = G.market ? G.market.city : null;
    const multi = G.mode !== "solo";
    const players = multi ? G.lobby.players : [];
    return `<div class="hud">
      <div class="hud-logo">🏠 <span>House Hunters</span></div>
      ${r ? `<div class="hud-round">Round <b>${r.num}</b> of ${r.total} · ${city ? esc(city.name + ", " + city.state) : ""} · ${HH.cap(r.diff)}${multi ? " · " + (r.gameMode === "coop" ? "Team Brokerage" : "Rival Agents") : ""}</div>` : ""}
      <div class="spacer"></div>
      ${opts && opts.step ? UI.hudSteps(opts.step) : ""}
      <div class="spacer"></div>
      ${opts && opts.extra ? opts.extra : ""}
      ${multi ? `<div class="hud-players">${players.map((p) => `<div class="hud-player ${G.status[p.id] === "done" ? "done" : ""}" style="--c:${p.color}" title="${esc(p.name)}${G.status[p.id] === "done" ? " (ready)" : ""}">${UI.avatar(p)}</div>`).join("")}</div>` : ""}
      ${multi ? `<button class="btn btn-sm btn-navy icon-btn" data-chat>💬 Chat${G.unread ? `<span class="unread-dot">${G.unread}</span>` : ""}</button>` : ""}
      ${r && r.durationMs && !(opts && opts.noTimer) ? `<div class="timer" data-timer>--:--</div>` : ""}
      <button class="btn btn-sm btn-ghost" style="color:#fff" data-menu title="Menu">☰</button>
    </div>`;
  };
  // the three phases of every round, so players always know where they are
  const STEPS = [["meet", "Meet the client"], ["search", "Pick up to 3 homes"], ["show", "Showing day"]];
  UI.hudSteps = function (cur) {
    const i = STEPS.findIndex((s) => s[0] === cur);
    const picks = HH.game ? HH.game.picks.length : 0;
    return `<div class="hud-steps">${STEPS.map((s, j) => `<span class="hs ${j < i ? "done" : j === i ? "on" : ""}"><b>${j < i ? "✓" : j + 1}</b>${s[1]}${s[0] === "search" && j === i ? ` <em data-hud-picks>⭐ ${picks}/3</em>` : ""}</span>`).join(`<i class="hs-sep">›</i>`)}</div>`;
  };
  UI.bindHud = function (root) {
    const chatBtn = root.querySelector("[data-chat]");
    if (chatBtn) chatBtn.addEventListener("click", () => UI.toggleChat(root));
    const menuBtn = root.querySelector("[data-menu]");
    if (menuBtn) menuBtn.addEventListener("click", () => UI.gameMenu());
    UI.tickTimer();
  };
  UI.refreshHudPlayers = function () {
    const G = HH.game;
    HH.$$(".hud-players").forEach((el) => {
      el.innerHTML = G.lobby.players.map((p) => `<div class="hud-player ${G.status[p.id] === "done" ? "done" : ""}" style="--c:${p.color}" title="${esc(p.name)}">${UI.avatar(p)}</div>`).join("");
    });
    HH.$$("[data-chat]").forEach((b) => { b.innerHTML = `💬 Chat${G.unread ? `<span class="unread-dot">${G.unread}</span>` : ""}`; });
  };

  // timer loop
  let lastWarn = 0;
  UI.tickTimer = function () {
    const G = HH.game;
    const els = HH.$$("[data-timer]");
    if (!G.round || !G.round.durationMs || !els.length) return;
    const left = G.round.deadline - Date.now();
    const text = HH.fmtTime(left);
    els.forEach((el) => {
      el.textContent = "⏱ " + text;
      el.classList.toggle("warn", left < 60000 && left >= 20000);
      el.classList.toggle("crit", left < 20000);
    });
    const sec = Math.ceil(left / 1000);
    if ((sec === 60 || sec === 30 || (sec <= 10 && sec > 0)) && sec !== lastWarn && (G.phase === "search" || G.phase === "meeting")) {
      lastWarn = sec;
      HH.sfx(sec <= 10 ? "tick" : "warn");
      if (sec === 60) UI.toast("One minute left! Lock in your picks.", "", "⏰");
    }
  };
  setInterval(() => { UI.tickTimer(); HH.game && HH.game.tick && HH.game.tick(); }, 250);

  UI.gameMenu = function () {
    const G = HH.game;
    const multi = G.mode !== "solo";
    const m = UI.modal({
      title: "Paused" + (multi ? " (the game keeps running)" : ""),
      body: `<div class="settings-grid">${UI.audioControls()}
        <p class="muted small">${multi ? `Lobby code: <b>${esc(HH.net.code || "")}</b>` : "Solo game. The timer keeps running while this menu is open."}</p></div>`,
      foot: `<button class="btn btn-ghost" data-help>How to play</button><span class="spacer"></span><button class="btn btn-danger" data-quit>${G.mode === "host" ? "End game for everyone" : "Quit to menu"}</button><button class="btn btn-primary" data-close>Resume</button>`,
    });
    UI.bindAudioControls(m.el);
    m.el.querySelector("[data-help]").addEventListener("click", () => UI.help());
    m.el.querySelector("[data-quit]").addEventListener("click", () => {
      UI.confirm("Quit the game?", G.mode === "host" ? "This ends the game for all players in your lobby." : "Your progress in this round will be lost.", "Quit", () => { m.close(); G.quitToMenu(); }, true);
    });
  };

  UI.audioControls = function () {
    const s = HH.audioSettings;
    return `<div class="opt"><label class="field">Sound effects</label><input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-aud="sfx" style="width:100%"></div>
      <div class="opt"><label class="field">Music</label><input type="range" min="0" max="1" step="0.05" value="${s.music}" data-aud="music" style="width:100%"></div>
      <label class="row small"><input type="checkbox" data-aud-mute ${s.muted ? "checked" : ""}> Mute everything</label>`;
  };
  UI.bindAudioControls = function (root) {
    HH.$$("[data-aud]", root).forEach((inp) => inp.addEventListener("input", () => HH.setAudio({ [inp.dataset.aud]: parseFloat(inp.value) })));
    const mute = root.querySelector("[data-aud-mute]");
    if (mute) mute.addEventListener("change", () => { HH.setAudio({ muted: mute.checked }); UI.refreshSoundToggle(); });
  };
  UI.refreshSoundToggle = function () {
    const b = $("#sound-toggle");
    if (b) b.textContent = HH.audioSettings.muted ? "🔇" : "🔊";
  };

  // ---------- chat ----------
  UI.chatLog = [];
  UI.addChat = function (m) {
    UI.chatLog.push(m);
    if (UI.chatLog.length > 200) UI.chatLog.shift();
    HH.$$(".chat-log").forEach((log) => { log.insertAdjacentHTML("beforeend", UI.chatLine(m)); log.scrollTop = log.scrollHeight; });
    const open = $(".drawer") || (UI.current === "lobby");
    if (!open && !m.sys && m.from !== HH.net.myId) { HH.game.unread++; UI.refreshHudPlayers(); HH.sfx("pop"); }
  };
  UI.chatLine = (m) => m.sys ? `<div class="chat-msg sys">${esc(m.text)}</div>` : `<div class="chat-msg" style="--c:${esc(m.color || "#1d2b4f")}"><b>${esc(m.name)}:</b> ${esc(m.text)}</div>`;
  UI.chatBox = () => `<div class="chat"><div class="chat-log">${UI.chatLog.map(UI.chatLine).join("")}</div>
    <form class="chat-form" data-chat-form><input class="input" maxlength="200" placeholder="Say something…" autocomplete="off"><button class="btn btn-sm btn-navy">Send</button></form></div>`;
  UI.bindChat = function (root) {
    HH.$$("[data-chat-form]", root).forEach((f) => f.addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = f.querySelector("input");
      const text = inp.value.trim();
      if (!text) return;
      HH.net.send({ t: "chat", text: text.slice(0, 200) });
      inp.value = "";
    }));
    HH.$$(".chat-log", root).forEach((l) => (l.scrollTop = l.scrollHeight));
  };
  UI.toggleChat = function (root) {
    const ex = $(".drawer");
    if (ex) { ex.remove(); return; }
    HH.game.unread = 0;
    UI.refreshHudPlayers();
    const d = HH.frag(`<div class="drawer"><h4>💬 Lobby chat <button class="btn btn-xs btn-ghost" style="margin-left:auto" data-x>✕</button></h4>${UI.chatBox()}</div>`);
    (HH.$(".screen.active") || document.body).appendChild(d);
    d.querySelector("[data-x]").addEventListener("click", () => d.remove());
    UI.bindChat(d);
    const inp = d.querySelector("input");
    if (inp) inp.focus();
  };

  // ---------- confetti ----------
  UI.confetti = function () {
    if (UI.prefs.reducedMotion) return;
    const c = HH.frag(`<div class="confetti"></div>`);
    const colors = ["#e85d3f", "#f4b63f", "#2a9d8f", "#3b6fd8", "#7b5cd6", "#2f9e5b"];
    for (let i = 0; i < 120; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 2.2 + Math.random() * 2.2 + "s";
      p.style.animationDelay = Math.random() * 0.8 + "s";
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      c.appendChild(p);
    }
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 5500);
  };

  UI.starsHtml = (n) => `<span class="stars">${[1, 2, 3, 4, 5].map((i) => `<span class="${i <= n ? "on" : ""}">★</span>`).join("")}</span>`;
  UI.countUp = function (el, to, ms) {
    const start = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - start) / ms);
      el.textContent = HH.money(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  UI.scoreClass = (s) => (s >= 75 ? "g" : s >= 55 ? "m" : "b");

  // ---------- coach marks (first-time guided tips) ----------
  // UI.coach(id, selector, html, opts) shows a speech bubble pointing at an element, once per id.
  // Tips queue up and show one at a time. Players can turn them off; Settings can bring them back.
  if (UI.prefs.tips === undefined) UI.prefs.tips = true;
  if (!UI.prefs.coach) UI.prefs.coach = {};
  const coachQ = [];
  let coachCur = null, coachLoop = null;
  UI.coach = function (id, sel, html, opts) {
    opts = opts || {};
    if (!UI.prefs.tips || UI.prefs.coach[id]) return;
    if ((coachCur && coachCur.id === id) || coachQ.some((c) => c.id === id)) return;
    coachQ.push({ id, sel, html, opts, screen: UI.current });
    if (!coachCur) setTimeout(nextCoach, opts.delay || 350);
  };
  UI.coach.done = function (id) {
    if (!UI.prefs.coach[id]) { UI.prefs.coach[id] = 1; UI.savePrefs(); }
    const qi = coachQ.findIndex((c) => c.id === id);
    if (qi >= 0) coachQ.splice(qi, 1);
    if (coachCur && coachCur.id === id) closeCoach(true);
  };
  UI.coach.clear = function () { coachQ.length = 0; closeCoach(false); };
  UI.coach.reset = function () { UI.prefs.coach = {}; UI.prefs.tips = true; UI.savePrefs(); };
  function closeCoach(advance) {
    if (coachCur) { coachCur.el.remove(); coachCur.ring.remove(); }
    coachCur = null;
    clearInterval(coachLoop);
    if (advance && coachQ.length) setTimeout(nextCoach, 250);
  }
  function nextCoach() {
    if (coachCur || !coachQ.length || !UI.prefs.tips) return;
    const c = coachQ.shift();
    if (UI.prefs.coach[c.id] || (c.screen && c.screen !== UI.current)) return nextCoach();
    const last = !coachQ.length;
    const el = HH.frag(`<div class="coach" role="dialog" aria-live="polite"><div class="coach-arrow"></div>
      <div class="coach-text">${c.html}</div>
      <div class="coach-foot"><button class="coach-off" data-off>Turn off tips</button><span class="spacer"></span><button class="btn btn-sm btn-primary" data-ok>${c.opts.button || (last ? "Got it" : "Next ▸")}</button></div></div>`);
    const ring = HH.frag(`<div class="coach-ring"></div>`);
    document.body.appendChild(ring);
    document.body.appendChild(el);
    coachCur = { id: c.id, el, ring, sel: c.sel, screen: c.screen };
    el.querySelector("[data-ok]").addEventListener("click", () => { HH.sfx("click"); UI.coach.done(c.id); });
    el.querySelector("[data-off]").addEventListener("click", () => { UI.prefs.tips = false; UI.savePrefs(); UI.coach.clear(); UI.toast("Tips are off. You can turn them back on in Settings.", "", "💡"); });
    const place = () => {
      if (!coachCur) return;
      if (coachCur.screen && coachCur.screen !== UI.current) { UI.coach.clear(); return; }
      const t = typeof coachCur.sel === "string" ? HH.$(coachCur.sel) : null;
      const r = t && t.getBoundingClientRect();
      const present = r && r.width > 0 && r.height > 0;
      const visible = present && !HH.$(".modal-back");
      el.style.visibility = ring.style.visibility = visible ? "visible" : "hidden";
      // if the thing a tip points at goes away (e.g. the dialogue moved on), skip it for now; it can show again later
      if (!present) { coachCur.missing = coachCur.missing || Date.now(); if (Date.now() - coachCur.missing > 1500) closeCoach(true); return; }
      coachCur.missing = 0;
      if (!visible) return;
      if (!coachCur.scrolled) { coachCur.scrolled = true; try { t.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) { /* old browsers */ } return place(); }
      const pad = 6;
      Object.assign(ring.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
      const bw = el.offsetWidth, bh = el.offsetHeight, vw = innerWidth, vh = innerHeight, gap = 16;
      let side = c.opts.side;
      if (!side) side = r.bottom + gap + bh < vh ? "below" : r.top - gap - bh > 0 ? "above" : r.left - gap - bw > 0 ? "left" : "right";
      let x, y;
      const ax = c.opts.align === "end" ? r.right - bw : c.opts.align === "start" ? r.left : r.left + r.width / 2 - bw / 2;
      if (side === "below") { x = ax; y = r.bottom + gap; }
      else if (side === "above") { x = ax; y = r.top - gap - bh; }
      else if (side === "left") { x = r.left - gap - bw; y = r.top + r.height / 2 - bh / 2; }
      else { x = r.right + gap; y = r.top + r.height / 2 - bh / 2; }
      x = Math.max(10, Math.min(vw - bw - 10, x));
      y = Math.max(10, Math.min(vh - bh - 10, y));
      el.style.left = x + "px"; el.style.top = y + "px";
      el.dataset.side = side;
      const ar = el.querySelector(".coach-arrow");
      if (side === "below" || side === "above") { ar.style.left = Math.max(16, Math.min(bw - 16, r.left + r.width / 2 - x)) + "px"; ar.style.top = ""; }
      else { ar.style.top = Math.max(16, Math.min(bh - 16, r.top + r.height / 2 - y)) + "px"; ar.style.left = ""; }
    };
    place();
    coachLoop = setInterval(place, 200);
  }
  HH.on("screen", () => { if (coachCur && coachCur.screen && coachCur.screen !== UI.current) UI.coach.clear(); });

  // Street View / maps embeds (keyless Google Maps embeds)
  UI.streetViewUrl = (L) => `https://www.google.com/maps/embed?pb=!6m7!1m6!2m2!1d${L.svLat}!2d${L.svLng}!3f${L.svHeading}!4f2!5f0.9`;
  UI.mapEmbedUrl = (L, sat) => `https://maps.google.com/maps?q=${L.lat},${L.lng}&z=${sat ? 19 : 15}&t=${sat ? "k" : "m"}&output=embed`;
  UI.mapsLink = (L) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${L.svLat},${L.svLng}&heading=${L.svHeading}`;
})(window.HH);
