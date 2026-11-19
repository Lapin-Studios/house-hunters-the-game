// Showing day, the client's decision, round results and final standings.
(function (HH) {
  "use strict";
  const UI = HH.ui, esc = HH.esc, $ = HH.$;
  const G = () => HH.game;

  UI.showing = {};
  let tour = [], idx = 0, typing = null, decided = false;

  function myEntries() {
    const g = G(), R = g.results;
    const pr = R.perPlayer[g.myId()];
    return pr ? pr.picks : [];
  }

  UI.showing.start = function () {
    if (UI.meeting && UI.meeting.stop) UI.meeting.stop();
    const g = G();
    tour = myEntries();
    idx = 0;
    decided = false;
    if (!tour.length) { decision(); return; }
    const el = $("#screen-showing");
    el.innerHTML = `${UI.hud({ noTimer: true, step: "show" })}<div class="show-wrap">
      <div class="show-main">
        <div class="show-steps" data-steps></div>
        <div class="show-view" data-view></div>
        <div class="show-card" data-card></div>
      </div>
      <div class="show-side">
        <div class="client-stage"><div class="faces" data-faces></div><div class="bubble" data-bubble></div>
          <div class="mood-meter"><div class="mm-bar"><div class="mm-dot" data-dot style="left:50%"></div></div><div class="mm-labels"><span>😖 No way</span><span>🤔 Maybe</span><span>😍 Love it</span></div></div></div>
        <div class="reaction-list" data-reactions></div>
        <button class="btn btn-primary btn-lg btn-block" data-next>Next home ▸</button>
      </div></div>`;
    UI.show("showing");
    UI.coach("showing-mood", "#screen-showing .mood-meter", "Showing day! Your client tours each home and reacts. Watch the <b>mood meter</b>, then they decide whether to buy.", { side: "below", delay: 900 });
    UI.bindHud(el);
    el.querySelector("[data-next]").addEventListener("click", () => { HH.sfx("click"); if (idx < tour.length - 1) { idx++; showHouse(); } else decision(); });
    HH.sfx("whoosh");
    showHouse();
  };

  function showHouse() {
    const g = G(), e = tour[idx], L = e.L, ev = e.ev;
    const el = $("#screen-showing");
    el.querySelector("[data-steps]").innerHTML = `<span style="font-family:var(--display);font-weight:600;font-size:20px;color:var(--navy);margin-right:6px">🚗 Showing day</span>` +
      tour.map((t, i) => `<span class="show-step ${i === idx ? "on" : i < idx ? "done" : ""}">${i < idx ? "✓" : i + 1}. ${esc(t.L.address)}</span>`).join("");
    const v = el.querySelector("[data-view]");
    const setView = (mode) => {
      v.innerHTML = mode === "street"
        ? `<div class="loading">Loading Street View…</div><iframe src="${UI.streetViewUrl(L)}" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Street View"></iframe>`
        : HH.ui.site.art(L);
      v.insertAdjacentHTML("beforeend", `<div class="view-toggle seg"><button data-mode="street" class="${mode === "street" ? "on" : ""}">🚶 Street View</button><button data-mode="photo" class="${mode === "photo" ? "on" : ""}">📷 Listing photo</button><button data-mode="plan">📐 Floor plan</button></div>`);
      HH.$$("[data-mode]", v).forEach((b) => b.addEventListener("click", () => {
        if (b.dataset.mode === "plan") UI.modal({ title: "📐 " + esc(L.address), size: "wide", body: HH.art.floorplan(L), foot: `<button class="btn btn-primary" data-close>Close</button>` });
        else setView(b.dataset.mode);
      }));
    };
    setView("street");
    const by = e.by ? g.player(e.by) : null;
    el.querySelector("[data-card]").innerHTML = `<div><div class="sp">${HH.money(L.price)}</div><div class="muted small">${esc(L.address)}, ${esc(L.hoodName)}</div></div>
      <div class="small"><b>${L.beds === 0 ? "Studio" : L.beds + " bd"}</b> · <b>${HH.baths(L.baths)}</b> ba · <b>${HH.num(L.sqft)}</b> sqft · ${L.typeLabel} · ${L.yearBuilt}</div>
      ${by ? `<span class="small" style="color:${by.color};font-weight:700">Picked by ${esc(by.name)}</span>` : ""}
      <span class="spacer"></span><a class="small" href="${UI.mapsLink(L)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>`;
    // client reaction
    const faces = el.querySelector("[data-faces]");
    faces.innerHTML = g.client.people.map((p) => HH.art.person(p.av, { mood: "neutral", size: 110 })).join("") + g.client.pets.map((p) => `<span style="font-size:40px">${p.type === "dog" ? "🐕" : "🐈"}</span>`).join("");
    const r = HH.rng(HH.hash(g.client.seed + L.id));
    const lines = [r.pick(HH.reactionOpener(ev.score))];
    const vo = (t) => HH.voice(g.client, t);
    if (ev.fails.length) ev.fails.slice(0, 2).forEach((f) => lines.push(vo(f.text)));
    else { r.shuffle(ev.pros).slice(0, 2).forEach((p) => lines.push(vo(p))); if (ev.cons.length) lines.push(vo(r.pick(ev.cons))); }
    if (!ev.fails.length && !ev.ok) lines.push("It checks the boxes... but it just doesn't feel like home.");
    else if (ev.ok && ev.score >= 85) lines.push(vo(r.pick(["I could really see us living here.", "Okay, this one is a serious contender.", "Can we just... move in today?"])));
    const reactions = el.querySelector("[data-reactions]");
    reactions.innerHTML = `<div class="small muted" style="font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">What they noticed</div>` +
      (ev.fails.map((f) => `<div class="rl"><span>❌</span><span>${esc(f.label || f.text)}</span></div>`).join("") +
      ev.checks.filter((c) => c.ok === true && c.kind && c.kind !== "nice").slice(0, 4).map((c) => `<div class="rl"><span>✅</span><span>${esc(c.label)}</span></div>`).join("") +
      ev.checks.filter((c) => c.kind === "nice" && c.ok).map((c) => `<div class="rl"><span>💚</span><span>${esc(c.label)}</span></div>`).join("")) || `<div class="muted small">Nothing in particular.</div>`;
    const next = el.querySelector("[data-next]");
    next.textContent = idx < tour.length - 1 ? "Next home ▸" : "Hear their decision ▸";
    next.disabled = true;
    setTimeout(() => { next.disabled = false; }, UI.prefs.textSpeed >= 3 ? 300 : 1500);
    const dot = el.querySelector("[data-dot]");
    dot.style.left = "50%";
    setTimeout(() => { dot.style.left = HH.clamp(ev.score, 3, 97) + "%"; }, 400);
    playLines(lines, el.querySelector("[data-bubble]"), () => {
      faces.innerHTML = g.client.people.map((p) => HH.art.person(p.av, { mood: HH.moodFor(ev.score), size: 110 })).join("") + g.client.pets.map((p) => `<span style="font-size:40px">${p.type === "dog" ? "🐕" : "🐈"}</span>`).join("");
    }, faces, ev.score);
  }

  function playLines(lines, bubble, onMood, faces, score) {
    clearInterval(typing);
    let li = 0, ci = 0, moodSet = false;
    const speed = [36, 20, 9, 0][UI.prefs.textSpeed == null ? 1 : UI.prefs.textSpeed];
    const shown = [];
    if (!speed) { bubble.innerHTML = lines.map(esc).join("<br><br>"); onMood(); return; }
    typing = setInterval(() => {
      if (li >= lines.length) { clearInterval(typing); return; }
      ci++;
      if (ci % 3 === 0) HH.sfx("blip");
      const cur = lines[li].slice(0, ci);
      bubble.innerHTML = shown.concat([cur]).map(esc).join("<br><br>");
      if (!moodSet && li === 0 && ci >= lines[0].length) { moodSet = true; onMood(); }
      if (ci >= lines[li].length) { shown.push(lines[li]); li++; ci = 0; }
    }, speed);
  }

  // ---------- decision ----------
  function decision() {
    if (decided) return;
    decided = true;
    clearInterval(typing);
    const nb = $("#screen-showing [data-next]");
    if (nb) nb.disabled = true;
    const g = G(), R = g.results, c = g.client;
    const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    const back = HH.frag(`<div class="decision"><div class="decision-card"><div class="drumroll">🥁</div><h2>${esc(cap(c.shortName))} ${c.people.length > 1 ? "are" : "is"} deciding…</h2><p class="muted">*whispering intensifies*</p></div></div>`);
    document.body.appendChild(back);
    HH.sfx("drum");
    setTimeout(() => {
      const card = back.querySelector(".decision-card");
      const best = R.best;
      const mine = R.perPlayer[g.myId()];
      let html;
      if (best) {
        const agent = R.coop ? null : g.player(best.pid);
        const isMe = R.coop || best.pid === g.myId();
        const stars = HH.stars(best.ev.score, true);
        const quote = HH.rng(HH.hash(c.seed + "q")).pick(stars >= 5 ? ["We found our forever home. Thank you SO much!", "This is it. This is THE one!", "I'm crying. Happy tears. We'll take it!"] : stars >= 4 ? ["We love it. Let's make an offer!", "This one just feels right. We'll take it!"] : ["It's not perfect, but it'll work. Let's do it.", "Okay... let's make an offer before we change our minds."]);
        html = `<div style="font-size:60px">${isMe ? "🎉" : "😬"}</div>
          <h2>${isMe ? `${esc(cap(c.shortName))} ${c.people.length > 1 ? "are" : "is"} buying it!` : `They chose ${esc(agent ? agent.name : "another agent")}'s pick`}</h2>
          <div style="width:260px;margin:10px auto;border-radius:12px;overflow:hidden;box-shadow:var(--shadow-2)">${UI.site.art(best.L)}</div>
          <p><b>${esc(best.L.address)}</b> · ${HH.money(best.L.price)}</p>
          <p style="font-style:italic;color:var(--ink-2)">"${esc(HH.voice(c, quote))}"</p>
          ${UI.starsHtml(stars)}
          ${isMe ? `<div class="earn" style="text-align:center;margin-top:8px"><div class="lbl">Your commission</div><div class="amt" data-amt>$0</div></div>` : `<p class="muted">Better luck next client!</p>`}`;
        if (isMe) { HH.sfx("cash"); setTimeout(() => HH.sfx("success"), 500); UI.confetti(); }
        else HH.sfx("fail");
      } else {
        const anyPick = R.entries.length > 0;
        html = `<div style="font-size:60px">😞</div><h2>${anyPick ? "None of these felt like home" : "Nothing to show"}</h2>
          <p style="font-style:italic;color:var(--ink-2)">"${esc(HH.voice(c, anyPick ? HH.rng(HH.hash(c.seed + "n")).pick(["I'm sorry, but none of these work for us.", "We'll keep looking... maybe with another agent.", "Did you even listen to us?"]) : "We waited all day and nobody showed us anything?!"))}"</p>${UI.starsHtml(mine ? mine.stars : 0)}`;
        HH.sfx("fail");
      }
      card.innerHTML = html + `<div style="margin-top:16px"><button class="btn btn-primary btn-lg" data-results>See the breakdown ▸</button></div>`;
      const amt = card.querySelector("[data-amt]");
      if (amt && mine) UI.countUp(amt, mine.earnings, 1400);
      card.querySelector("[data-results]").addEventListener("click", () => { back.remove(); HH.sfx("click"); UI.results.render(); });
    }, UI.prefs.reducedMotion ? 400 : 2100);
  }

  // ==========================================================================
  // Results
  // ==========================================================================
  UI.results = {};
  let careerDoneFor = null;

  function updateCareer() {
    const g = G(), R = g.results, c = g.client, me = R.perPlayer[g.myId()];
    const key = g.round.seed + ":" + g.round.num;
    if (!me || careerDoneFor === key) return;
    careerDoneFor = key;
    const C = UI.career;
    C.rounds++;
    C.starsSum += me.stars; C.starsN++;
    if (me.won) {
      const L = R.best.L;
      C.deals++; C.earnings += me.earnings; C.biggest = Math.max(C.biggest, L.price);
      C.cities[L.cityId] = true; C.streak++; C.bestStreak = Math.max(C.bestStreak, C.streak);
      UI.unlock("first");
      if (me.stars >= 5) UI.unlock("five");
      if (L.price >= 1e6) UI.unlock("million");
      if (L.price <= c.budget.max * 0.85 && me.stars >= 4) UI.unlock("bargain");
      if (g.round.durationMs && me.speed > me.commission * 0.05) UI.unlock("speed");
      if (c.diff === "hard") UI.unlock("hard");
      if (R.coop) UI.unlock("team");
      if (C.streak >= 3) UI.unlock("streak");
      if (Object.keys(C.cities).length >= HH_WORLD.cities.length) UI.unlock("cities");
    } else C.streak = 0;
    if (me.picks.some((e) => e.L.status !== "active")) UI.unlock("trap");
    if (R.marketBest && me.picks.some((e) => e.id === R.marketBest.L.id)) UI.unlock("perfect");
    UI.saveCareer();
  }

  function checklist(e) {
    const g = G();
    return e.ev.checks.map((x) => {
      const icon = x.ok === true ? "✅" : x.ok === "partial" ? "🟡" : x.kind === "nice" ? "➖" : "❌";
      const hiddenNote = x.hidden && !g.revealed[x.topic] ? ` <span class="learned" style="background:var(--gold-l);color:#8a5a00">🤫 hidden — asking "${esc((HH.TOPICS.find((t) => t.key === x.topic) || {}).q || x.topic)}" would have revealed it</span>` : "";
      const kind = x.kind === "nice" ? " <span class='muted small'>(nice-to-have)</span>" : x.kind === "deal" ? " <span class='muted small'>(dealbreaker)</span>" : "";
      return `<div class="check-row"><span class="ci">${icon}</span><span>${esc(x.label)}${kind}${hiddenNote}</span></div>`;
    }).join("") + (e.L.status !== "active" ? `<div class="check-row"><span class="ci">❌</span><span><b>This home was already pending (under contract)!</b></span></div>` : "");
  }

  UI.results.render = function () {
    const g = G(), R = g.results, c = g.client;
    updateCareer();
    const me = R.perPlayer[g.myId()];
    const best = R.best;
    const isMe = best && (R.coop || best.pid === g.myId());
    const el = $("#screen-results");
    const multi = g.mode !== "solo";
    const last = g.round.num >= g.round.total;
    const myPicks = me ? me.picks : [];
    const others = !R.coop ? R.entries.filter((e) => e.pid !== g.myId()) : [];
    const outcomeCls = isMe ? "win" : best ? "" : "lose";
    let headline, sub;
    if (isMe) { headline = `Sold! ${esc(c.name)} bought ${esc(best.L.address)}`; sub = `${HH.money(best.L.price)} · ${esc(best.L.hoodName)}`; }
    else if (best) { const a = g.player(best.pid); headline = `${esc(c.name)} bought from ${esc(a ? a.name : "a rival")}`; sub = `${esc(best.L.address)} · ${HH.money(best.L.price)}`; }
    else { headline = `${esc(c.name)} didn't buy anything`; sub = myPicks.length ? "None of the homes met their needs." : "You didn't present any homes."; }
    const tabs = myPicks.length ? myPicks : [];
    el.innerHTML = `<div class="results-wrap">
      <div class="outcome ${outcomeCls}">
        <div class="o-thumb">${best ? UI.site.art(best.L) : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:70px">🏚️</div>`}</div>
        <div><div class="small muted" style="font-weight:800;text-transform:uppercase;letter-spacing:.08em">Round ${g.round.num} of ${g.round.total} · ${esc(g.market.city.name)}</div><h2>${headline}</h2><div class="muted">${sub}</div>
          <div style="margin-top:8px">${UI.starsHtml(me ? me.stars : 0)}</div></div>
        <div class="earn"><div class="lbl">You earned</div><div class="amt" data-amt>${HH.money(me ? me.earnings : 0)}</div>
          ${me && me.won ? `<div class="bonus">Commission ${HH.money(me.commission)}${me.speed ? ` + speed ${HH.money(me.speed)}` : ""}${me.review ? ` + 5★ bonus ${HH.money(me.review)}` : ""}</div>` : ""}</div>
      </div>
      <div class="res-grid">
        <div class="res-panel"><h3>🗣️ Client feedback on ${R.coop ? "the team's" : "your"} picks</h3>
          ${tabs.length ? `<div class="pick-tabs">${tabs.map((e, i) => `<button class="pick-tab ${i === 0 ? "on" : ""} ${best && best.id === e.id ? "chosen" : ""}" data-tab="${i}"><span class="sc ${UI.scoreClass(e.ev.score)}">${e.ev.score}</span>${esc(e.L.address)}${best && best.id === e.id ? " 🏆" : ""}</button>`).join("")}</div><div data-tabbody></div>`
          : `<p class="muted">You didn't present any homes this round.</p>`}
          <p class="muted small" style="margin-top:12px">Scores are out of 100. The client only buys a home with no ❌ that scores at least ${c.threshold}.</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          ${g.round.daily && !multi ? dailyPanel(me, isMe) : ""}
          ${multi ? `<div class="res-panel"><h3>🏆 ${R.coop ? "Team" : "Leaderboard"}</h3>${leaderboard()}</div>` : ""}
          <div class="res-panel"><h3>🎯 Best match on the market</h3>${R.marketBest ? `<div class="best-match"><div class="bm-thumb" data-view-best>${UI.site.art(R.marketBest.L)}</div><div><b>${esc(R.marketBest.L.address)}</b><br><span class="muted small">${HH.money(R.marketBest.L.price)} · ${esc(R.marketBest.L.hoodName)}</span><br><span class="small">Client score: <b>${R.marketBest.ev.score}</b></span>${myPicks.some((e) => e.id === R.marketBest.L.id) ? `<br><span class="small" style="color:var(--green);font-weight:700">✓ You found it!</span>` : ""}<br><button class="btn btn-xs" style="margin-top:6px" data-view-best>View listing</button></div></div>` : `<p class="muted">Nothing on the market fit perfectly.</p>`}
            <p class="muted small" style="margin-bottom:0">${countValid()} of ${g.market.listings.length} listings would have satisfied this client.</p></div>
          ${others.length ? `<div class="res-panel"><h3>👀 What rivals presented</h3>${others.map((e) => { const p = g.player(e.pid); return `<div class="score-row"><span class="sc ${UI.scoreClass(e.ev.score)}">${e.ev.score}</span><div style="flex:1"><b>${esc(e.L.address)}</b> <span class="muted small">${HH.moneyShort(e.L.price)}</span><br><span class="small" style="color:${p ? p.color : "#555"};font-weight:700">${esc(p ? p.name : "Agent")}</span></div>${best && best.id === e.id && best.pid === e.pid ? "🏆" : ""}</div>`; }).join("")}</div>` : ""}
        </div>
      </div>
      <div class="res-actions" data-actions></div>
    </div>`;
    UI.show("results");
    UI.coach("results-why", "#screen-results .res-grid .res-panel", "Here's what your client thought of each home, including any <b>hidden wants</b> you missed. Use it to do better next time!", { side: "right", delay: 1800 });
    const body = el.querySelector("[data-tabbody]");
    const showTab = (i) => {
      const e = tabs[i];
      HH.$$("[data-tab]", el).forEach((b) => b.classList.toggle("on", +b.dataset.tab === i));
      const by = e.by ? g.player(e.by) : null;
      body.innerHTML = `<div class="row" style="margin-bottom:8px"><b>${esc(e.L.address)}</b><span class="muted small">${HH.money(e.L.price)} · ${e.L.beds === 0 ? "Studio" : e.L.beds + " bd"} · ${HH.baths(e.L.baths)} ba · ${HH.num(e.L.sqft)} sqft</span>${by ? `<span class="small" style="color:${by.color};font-weight:700">by ${esc(by.name)}</span>` : ""}<span class="spacer"></span><button class="btn btn-xs" data-view="${e.id}">View listing</button></div>
        ${e.ev.pros.length ? `<div class="small" style="margin-bottom:6px">💬 <i>${esc(HH.voice(c, e.ev.pros.slice(0, 2).join(" ")))}</i></div>` : ""}
        ${checklist(e)}`;
      body.querySelector("[data-view]").addEventListener("click", () => UI.listingModal(e.L));
    };
    if (tabs.length) { showTab(0); HH.$$("[data-tab]", el).forEach((b) => b.addEventListener("click", () => showTab(+b.dataset.tab))); }
    HH.$$("[data-view-best]", el).forEach((b) => b.addEventListener("click", () => UI.listingModal(R.marketBest.L)));
    const share = el.querySelector("[data-share]");
    if (share) share.addEventListener("click", () => {
      const text = share.dataset.share;
      const ok = () => UI.toast("Result copied! Paste it to your friends and see who does better.", "good", "📋");
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, () => UI.modal({ title: "Your result", body: `<textarea class="input" style="width:100%;height:90px">${esc(text)}</textarea>`, foot: `<button class="btn btn-primary" data-close>Done</button>` }));
    });
    renderActions();
  };

  // ---------- Daily Client ----------
  // The first attempt each day is your official result; replays are practice.
  function dailyPanel(me, won) {
    const g = G(), day = g.round.daily;
    const all = HH.store.get("daily", {});
    const stars = me ? me.stars : 0, earned = me ? me.earnings : 0;
    if (g.round.dailyFirst === undefined) g.round.dailyFirst = !all[day];
    const first = g.round.dailyFirst;
    let official = all[day];
    if (first && !official) {
      official = all[day] = { stars, earned, won: !!won, score: me ? me.bestScore || 0 : 0 };
      const keys = Object.keys(all).sort();
      while (keys.length > 60) delete all[keys.shift()];
      HH.store.set("daily", all);
    }
    const nice = new Date(g.round.today).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const text = `🏠 House Hunters · Daily Client ${nice}\n${official.won ? "🔑 SOLD" : "🚫 No sale"} · ${"★".repeat(official.stars)}${"☆".repeat(5 - official.stars)} · ${HH.money(official.earned)}\nSame client for everyone today. Can you beat me?`;
    return `<div class="res-panel daily-panel"><h3>📅 Daily Client · ${esc(nice)}</h3>
      ${first ? `<p style="margin:0 0 8px">That's your <b>official result</b> for today. Everyone gets this same client, so compare with your friends!</p>`
        : `<p style="margin:0 0 8px">Practice run. Your official result today was <b>${official.won ? "a sale" : "no sale"}</b> with ${official.stars}★ and ${HH.money(official.earned)}.</p>`}
      <pre class="share-box">${esc(text)}</pre>
      <button class="btn btn-sm btn-primary" data-share="${esc(text)}">📋 Copy my result</button>
      <span class="muted small" style="margin-left:8px">🔥 ${HH.plural(dailyStreak(all), "day")} in a row</span></div>`;
  }
  function dailyStreak(all) {
    let n = 0;
    const d = new Date();
    for (;;) { if (!all[HH.dateKey(d)]) break; n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  UI.dailyStreak = () => dailyStreak(HH.store.get("daily", {}));

  function countValid() {
    const g = G();
    return g.market.listings.filter((L) => HH.evaluate(g.client, L).ok).length;
  }

  function leaderboard() {
    const g = G(), R = g.results;
    const rows = g.lobby.players.map((p) => ({ p, t: g.totals[p.id] || { earnings: 0, deals: 0, starsSum: 0, rounds: 0 }, r: R.perPlayer[p.id] }))
      .sort((a, b) => b.t.earnings - a.t.earnings || b.t.deals - a.t.deals);
    return `<table class="lb"><tr><th>Agent</th><th>This round</th><th>Total</th></tr>${rows.map((x, i) => `<tr class="${x.p.id === g.myId() ? "me" : ""}"><td><div class="pcell"><span>${["🥇", "🥈", "🥉"][i] || i + 1 + "."}</span><div class="pav" style="--c:${x.p.color}">${UI.avatar(x.p)}</div>${esc(x.p.name)}</div></td>
      <td>${x.r && x.r.won ? `<span class="money">+${HH.money(x.r.earnings)}</span>` : `<span class="muted">${x.r && x.r.picks.length ? "best " + x.r.bestScore : "no picks"}</span>`}</td><td class="money">${HH.money(x.t.earnings)}</td></tr>`).join("")}</table>`;
  }

  function renderActions() {
    const g = G();
    const el = $("#screen-results [data-actions]");
    if (!el) return;
    const last = g.round.num >= g.round.total;
    if (g.isHost()) {
      el.innerHTML = `${g.mode === "host" ? `<span class="note">You're the host. Start the next round when everyone has read their results.</span>` : ""}<button class="btn" data-quit>🏠 Main menu</button><button class="btn btn-primary btn-lg" data-next>${last ? "🏁 Final results ▸" : g.mode === "solo" ? "🔔 Next client ▸" : "▶ Next round ▸"}</button>`;
      el.querySelector("[data-next]").addEventListener("click", () => { HH.sfx(last ? "click" : "doorbell"); g.nextRound(); });
    } else {
      el.innerHTML = `<span class="note">⏳ Waiting for the host to start ${last ? "the final results" : "the next round"}…</span><button class="btn" data-chat-open>💬 Chat</button><button class="btn" data-quit>Leave game</button>`;
      el.querySelector("[data-chat-open]").addEventListener("click", () => UI.toggleChat());
    }
    el.querySelector("[data-quit]").addEventListener("click", () => UI.confirm("Leave the game?", g.mode === "host" ? "This ends the game for everyone." : g.mode === "solo" ? "Your progress in this game will end here (career earnings are already saved)." : "You'll leave the lobby.", "Leave", () => g.quitToMenu(), true));
  }

  // ---------- listing modal (outside the website) ----------
  UI.listingModal = function (L) {
    const m = UI.modal({
      title: esc(L.address), size: "wide",
      body: `<div class="gallery"><div class="gallery-tabs"><button class="on" data-t="photo">📷 Photo</button><button data-t="street">🚶 Street View</button><button data-t="plan">📐 Floor plan</button></div><div class="gallery-view" data-v>${UI.site.art(L)}</div></div>
        <div class="d-price" style="margin-top:12px;font-size:28px">${HH.money(L.price)}</div>
        <div class="muted">${esc(L.hoodName)} · ${L.typeLabel} · ${L.beds === 0 ? "Studio" : L.beds + " bd"} · ${HH.baths(L.baths)} ba · ${HH.num(L.sqft)} sqft · built ${L.yearBuilt}</div>
        <p class="d-desc">${esc(L.description)}</p>
        ${L.disclosures.length ? L.disclosures.map((t) => `<div class="disc">${esc(t)}</div>`).join("") : ""}`,
      foot: `<button class="btn btn-primary" data-close>Close</button>`,
    });
    const v = m.el.querySelector("[data-v]");
    HH.$$("[data-t]", m.el).forEach((b) => b.addEventListener("click", () => {
      HH.$$("[data-t]", m.el).forEach((x) => x.classList.toggle("on", x === b));
      if (b.dataset.t === "photo") v.innerHTML = UI.site.art(L);
      if (b.dataset.t === "street") v.innerHTML = `<div class="loading">Loading Street View…</div><iframe src="${UI.streetViewUrl(L)}" allowfullscreen loading="lazy" title="Street View"></iframe>`;
      if (b.dataset.t === "plan") v.innerHTML = `<div class="fp-wrap">${HH.art.floorplan(L)}</div>`;
    }));
  };

  // ==========================================================================
  // Final standings
  // ==========================================================================
  UI.results.renderFinal = function () {
    const g = G();
    const el = $("#screen-final");
    const rows = g.lobby.players.map((p) => ({ p, t: g.totals[p.id] || { earnings: 0, deals: 0, starsSum: 0, rounds: 0, best: 0 } }))
      .sort((a, b) => b.t.earnings - a.t.earnings || b.t.deals - a.t.deals);
    const solo = g.mode === "solo";
    const coop = g.round && g.round.gameMode === "coop";
    const meT = g.totals[g.myId()] || { earnings: 0, deals: 0, starsSum: 0, rounds: 0 };
    if (!solo && !coop && rows.length > 1 && rows[0].p.id === g.myId() && rows[0].t.earnings > 0) { UI.career.wins++; UI.saveCareer(); UI.unlock("rival"); }
    const avg = (t) => (t.rounds ? (t.starsSum / t.rounds).toFixed(1) + "★" : "—");
    const podium = [rows[1], rows[0], rows[2]].map((x, i) => x ? `<div class="pd p${[2, 1, 3][i]}"><div class="pav" style="--c:${x.p.color}">${UI.avatar(x.p)}</div><b>${esc(x.p.name)}</b><div class="block">${[2, 1, 3][i]}<small>${HH.moneyShort(x.t.earnings)}</small></div></div>` : "").join("");
    const rank = UI.rankFor(UI.career.earnings);
    el.innerHTML = `<div class="results-wrap">
      <div class="final-title"><div style="font-size:54px">${solo ? "📊" : coop ? "🤝" : "🏆"}</div><h1>${solo ? "Your week in review" : coop ? "Team results" : rows[0] ? esc(rows[0].p.name) + " wins!" : "Final standings"}</h1>
        <p style="opacity:.85">${solo || coop ? `${HH.plural(meT.deals, "home")} sold · ${HH.money(meT.earnings)} in commission` : "Final standings after " + HH.plural(g.round ? g.round.total : 0, "round")}</p></div>
      ${!solo && !coop ? `<div class="podium">${podium}</div>` : ""}
      <div class="res-grid">
        <div class="res-panel"><h3>📋 ${solo ? "Summary" : "All agents"}</h3>
          <table class="lb"><tr><th>Agent</th><th>Sold</th><th>Avg review</th><th>Earnings</th></tr>${rows.map((x, i) => `<tr class="${x.p.id === g.myId() ? "me" : ""}"><td><div class="pcell">${solo || coop ? "" : `<span>${["🥇", "🥈", "🥉"][i] || i + 1 + "."}</span>`}<div class="pav" style="--c:${x.p.color}">${UI.avatar(x.p)}</div>${esc(x.p.name)}</div></td><td>${x.t.deals}/${x.t.rounds}</td><td>${avg(x.t)}</td><td class="money">${HH.money(x.t.earnings)}</td></tr>`).join("")}</table></div>
        <div class="res-panel"><h3>${rank.cur.icon} Your career</h3><div style="font-family:var(--display);font-size:22px;font-weight:600;color:var(--navy)">${rank.cur.name}</div>
          <div class="rank-bar"><i style="width:${Math.round(rank.pct * 100)}%"></i></div><div class="muted small">${HH.money(UI.career.earnings)} lifetime${rank.next ? ` · ${HH.money(rank.next.at - UI.career.earnings)} to ${rank.next.name}` : ""}</div>
          <div class="row wrap" style="margin-top:12px"><span class="chip">🏠 ${UI.career.deals} sold</span><span class="chip">🏆 ${Object.keys(UI.career.ach).length}/${UI.ACH.length} awards</span></div></div>
      </div>
      <div class="res-actions" data-actions></div></div>`;
    UI.show("final");
    if (rows[0] && (solo ? meT.deals > 0 : true)) UI.confetti();
    HH.sfx("success");
    const act = el.querySelector("[data-actions]");
    if (solo) {
      act.innerHTML = `<button class="btn" data-menu>🏠 Main menu</button><button class="btn btn-primary btn-lg" data-again>🔁 Play again</button>`;
      act.querySelector("[data-again]").addEventListener("click", () => { const s = HH.store.get("soloSettings", g.lobby.settings); g.startSolo(s); });
      act.querySelector("[data-menu]").addEventListener("click", () => g.quitToMenu());
    } else if (g.mode === "host") {
      act.innerHTML = `<span class="note">Play again with the same group?</span><button class="btn" data-menu>Close lobby</button><button class="btn btn-primary btn-lg" data-lobby>↩️ Back to lobby</button>`;
      act.querySelector("[data-lobby]").addEventListener("click", () => g.backToLobby());
      act.querySelector("[data-menu]").addEventListener("click", () => UI.confirm("Close the lobby?", "Everyone will be disconnected.", "Close", () => g.quitToMenu(), true));
    } else {
      act.innerHTML = `<span class="note">⏳ Waiting for the host…</span><button class="btn" data-menu>Leave</button>`;
      act.querySelector("[data-menu]").addEventListener("click", () => g.quitToMenu());
    }
  };
})(window.HH);
