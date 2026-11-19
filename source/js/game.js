// Game controller: lobby, rounds, submissions and scoring.
// Solo and multiplayer share one code path; in multiplayer the host is authoritative.
(function (HH) {
  "use strict";
  const net = HH.net;
  const UI = HH.ui;
  const MAX_PLAYERS = 8;
  const COMMISSION = 0.025;
  const DATA_SIG = HH.VERSION + ":" + HH_WORLD.cities.reduce((a, c) => a + c.hoods.reduce((b, h) => b + h.homes.length, 0), 0);

  const G = (HH.game = {
    mode: null, phase: "menu",
    lobby: { code: null, players: [], settings: null },
    round: null, market: null, client: null,
    revealed: {}, asked: [], questionsLeft: 0,
    picks: [], pickBy: {}, submitted: false, ready: false,
    status: {}, totals: {}, results: null, unread: 0,
    saved: new Set(), notes: "", lastCity: null,
    host: null, // host-only state
  });

  G.defaultSettings = () => Object.assign({ gameMode: "versus", diff: "normal", city: "random", rounds: 3, timer: 8 }, HH.store.get("lastSettings", {}));
  G.myId = () => (G.mode === "solo" ? "me" : net.myId);
  G.isHost = () => G.mode === "host" || G.mode === "solo";
  G.me = () => G.lobby.players.find((p) => p.id === G.myId()) || { id: G.myId(), name: UI.profile.name, color: UI.profile.color };
  G.player = (id) => G.lobby.players.find((p) => p.id === id);
  G.isCoop = () => G.round && G.round.gameMode === "coop";

  // ---------- entry points ----------
  G.startSolo = function (settings) {
    G.reset();
    G.mode = "solo";
    net.myId = "me";
    G.lobby = { code: null, players: [{ id: "me", name: UI.profile.name, color: UI.profile.color, host: true }], settings: Object.assign({}, settings, { gameMode: "versus" }) };
    G.totals = {};
    UI.career.games++; UI.saveCareer();
    G.hostStartRound(1);
  };

  G.hostLobby = async function () {
    G.reset();
    const code = await net.host();
    G.mode = "host";
    G.lobby = { code, players: [{ id: "host", name: UI.profile.name, color: UI.profile.color, host: true }], settings: G.defaultSettings() };
    G.phase = "lobby";
    UI.chatLog = [{ sys: true, text: `Lobby ${code} created. Share the code with your friends!` }];
    UI.lobby.render();
  };

  G.joinLobby = async function (code) {
    G.reset();
    await net.join(code);
    G.mode = "client";
    G.phase = "joining";
    UI.chatLog = [];
    net.send({ t: "hello", name: UI.profile.name, color: UI.profile.color, ver: DATA_SIG });
    return new Promise((resolve, reject) => {
      G._joinWait = { resolve, reject };
      setTimeout(() => { if (G._joinWait) { G._joinWait = null; net.close(true); G.mode = null; reject(new Error("The host didn't respond. Try again.")); } }, 10000);
    });
  };

  G.reset = function () {
    G.phase = "menu"; G.round = null; G.market = null; G.client = null; G.results = null;
    G.revealed = {}; G.asked = []; G.picks = []; G.pickBy = {}; G.submitted = false; G.ready = false;
    G.status = {}; G.unread = 0; G.saved = new Set(); G.notes = ""; G.host = null; G.totals = {};
  };

  G.quitToMenu = function (reason) {
    if (net.role) net.close();
    G.mode = null;
    G.reset();
    UI.closeModals();
    const d = HH.$(".drawer"); if (d) d.remove();
    UI.menu.renderTitle();
    UI.show("title");
    if (reason) UI.modal({ title: "Back at the office", body: `<p>${HH.esc(reason)}</p>`, foot: `<button class="btn btn-primary" data-close>OK</button>` });
  };

  // ---------- host: lobby management ----------
  function broadcastLobby() { net.broadcast({ t: "lobby", lobby: G.lobby }); }
  G.updateSettings = function (patch) {
    if (!G.isHost()) return;
    Object.assign(G.lobby.settings, patch);
    HH.store.set("lastSettings", G.lobby.settings);
    broadcastLobby();
  };
  function sysChat(text) { net.broadcast({ t: "chat", sys: true, text }); }

  function uniqueName(name, id) {
    let n = name, i = 2;
    while (G.lobby.players.some((p) => p.id !== id && p.name.toLowerCase() === n.toLowerCase())) n = `${name} (${i++})`;
    return n;
  }
  function freeColor(color) {
    const used = new Set(G.lobby.players.map((p) => p.color));
    if (!used.has(color)) return color;
    return UI.COLORS.find((c) => !used.has(c)) || color;
  }

  // ---------- host: rounds ----------
  G.hostStartRound = function (num) {
    const s = G.lobby.settings;
    let cityId = s.city;
    let seed = HH.randomSeed();
    if (s.daily) {
      // Daily Client: the same city, market and client for everyone on this date
      seed = HH.hash("hh-daily-" + s.daily);
      cityId = HH_WORLD.cities[seed % HH_WORLD.cities.length].id;
    } else if (cityId === "random") {
      const ids = HH_WORLD.cities.map((c) => c.id).filter((id) => id !== G.lastCity);
      cityId = ids[Math.floor(Math.random() * ids.length)];
    }
    G.lastCity = cityId;
    const now = new Date();
    const today = s.daily ? Date.UTC(+s.daily.slice(0, 4), +s.daily.slice(5, 7) - 1, +s.daily.slice(8, 10)) : Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const market = HH.generateMarket(cityId, seed, today);
    const round = { num, total: s.rounds, seed, cityId, diff: s.diff, gameMode: G.mode === "solo" ? "versus" : s.gameMode, durationMs: (s.timer || 0) * 60000, today, checksum: market.checksum, daily: s.daily || null };
    G.host = { subs: {}, coopReady: {}, team: [], shared: {}, sharedUsed: 0, open: true, startAt: Date.now(), deadline: round.durationMs ? Date.now() + round.durationMs : 0, players: G.lobby.players.map((p) => p.id) };
    G.lobby.players.forEach((p) => { if (!G.totals[p.id]) G.totals[p.id] = { earnings: 0, deals: 0, starsSum: 0, rounds: 0, best: 0 }; });
    net.broadcast({ t: "start", round, players: G.lobby.players, totals: G.totals });
  };

  function hostCheckAllIn() {
    const H = G.host;
    if (!H || !H.open) return;
    const ids = G.lobby.players.map((p) => p.id);
    if (G.round.gameMode === "coop") {
      if (ids.every((id) => H.coopReady[id]) && H.team.length) hostReveal();
    } else if (ids.every((id) => H.subs[id])) hostReveal();
  }

  function hostReveal() {
    const H = G.host;
    if (!H || !H.open) return;
    H.open = false;
    const subs = H.subs;
    const team = H.team.slice();
    const res = computeResults(subs, team);
    // update totals (authoritative)
    G.lobby.players.forEach((p) => {
      const t = G.totals[p.id] || (G.totals[p.id] = { earnings: 0, deals: 0, starsSum: 0, rounds: 0, best: 0 });
      const pr = res.perPlayer[p.id];
      if (!pr) return;
      t.rounds++;
      t.earnings += pr.earnings;
      if (pr.won) t.deals++;
      t.starsSum += pr.stars;
      t.best = Math.max(t.best, pr.bestScore);
    });
    net.broadcast({ t: "reveal", subs, team, totals: G.totals });
  }

  G.tick = function () {
    // host deadline enforcement (2.5s grace for auto-submits)
    if (G.isHost() && G.host && G.host.open && G.host.deadline && Date.now() > G.host.deadline + 2500) hostReveal();
    // local auto-submit at deadline
    if (G.round && G.round.durationMs && (G.phase === "meeting" || G.phase === "search") && Date.now() >= G.round.deadline) {
      if (G.isCoop()) { if (!G.ready) { G.setReady(true, true); UI.toast("Time's up! Presenting the team's picks.", "", "⏰"); } }
      else if (!G.submitted) { G.submit(true); UI.toast(G.picks.length ? "Time's up! Your picks were submitted." : "Time's up! You didn't pick any homes.", G.picks.length ? "" : "bad", "⏰"); }
    }
  };

  // ---------- results (deterministic on every peer) ----------
  function computeResults(subs, team) {
    const c = G.client, m = G.market, coop = G.round.gameMode === "coop";
    const entries = [];
    if (coop) team.forEach((p, i) => { if (m.byId[p.id]) entries.push({ pid: "team", by: p.by, id: p.id, at: 0, order: i }); });
    else Object.keys(subs).sort().forEach((pid) => (subs[pid].picks || []).forEach((id, i) => { if (m.byId[id]) entries.push({ pid, id, at: subs[pid].at, order: i }); }));
    entries.forEach((e) => { e.L = m.byId[e.id]; e.ev = HH.evaluate(c, e.L); });
    let best = null;
    entries.forEach((e) => {
      if (!e.ev.ok) return;
      if (!best || e.ev.score > best.ev.score || (e.ev.score === best.ev.score && (e.at < best.at || (e.at === best.at && e.order < best.order)))) best = e;
    });
    // best on the whole market
    let mBest = null;
    m.listings.forEach((L) => { const ev = HH.evaluate(c, L); if (ev.ok && (!mBest || ev.score > mBest.ev.score)) mBest = { L, ev }; });
    const perPlayer = {};
    const dur = G.round.durationMs;
    G.lobby.players.forEach((p) => {
      const mine = coop ? entries : entries.filter((e) => e.pid === p.id);
      const bestScore = mine.reduce((a, e) => Math.max(a, e.ev.ok ? e.ev.score : Math.min(e.ev.score, 44)), 0);
      const won = !!best && (coop || best.pid === p.id);
      let commission = 0, speed = 0, review = 0;
      if (won) {
        commission = Math.round(best.L.price * COMMISSION);
        const at = coop ? (subs.__coopAt != null ? subs.__coopAt : dur) : best.at;
        if (dur) speed = Math.round(commission * 0.1 * HH.clamp(1 - at / dur, 0, 1));
        if (HH.stars(best.ev.score, true) === 5) review = 1000;
      }
      const myBestEntry = mine.filter((e) => e.ev.ok).sort((a, b) => b.ev.score - a.ev.score)[0];
      // winners are graded on the sale; others on the quality of their best acceptable pick
      const stars = won ? HH.stars(best.ev.score, true) : myBestEntry ? Math.max(1, HH.stars(myBestEntry.ev.score, true) - 1) : HH.stars(bestScore, false);
      perPlayer[p.id] = { won, commission, speed, review, earnings: commission + speed + review, bestScore, stars, picks: mine, submittedAt: coop ? 0 : subs[p.id] ? subs[p.id].at : null, myBestEntry };
    });
    return { entries, best, marketBest: mBest, perPlayer, coop };
  }
  G.computeResults = computeResults;

  // ---------- player actions ----------
  G.ask = function (topic) {
    if (G.revealed[topic]) return;
    if (G.isCoop()) { net.send({ t: "ask", topic }); return; }
    if (G.questionsLeft <= 0) return;
    G.questionsLeft--;
    G.revealed[topic] = true;
    G.asked.push(topic);
    HH.emit("revealed", { topic, by: G.myId() });
  };

  G.togglePick = function (id) {
    const L = G.market.byId[id];
    if (!L) return;
    if (G.isCoop()) {
      const has = G.picks.indexOf(id) >= 0;
      if (!has && G.picks.length >= 3) { UI.toast("The team shortlist is full (3 homes). Remove one first.", "bad", "✋"); return; }
      net.send({ t: "pick", op: has ? "remove" : "add", id });
      return;
    }
    if (G.submitted) return;
    const i = G.picks.indexOf(id);
    if (i >= 0) { G.picks.splice(i, 1); HH.sfx("remove"); }
    else {
      if (G.picks.length >= 3) { UI.toast("You can only present 3 homes. Remove one first.", "bad", "✋"); return; }
      G.picks.push(id); HH.sfx("save");
    }
    HH.emit("picks");
  };
  G.movePick = function (id, dir) {
    if (G.isCoop()) { net.send({ t: "pick", op: dir < 0 ? "up" : "down", id }); return; }
    const i = G.picks.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= G.picks.length) return;
    [G.picks[i], G.picks[j]] = [G.picks[j], G.picks[i]];
    HH.emit("picks");
  };

  G.submit = function (auto) {
    if (G.submitted || G.isCoop()) return;
    G.submitted = true;
    G.phase = "waiting";
    net.send({ t: "submit", picks: G.picks.slice(0, 3) });
    HH.emit("submitted", { auto });
  };
  G.setReady = function (ready, auto) {
    G.ready = ready;
    if (ready) G.phase = "waiting";
    else G.phase = "search";
    net.send({ t: "coopReady", ready });
    HH.emit("submitted", { auto, ready });
  };

  // ---------- message handling ----------
  net.onMessage(function (msg, from) {
    const host = G.isHost();
    switch (msg.t) {
      // ===== host-side requests =====
      case "hello": {
        if (G.mode !== "host") return;
        if (from === "host") return;
        if (msg.ver !== DATA_SIG) return net.sendTo(from, { t: "reject", reason: "Your game version doesn't match the host's. Make sure everyone has the same copy of the game." });
        if (G.phase !== "lobby") return net.sendTo(from, { t: "reject", reason: "That game has already started. Ask the host to return to the lobby." });
        if (G.lobby.players.length >= MAX_PLAYERS) return net.sendTo(from, { t: "reject", reason: "That lobby is full (8 agents max)." });
        if (G.player(from)) return;
        const p = { id: from, name: uniqueName(UI.cleanName(msg.name), from), color: freeColor(/^#[0-9a-f]{6}$/i.test(msg.color) ? msg.color : UI.COLORS[0]) };
        G.lobby.players.push(p);
        net.sendTo(from, { t: "welcome", you: from, lobby: G.lobby, chat: UI.chatLog.slice(-30) });
        broadcastLobby();
        sysChat(`${p.name} joined the lobby.`);
        HH.sfx("join");
        return;
      }
      case "chat": {
        if (host && !msg.sys && msg.from === undefined) {
          const p = G.player(from);
          if (!p) return;
          const text = String(msg.text || "").slice(0, 200);
          if (!text.trim()) return;
          net.broadcast({ t: "chat", from, name: p.name, color: p.color, text });
          return;
        }
        UI.addChat(msg);
        return;
      }
      case "ask": {
        if (!host || !G.host || !G.isCoop()) return;
        const H = G.host;
        if (H.shared[msg.topic] || H.sharedUsed >= G.client.questions || !HH.TOPICS.some((t) => t.key === msg.topic)) return;
        H.shared[msg.topic] = true;
        H.sharedUsed++;
        net.broadcast({ t: "revealed", topic: msg.topic, by: from, left: G.client.questions - H.sharedUsed });
        return;
      }
      case "pick": {
        if (!host || !G.host || !G.host.open || !G.isCoop()) return;
        const H = G.host, T = H.team;
        const i = T.findIndex((p) => p.id === msg.id);
        if (msg.op === "add" && i < 0 && T.length < 3 && G.market.byId[msg.id]) T.push({ id: msg.id, by: from });
        else if (msg.op === "remove" && i >= 0) T.splice(i, 1);
        else if ((msg.op === "up" || msg.op === "down") && i >= 0) { const j = i + (msg.op === "up" ? -1 : 1); if (j >= 0 && j < T.length) [T[i], T[j]] = [T[j], T[i]]; }
        else return;
        // changing the list un-readies everyone
        Object.keys(H.coopReady).forEach((k) => (H.coopReady[k] = false));
        net.broadcast({ t: "team", team: T, status: {} });
        return;
      }
      case "submit": {
        if (!host || !G.host || !G.host.open || G.isCoop()) return;
        if (G.host.subs[from] || !G.player(from)) return;
        const picks = Array.isArray(msg.picks) ? msg.picks.filter((id, i, a) => typeof id === "string" && G.market.byId[id] && a.indexOf(id) === i).slice(0, 3) : [];
        G.host.subs[from] = { picks, at: Date.now() - G.host.startAt };
        net.broadcast({ t: "status", id: from, state: "done" });
        hostCheckAllIn();
        return;
      }
      case "coopReady": {
        if (!host || !G.host || !G.host.open || !G.isCoop()) return;
        G.host.coopReady[from] = !!msg.ready;
        if (msg.ready && G.lobby.players.every((p) => G.host.coopReady[p.id])) G.host.subs.__coopAt = Date.now() - G.host.startAt;
        net.broadcast({ t: "status", id: from, state: msg.ready ? "done" : "" });
        hostCheckAllIn();
        return;
      }

      // ===== from host to everyone =====
      case "welcome": {
        G.lobby = msg.lobby;
        G.phase = "lobby";
        UI.chatLog = (msg.chat || []).slice();
        if (G._joinWait) { G._joinWait.resolve(); G._joinWait = null; }
        UI.lobby.render();
        return;
      }
      case "reject": {
        if (G._joinWait) { G._joinWait.reject(new Error(msg.reason)); G._joinWait = null; }
        net.close(true);
        G.mode = null;
        return;
      }
      case "lobby": {
        G.lobby = msg.lobby;
        if (G.phase === "lobby") UI.lobby.render();
        else UI.refreshHudPlayers();
        return;
      }
      case "start": {
        startRoundLocal(msg);
        return;
      }
      case "revealed": {
        if (!G.client) return;
        G.revealed[msg.topic] = true;
        if (G.asked.indexOf(msg.topic) < 0) G.asked.push(msg.topic);
        G.questionsLeft = msg.left;
        HH.emit("revealed", { topic: msg.topic, by: msg.by });
        return;
      }
      case "team": {
        G.picks = msg.team.map((p) => p.id);
        G.pickBy = {};
        msg.team.forEach((p) => (G.pickBy[p.id] = p.by));
        if (G.ready) { G.ready = false; if (G.phase === "waiting") G.phase = "search"; HH.emit("submitted", { ready: false, reset: true }); }
        G.lobby.players.forEach((p) => { if (G.status[p.id] === "done") G.status[p.id] = ""; });
        UI.refreshHudPlayers();
        HH.emit("picks");
        return;
      }
      case "status": {
        G.status[msg.id] = msg.state;
        UI.refreshHudPlayers();
        HH.emit("status");
        return;
      }
      case "reveal": {
        if (!G.client) return;
        G.totals = msg.totals || G.totals;
        if (G.isCoop()) { G.picks = msg.team.map((p) => p.id); G.pickBy = {}; msg.team.forEach((p) => (G.pickBy[p.id] = p.by)); }
        G.results = computeResults(msg.subs || {}, msg.team || []);
        G.phase = "showing";
        UI.closeModals();
        const d = HH.$(".drawer"); if (d) d.remove();
        UI.showing.start();
        return;
      }
      case "final": {
        G.phase = "final";
        G.totals = msg.totals || G.totals;
        UI.closeModals();
        UI.results.renderFinal();
        return;
      }
      case "toLobby": {
        G.phase = "lobby";
        G.round = null; G.market = null; G.client = null; G.results = null; G.totals = {};
        UI.closeModals();
        UI.lobby.render();
        return;
      }
      case "end": case "kicked": {
        if (G.mode === "client") G.quitToMenu(msg.reason || "The game ended.");
        return;
      }
    }
  });

  net.onLeave(function (id) {
    if (G.mode !== "host") return;
    const p = G.player(id);
    if (!p) return;
    G.lobby.players = G.lobby.players.filter((x) => x.id !== id);
    if (G.host) { delete G.host.subs[id]; delete G.host.coopReady[id]; }
    broadcastLobby();
    sysChat(`${p.name} left the game.`);
    HH.sfx("leave");
    hostCheckAllIn();
  });
  net.onClosed(function (reason) {
    if (G.mode === "client") G.quitToMenu(reason);
  });

  function startRoundLocal(msg) {
    const r = msg.round;
    G.lobby.players = msg.players || G.lobby.players;
    G.totals = msg.totals || G.totals;
    G.round = Object.assign({}, r, { deadline: r.durationMs ? Date.now() + r.durationMs : 0 });
    try {
      G.market = HH.generateMarket(r.cityId, r.seed, r.today);
      G.client = HH.generateClient(G.market, r.seed, r.diff);
    } catch (e) {
      console.error(e);
      UI.toast("Something went wrong generating the round.", "bad", "⚠️");
      return;
    }
    if (r.checksum && G.market.checksum !== r.checksum) UI.toast("Heads up: your listings don't match the host's. Make sure everyone has the same version of the game.", "bad", "⚠️", 7000);
    G.revealed = {}; G.asked = []; G.questionsLeft = G.client.questions;
    G.picks = []; G.pickBy = {}; G.submitted = false; G.ready = false;
    G.status = {}; G.results = null; G.saved = new Set(); G.notes = "";
    G.phase = "meeting";
    UI.closeModals();
    const d = HH.$(".drawer"); if (d) d.remove();
    UI.meeting.start();
  }

  // ---------- host navigation after results ----------
  G.nextRound = function () {
    if (!G.isHost()) return;
    if (G.round.num >= G.round.total) { net.broadcast({ t: "final", totals: G.totals }); return; }
    G.hostStartRound(G.round.num + 1);
  };
  G.backToLobby = function () {
    if (G.mode !== "host") return;
    G.host = null;
    net.broadcast({ t: "toLobby" });
  };
  G.kick = function (id) {
    if (G.mode !== "host" || id === "host") return;
    net.kick(id, "The host removed you from the lobby.");
  };
  G.startGame = function () {
    if (G.mode !== "host") return;
    G.totals = {};
    sysChat("The game is starting. Good luck, agents!");
    G.hostStartRound(1);
  };
})(window.HH);
