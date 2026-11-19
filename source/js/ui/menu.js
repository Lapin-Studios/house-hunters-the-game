// Title screen, setup dialogs, settings, career, help and the multiplayer lobby.
(function (HH) {
  "use strict";
  const UI = HH.ui, esc = HH.esc, $ = HH.$;
  const G = () => HH.game;

  const LOGO_SVG = `<svg viewBox="0 0 64 64" width="54" height="54"><path d="M8 30 L32 10 L56 30" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 27 V52 H49 V27" fill="#fff"/><rect x="27" y="36" width="10" height="16" rx="2" fill="#e85d3f"/><circle cx="46" cy="16" r="6" fill="#ffd166"/><path d="M42 22 l-6 6" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/></svg>`;
  UI.LOGO_SVG = LOGO_SVG;

  UI.menu = {};
  let streetBuilt = false;

  UI.menu.renderTitle = function () {
    const el = $("#screen-title");
    const career = UI.career;
    const rank = UI.rankFor(career.earnings);
    el.innerHTML = `
      <button id="sound-toggle" class="btn btn-sm sound-toggle" title="Mute / unmute">${HH.audioSettings.muted ? "🔇" : "🔊"}</button>
      <div class="title-sun"></div>
      <div class="title-street"><div class="title-street-track" id="title-track"></div></div>
      <div class="title-wrap">
        <div class="logo"><div class="logo-mark">${LOGO_SVG}</div><h1>House Hunters</h1><div class="sub">THE GAME</div></div>
        <p class="tagline">Meet picky buyers, dig through listings on <b>real streets</b> with Google Street View, and find them <i>the one</i>. Solo, or against your friends.</p>
        <div class="title-grid">
          <div class="agent-card">
            <h3>🪪 Your agent</h3>
            <div class="agent-id"><div class="avatar-wrap" id="title-avatar">${UI.avatar(UI.profile)}</div>
              <div style="flex:1"><label class="field" for="agent-name">Agent name</label><input id="agent-name" class="input" maxlength="18" value="${esc(UI.profile.name)}" autocomplete="off"></div></div>
            <label class="field">Agent color</label>
            <div class="swatches">${UI.COLORS.map((c) => `<button class="swatch ${c === UI.profile.color ? "on" : ""}" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join("")}</div>
            <div class="rank-line">${rank.cur.icon} <b>${rank.cur.name}</b> · ${HH.money(career.earnings)} earned
              <div class="rank-bar"><i style="width:${Math.round(rank.pct * 100)}%"></i></div>
              <span class="muted small">${rank.next ? `${HH.money(rank.next.at - career.earnings)} to ${rank.next.name}` : "Top rank reached!"}</span></div>
          </div>
          <div>
            <div class="menu-buttons">
              <button class="menu-btn primary" data-act="solo"><div class="mi">🏠</div><div><b>Play Solo</b><span>Help buyers find their dream homes and build your career</span></div></button>
              <button class="menu-btn" data-act="host"><div class="mi" style="background:#dff3ef">🎉</div><div><b>Host a Lobby</b><span>Get a code and invite your friends</span></div></button>
              <button class="menu-btn" data-act="join"><div class="mi" style="background:#e3ecff">🔗</div><div><b>Join a Lobby</b><span>Enter a friend's 5-letter code</span></div></button>
            </div>
            <div class="menu-small">
              <button class="btn" data-act="daily">📅 Daily client${HH.store.get("daily", {})[HH.dateKey()] ? " ✓" : `<span class="new-dot"></span>`}</button>
              <button class="btn" data-act="help">📖 How to play</button>
              <button class="btn" data-act="career">🏆 Career &amp; awards</button>
              <button class="btn" data-act="settings">⚙️ Settings</button>
            </div>
          </div>
        </div>
      </div>
      <div class="title-foot">Street View &amp; maps © Google · Home locations © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · All listings, prices and people are fictional.</div>`;
    buildStreet();
    const nameInp = $("#agent-name");
    nameInp.addEventListener("input", () => { UI.profile.name = UI.cleanName(nameInp.value); UI.saveProfile(); $("#title-avatar").innerHTML = UI.avatar(UI.profile); });
    nameInp.addEventListener("blur", () => { nameInp.value = UI.profile.name; });
    HH.$$(".swatch", el).forEach((b) => b.addEventListener("click", () => {
      UI.profile.color = b.dataset.color; UI.saveProfile(); HH.sfx("click");
      HH.$$(".swatch", el).forEach((x) => x.classList.toggle("on", x === b));
      $("#title-avatar").innerHTML = UI.avatar(UI.profile);
    }));
    $("#sound-toggle").addEventListener("click", () => { HH.setAudio({ muted: !HH.audioSettings.muted }); UI.refreshSoundToggle(); HH.sfx("click"); });
    HH.$$("[data-act]", el).forEach((b) => b.addEventListener("click", () => {
      HH.sfx("click");
      const a = b.dataset.act;
      if (a === "solo") UI.menu.soloSetup();
      if (a === "host") UI.menu.host();
      if (a === "join") UI.menu.join();
      if (a === "help") UI.help();
      if (a === "daily") UI.menu.daily();
      if (a === "career") UI.menu.career();
      if (a === "settings") UI.menu.settings();
    }));
    if (!UI.prefs.seenHelp) { UI.prefs.seenHelp = true; UI.savePrefs(); setTimeout(() => UI.welcome(), 400); }
  };

  // short, visual first-run welcome (the full rules live in "How to play")
  UI.welcome = function () {
    const m = UI.modal({
      title: "👋 Welcome to House Hunters!", size: "wide",
      body: `<p class="muted" style="margin-top:0">You're a real estate agent. Every round goes like this:</p>
        <div class="welcome-steps">
          <div class="ws"><div class="wn">1</div><div class="wi">🤝</div><b>Meet</b><span>A client tells you their budget, area and must-haves. Some wants stay secret unless you ask.</span></div>
          <div class="ws"><div class="wn">2</div><div class="wi">💻</div><b>Search</b><span>Browse listings on real streets with Google Street View, using filters to narrow them down.</span></div>
          <div class="ws"><div class="wn">3</div><div class="wi">⭐</div><b>Pick 3</b><span>Choose up to three homes you think they'll love, best one first.</span></div>
          <div class="ws"><div class="wn">4</div><div class="wi">🔑</div><b>Close</b><span>Tour the homes together. If they buy one, you earn the commission!</span></div>
        </div>
        <p class="small muted" style="margin-bottom:0">Tips pop up the first time you see each screen, pointing out what to do next. You can turn them off anytime.</p>`,
      foot: `<button class="btn btn-ghost" data-close>I'll look around first</button><button class="btn btn-primary btn-lg" data-first>Meet my first client ▸</button>`,
    });
    m.el.querySelector("[data-first]").addEventListener("click", () => {
      m.close();
      HH.sfx("doorbell");
      G().startSolo({ diff: "easy", city: "random", rounds: 1, timer: 0 });
    });
  };

  function buildStreet() {
    const track = $("#title-track");
    if (!track) return;
    const ids = HH_WORLD.cities.map((c) => c.id);
    const cityId = ids[Math.floor(Math.random() * ids.length)];
    const m = HH.generateMarket(cityId, HH.randomSeed());
    const picks = HH.rng(HH.randomSeed()).shuffle(m.listings.filter((l) => l.type === "house")).slice(0, 7);
    const one = picks.map((L) => HH.art.house(L, { noSky: true })).join("");
    track.innerHTML = one + one;
    streetBuilt = true;
  }

  // ---------- daily client ----------
  UI.menu.daily = function () {
    const day = HH.dateKey();
    const done = HH.store.get("daily", {})[day];
    const streak = UI.dailyStreak ? UI.dailyStreak() : 0;
    const m = UI.modal({
      title: "📅 Daily Client",
      body: `<p style="margin-top:0">Every day there's one new client, and <b>everyone gets the same one</b>: same city, same homes, same secrets. Normal difficulty with a 10-minute timer.</p>
        ${done ? `<div class="first-note">✅ You already played today: ${done.won ? "sold" : "no sale"}, ${done.stars}★, ${HH.money(done.earned)}. Replays are just practice; your first result is the one that counts.</div>`
          : `<p class="muted small">Your first attempt is your official result. Afterwards, copy it and challenge your friends!</p>`}
        ${streak ? `<p class="small" style="margin-bottom:0">🔥 Streak: <b>${HH.plural(streak, "day")}</b> in a row</p>` : ""}`,
      foot: `<button class="btn btn-ghost" data-close>Not now</button><button class="btn btn-primary btn-lg" data-go>${done ? "Practice again ▸" : "Meet today's client ▸"}</button>`,
    });
    m.el.querySelector("[data-go]").addEventListener("click", () => {
      m.close();
      HH.sfx("doorbell");
      G().startSolo({ diff: "normal", city: "random", rounds: 1, timer: 10, daily: day });
    });
  };

  // ---------- solo ----------
  UI.menu.soloSetup = function () {
    const newbie = UI.career.rounds < 2 && !HH.store.get("soloSettings", null);
    const s = Object.assign(newbie ? { diff: "easy", city: "random", rounds: 3, timer: 0 } : { diff: "normal", city: "random", rounds: 3, timer: 8 }, HH.store.get("soloSettings", {}));
    const DIFF_DESC = {
      easy: "Clients tell you everything up front, budgets have breathing room, and you get a brief-to-filters button.",
      normal: "Some preferences are hidden — ask the right 3 questions. Budgets are tighter.",
      hard: "Lots of hidden wants, complications and razor-thin budgets. Only a few homes will work.",
    };
    const m = UI.modal({
      title: "🏠 New solo game",
      body: `<div class="settings-grid">
        ${newbie ? `<div class="first-note">👋 New here? <b>Easy</b> with <b>no timer</b> is the best way to learn the ropes.</div>` : ""}
        ${segOpt("Difficulty", "diff", [["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]], s.diff)}
        <div class="desc muted small" data-desc>${DIFF_DESC[s.diff]}</div>
        <div class="opt"><label class="field">City</label><select class="select" data-k="city">${cityOptions(s.city)}</select></div>
        ${segOpt("Clients (rounds)", "rounds", [[1, "1"], [3, "3"], [5, "5"], [8, "8"]], s.rounds)}
        ${segOpt("Timer per client", "timer", [[0, "Off"], [5, "5 min"], [8, "8 min"], [10, "10 min"], [15, "15 min"]], s.timer)}
        <p class="muted small">Tip: finishing early with a sale earns a speed bonus when the timer is on.</p>
      </div>`,
      foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary btn-lg" data-go>Start ▸</button>`,
    });
    bindSegs(m.el, s, (k) => { if (k === "diff") m.el.querySelector("[data-desc]").textContent = DIFF_DESC[s.diff]; });
    m.el.querySelector("[data-k=city]").addEventListener("change", (e) => (s.city = e.target.value));
    m.el.querySelector("[data-go]").addEventListener("click", () => {
      HH.store.set("soloSettings", s);
      m.close();
      HH.sfx("doorbell");
      G().startSolo(s);
    });
  };

  function segOpt(label, key, opts, val) {
    return `<div class="opt"><label class="field">${label}</label><div class="seg" data-seg="${key}">${opts.map(([v, t]) => `<button type="button" data-v="${v}" class="${String(v) === String(val) ? "on" : ""}">${t}</button>`).join("")}</div></div>`;
  }
  function bindSegs(root, state, onChange) {
    HH.$$("[data-seg]", root).forEach((seg) => {
      seg.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-v]");
        if (!b || seg.classList.contains("disabled")) return;
        const k = seg.dataset.seg;
        const v = b.dataset.v;
        state[k] = /^\d+$/.test(v) ? parseInt(v, 10) : v;
        HH.$$("button", seg).forEach((x) => x.classList.toggle("on", x === b));
        HH.sfx("click");
        if (onChange) onChange(k, state[k]);
      });
    });
  }
  function cityOptions(sel) {
    return `<option value="random" ${sel === "random" ? "selected" : ""}>🎲 Random city each round</option>` +
      HH_WORLD.cities.map((c) => `<option value="${c.id}" ${sel === c.id ? "selected" : ""}>${esc(c.name)}, ${c.state}</option>`).join("");
  }

  // ---------- host / join ----------
  UI.menu.host = function () {
    if (!HH.net.available()) return UI.modal({ title: "Multiplayer unavailable", body: `<p>The multiplayer library couldn't load. Check your internet connection and reload the page.</p>`, foot: `<button class="btn btn-primary" data-close>OK</button>` });
    const m = UI.modal({ title: "Creating your lobby…", body: `<div style="text-align:center;padding:10px 0 4px"><div class="spinner"></div><p class="muted">Connecting to the matchmaking server…</p></div>`, noClose: true });
    G().hostLobby().then(() => { m.close(); HH.sfx("join"); }).catch((e) => {
      m.close();
      UI.modal({ title: "Couldn't create a lobby", body: `<p>${esc(e.message)}</p>`, foot: `<button class="btn btn-primary" data-close>OK</button>` });
    });
  };

  UI.menu.join = function (prefill) {
    if (!HH.net.available()) return UI.modal({ title: "Multiplayer unavailable", body: `<p>The multiplayer library couldn't load. Check your internet connection and reload the page.</p>`, foot: `<button class="btn btn-primary" data-close>OK</button>` });
    const m = UI.modal({
      title: "🔗 Join a lobby",
      body: `<p class="muted">Ask the host for their 5-character lobby code.</p>
        <input class="input" data-code maxlength="6" placeholder="ABCDE" value="${esc(prefill || "")}" style="font-family:var(--display);font-size:34px;letter-spacing:.3em;text-align:center;text-transform:uppercase;font-weight:700">
        <p class="small muted" style="margin-top:10px">Joining as <b>${esc(UI.profile.name)}</b>. You can change your name on the title screen.</p>
        <p class="small" data-err style="color:var(--red);font-weight:600;min-height:20px"></p>`,
      foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" data-go>Join ▸</button>`,
    });
    const inp = m.el.querySelector("[data-code]");
    const go = m.el.querySelector("[data-go]");
    const err = m.el.querySelector("[data-err]");
    inp.addEventListener("input", () => { inp.value = HH.net.normalizeCode(inp.value); });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go.click(); });
    go.addEventListener("click", () => {
      const code = HH.net.normalizeCode(inp.value);
      if (code.length !== 5) { err.textContent = "Lobby codes are 5 characters."; return; }
      go.disabled = true; go.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:3px;margin:0"></span> Connecting…`;
      err.textContent = "";
      G().joinLobby(code).then(() => { m.close(); HH.sfx("join"); }).catch((e) => {
        go.disabled = false; go.textContent = "Join ▸";
        err.textContent = e.message;
      });
    });
  };

  // ---------- settings ----------
  UI.menu.settings = function () {
    const p = UI.prefs;
    const m = UI.modal({
      title: "⚙️ Settings",
      body: `<div class="settings-grid">
        ${UI.audioControls()}
        ${segOpt("Text speed", "textSpeed", [[0, "Slow"], [1, "Normal"], [2, "Fast"], [3, "Instant"]], p.textSpeed)}
        <label class="row small"><input type="checkbox" data-rm ${p.reducedMotion ? "checked" : ""}> Reduce motion (fewer animations)</label>
        <div class="opt"><label class="field">Tutorial tips</label><div class="row" style="gap:10px;flex-wrap:wrap"><label class="row small"><input type="checkbox" data-tips ${p.tips ? "checked" : ""}> Show tips that point out what to do</label><button class="btn btn-sm" data-tips-reset>🎓 Show all tips again</button></div></div>
        <div class="opt"><label class="field">Progress</label><button class="btn btn-sm btn-danger" data-reset>Reset career &amp; achievements</button></div>
        <p class="muted small">Street View works with no setup. Everything is saved in this browser only.</p>
      </div>`,
      foot: `<button class="btn btn-primary" data-close>Done</button>`,
    });
    UI.bindAudioControls(m.el);
    bindSegs(m.el, p, () => UI.savePrefs());
    m.el.querySelector("[data-rm]").addEventListener("change", (e) => { p.reducedMotion = e.target.checked; UI.savePrefs(); });
    m.el.querySelector("[data-tips]").addEventListener("change", (e) => { p.tips = e.target.checked; UI.savePrefs(); if (!p.tips) UI.coach.clear(); });
    m.el.querySelector("[data-tips-reset]").addEventListener("click", () => { UI.coach.reset(); m.el.querySelector("[data-tips]").checked = true; UI.toast("Tips will show again as you play.", "good", "🎓"); });
    m.el.querySelector("[data-reset]").addEventListener("click", () => UI.confirm("Reset your career?", "This erases your earnings, rank and achievements. It can't be undone.", "Reset", () => {
      UI.career = { earnings: 0, deals: 0, rounds: 0, starsSum: 0, starsN: 0, cities: {}, biggest: 0, streak: 0, bestStreak: 0, ach: {}, games: 0, wins: 0 };
      UI.saveCareer(); m.close(); UI.menu.renderTitle(); UI.toast("Career reset.", "", "🧹");
    }, true));
  };

  // ---------- career ----------
  UI.menu.career = function () {
    const c = UI.career;
    const rank = UI.rankFor(c.earnings);
    const got = Object.keys(c.ach).length;
    UI.modal({
      title: "🏆 Career & awards", size: "wide",
      body: `<div class="row" style="gap:16px;align-items:center;margin-bottom:14px"><div style="font-size:46px">${rank.cur.icon}</div><div style="flex:1"><div style="font-family:var(--display);font-size:24px;font-weight:600;color:var(--navy)">${rank.cur.name}</div>
          <div class="rank-bar"><i style="width:${Math.round(rank.pct * 100)}%"></i></div><div class="muted small">${rank.next ? `${HH.money(c.earnings)} / ${HH.money(rank.next.at)} to <b>${rank.next.name}</b>` : "You've reached the top. Legendary."}</div></div></div>
        <div class="stat-grid">
          <div class="stat"><b>${HH.money(c.earnings)}</b><span>Lifetime commission</span></div>
          <div class="stat"><b>${c.deals}</b><span>Homes sold</span></div>
          <div class="stat"><b>${c.starsN ? (c.starsSum / c.starsN).toFixed(1) + "★" : "—"}</b><span>Average review</span></div>
          <div class="stat"><b>${c.biggest ? HH.moneyShort(c.biggest) : "—"}</b><span>Biggest sale</span></div>
          <div class="stat"><b>${c.rounds}</b><span>Clients met</span></div>
          <div class="stat"><b>${c.bestStreak}</b><span>Best sale streak</span></div>
          <div class="stat"><b>${Object.keys(c.cities).length}/8</b><span>Cities with a sale</span></div>
          <div class="stat"><b>${c.wins}</b><span>Multiplayer wins</span></div>
        </div>
        <h3 style="font-family:var(--display);color:var(--navy);margin:18px 0 0;font-weight:600">Achievements (${got}/${UI.ACH.length})</h3>
        <div class="ach-grid">${UI.ACH.map((a) => `<div class="ach ${c.ach[a.id] ? "got" : ""}"><div class="ai">${a.icon}</div><div><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></div></div>`).join("")}</div>`,
      foot: `<button class="btn btn-primary" data-close>Close</button>`,
    });
  };

  // ---------- how to play ----------
  UI.help = function (first) {
    UI.modal({
      title: first ? "👋 Welcome, agent!" : "📖 How to play", size: "wide",
      body: `<div class="help">
        <p>You're a real estate agent. Each round a new client walks into your office. Your job: find them a home they'll actually buy.</p>
        <h3>1 · Meet the client 🤝</h3>
        <p>They'll tell you their budget, where they want to live, how big, and what they need. Everything goes into your <b>Client brief</b>. On Normal and Hard, some preferences are <b>hidden</b>: you get a few questions to dig them out. Listen for hints like <i>"Sorry, I smell like dog"</i> and ask about the right topic.</p>
        <h3>2 · Search Roofline 💻</h3>
        <p>Head to your computer and use <b>Roofline</b>, the listings site. Filter by price, beds, neighborhood, commute, features and more. On Easy and Normal, every listing shows whether it <b>fits the brief</b> so far. Search keywords in descriptions, open listings to read the <b>brief check</b> and <b>disclosures</b>, and check the real <b>Google Street View</b> of every home. Watch out for homes that are already <b>Pending</b>.</p>
        <h3>3 · Pick your top 3 ⭐</h3>
        <p>Add up to three homes to your shortlist and present them. Put your best pick first: the order breaks ties.</p>
        <h3>4 · Showing day 🚗</h3>
        <p>Tour the homes with your client and watch their reactions. Then they choose one, or none. If they buy, you earn a <b>2.5% commission</b>, plus bonuses for speed and 5-star reviews.</p>
        <h3>Multiplayer 🎉</h3>
        <ul>
          <li><b>Rival Agents:</b> everyone gets the same client and races to present the best homes. The client buys from whoever brings the best match; if two agents show the same house, the one who submitted first wins.</li>
          <li><b>Team Brokerage:</b> co-op. Share one shortlist and one set of questions, and split the commission.</li>
          <li>Click <b>Host a Lobby</b> to get a 5-character code, then send it to friends so they can <b>Join</b>. Everyone needs this game open in their browser (see README for easy hosting).</li>
        </ul>
        <h3>Brief legend</h3>
        <div class="legend-row"><span><b style="color:var(--red)">Must-have</b>: required</span><span><b style="color:var(--purple)">Dealbreaker</b>: instant no</span><span><b style="color:var(--teal)">Nice-to-have</b>: bonus points</span></div>
        <p class="muted small" style="margin-top:14px">Home locations are real houses from OpenStreetMap, shown with Google Street View. All listing details, prices and people are fictional.</p>
      </div>`,
      foot: `<button class="btn btn-primary" data-close>${first ? "Let's go!" : "Got it"}</button>`,
    });
  };

  // ==========================================================================
  // Lobby
  // ==========================================================================
  UI.lobby = {};
  const MODE_DESC = {
    versus: "Everyone gets the same client and races to find the best homes. The client buys from whoever brings the best match (earliest submission wins ties).",
    coop: "Work together! One shared shortlist of 3 homes, shared questions, and a shared commission.",
  };
  UI.lobby.render = function () {
    const g = G();
    const el = $("#screen-lobby");
    const host = g.mode === "host";
    if (UI.current !== "lobby" || !el.querySelector(".lobby-wrap")) {
      el.innerHTML = `<div class="lobby-wrap">
        <div class="lobby-head"><h2>🏢 Lobby</h2>
          <div class="code-box"><div><small>Lobby code</small><div class="code">${esc(g.lobby.code || HH.net.code || "")}</div></div><button class="btn btn-sm" data-copy>📋 Copy</button>${/^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ? `<button class="btn btn-sm" data-copy-link>🔗 Invite link</button>` : ""}</div>
          <div class="spacer"></div><button class="btn btn-sm" data-help>📖 How to play</button><button class="btn btn-sm btn-danger" data-leave>${host ? "Close lobby" : "Leave"}</button></div>
        <div class="panel"><h3>👥 Agents <span class="muted small" data-count></span></h3><div class="player-list" data-players></div></div>
        <div class="panel"><h3>⚙️ Game settings ${host ? "" : `<span class="muted small" style="font-family:var(--ui);font-weight:500">(host decides)</span>`}</h3><div class="settings-grid" data-settings></div></div>
        <div class="panel" style="grid-column:1/-1"><h3>💬 Chat</h3>${UI.chatBox()}</div>
        <div class="lobby-actions" data-actions></div>
      </div>`;
      UI.show("lobby");
      UI.bindChat(el);
      el.querySelector("[data-copy]").addEventListener("click", () => {
        const code = g.lobby.code || HH.net.code;
        const done = () => UI.toast(`Code <b>${esc(code)}</b> copied! Send it to your friends.`, "good", "📋");
        if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, () => UI.toast("Copy failed. The code is " + esc(code), "", "📋"));
        else UI.toast("The code is " + esc(code), "", "📋");
      });
      const linkBtn = el.querySelector("[data-copy-link]");
      if (linkBtn) linkBtn.addEventListener("click", () => {
        const url = location.origin + location.pathname + "?join=" + (g.lobby.code || HH.net.code);
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => UI.toast("Invite link copied! Friends who open it jump straight to your lobby.", "good", "🔗"), () => UI.toast(esc(url), "", "🔗", 8000));
        else UI.toast(esc(url), "", "🔗", 8000);
      });
      el.querySelector("[data-help]").addEventListener("click", () => UI.help());
      el.querySelector("[data-leave]").addEventListener("click", () => UI.confirm(host ? "Close the lobby?" : "Leave the lobby?", host ? "Everyone in the lobby will be disconnected." : "You can rejoin with the same code while the lobby is open.", host ? "Close lobby" : "Leave", () => g.quitToMenu(), true));
    }
    // players
    const ps = g.lobby.players;
    el.querySelector("[data-count]").textContent = `(${ps.length}/8)`;
    const me = g.myId();
    el.querySelector("[data-players]").innerHTML = ps.map((p) => `<div class="player-row"><div class="pav" style="--c:${p.color}">${UI.avatar(p)}</div><span class="pname">${esc(p.name)}</span>${p.host ? `<span class="badge">Host</span>` : ""}${p.id === me ? `<span class="badge you">You</span>` : ""}<span class="spacer"></span>${host && !p.host ? `<button class="btn btn-xs btn-ghost" data-kick="${esc(p.id)}" title="Remove">✕</button>` : ""}</div>`).join("") +
      (ps.length < 2 ? `<div class="player-row empty">Waiting for friends… share the code <b style="margin-left:4px">${esc(g.lobby.code || "")}</b></div>` : "");
    HH.$$("[data-kick]", el).forEach((b) => b.addEventListener("click", () => g.kick(b.dataset.kick)));
    // settings
    const s = g.lobby.settings;
    const sEl = el.querySelector("[data-settings]");
    sEl.innerHTML = `${segOpt("Mode", "gameMode", [["versus", "🥊 Rival Agents"], ["coop", "🤝 Team Brokerage"]], s.gameMode)}
      <div class="muted small" style="margin-top:-6px">${MODE_DESC[s.gameMode]}</div>
      ${segOpt("Difficulty", "diff", [["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]], s.diff)}
      <div class="opt"><label class="field">City</label><select class="select" data-k="city" ${host ? "" : "disabled"}>${cityOptions(s.city)}</select></div>
      ${segOpt("Rounds", "rounds", [[1, "1"], [3, "3"], [5, "5"], [8, "8"]], s.rounds)}
      ${segOpt("Timer per round", "timer", [[0, "Off"], [5, "5 min"], [8, "8 min"], [10, "10 min"], [15, "15 min"]], s.timer)}`;
    if (host) {
      const st = Object.assign({}, s);
      bindSegs(sEl, st, (k, v) => g.updateSettings({ [k]: v }));
      sEl.querySelector("[data-k=city]").addEventListener("change", (e) => g.updateSettings({ city: e.target.value }));
    } else HH.$$("[data-seg]", sEl).forEach((x) => { x.classList.add("disabled"); x.style.opacity = ".75"; });
    // actions
    el.querySelector("[data-actions]").innerHTML = host
      ? `<span class="note">${ps.length < 2 ? "You can start alone to test things out, but it's more fun with friends!" : `${ps.length} agents ready to hunt.`}</span><button class="btn btn-primary btn-lg" data-start>Start game ▸</button>`
      : `<span class="note">⏳ Waiting for the host to start the game…</span>`;
    const startBtn = el.querySelector("[data-start]");
    if (startBtn) startBtn.addEventListener("click", () => { HH.sfx("doorbell"); g.startGame(); });
  };
})(window.HH);
