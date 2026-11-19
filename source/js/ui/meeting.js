// The client meeting: office scene, dialogue, questions, and the client brief.
(function (HH) {
  "use strict";
  const UI = HH.ui, esc = HH.esc, $ = HH.$;
  const G = () => HH.game;

  // ---------- client brief (shared with the computer screen) ----------
  const ICONS = { fenced: "🐕", pool: "🏊", noPool: "🚫🏊", office: "💻", garage2: "🚗", garage: "🚗", singleStory: "♿", primaryMain: "🛏️", adu: "🏡", basement: "🪜", workshop: "🔧", solar: "☀️", ev: "🔌", fireplace: "🔥", noCarpet: "🤧", kitchen: "🍳", view: "🏞️", waterfront: "🌊", nearWater: "🌊", walkable: "🚶", nearPark: "🌳", transit: "🚇", quiet: "🤫", notBusy: "🚦", noHOA: "📜", noFlood: "🌧️", moveIn: "✨", project: "🔨", dogOK: "🐶", petsOK: "🐱", quickClose: "📅", rentalOK: "🔑", garden: "🌻", rv: "🚤", hotTub: "♨️", deck: "🪑", porch: "🏡", golf: "⛳", gym: "🏋️", ac: "❄️", smallLot: "🌱", newerHome: "🆕", hardwoodNice: "🪵", schools: "🎓", lot: "🌾", hoaMax: "📜", older: "🏛️", monthly: "🧾", sqft: "📐", baths: "🛁", studio: "🎸", solarOrEv: "🔋" };
  const iconFor = (q) => ICONS[q.key] || (q.key.indexOf("extra-") === 0 ? "🔎" : "•");

  function known(q) { return !q.hidden || G().revealed[q.topic]; }

  UI.briefHtml = function (opts) {
    opts = opts || {};
    const g = G(), c = g.client, city = g.market.city;
    if (!c) return "";
    const hoodName = (id) => city.hoods.find((h) => h.id === id).name;
    const hh = [];
    if (c.kids.length) hh.push(HH.plural(c.kids.length, "kid"));
    c.pets.forEach((p) => hh.push(`${p.type} (${p.name})`));
    if (c.elder && g.revealed.household) hh.push("grandma");
    const line = (icon, html, cls) => `<div class="bline ${cls || ""}"><span class="bi">${icon}</span><span class="bt">${html}</span></div>`;
    let s = `<div class="brief"><h4>📋 ${esc(c.name)}</h4>`;
    s += line("👤", `<b>${esc(c.archTitle)}</b>${hh.length ? " · " + esc(hh.join(", ")) : ""}`);
    s += line("💰", `Budget up to <b>${HH.money(c.budget.max)}</b>${c.budget.stretch && g.revealed.budget ? ` <span class="learned">could stretch to ${HH.money(c.budget.stretch)}</span>` : ""}`);
    if (c.hoods) s += line("📍", `Only in <b>${esc(HH.listJoin(c.hoods.map(hoodName), "or"))}</b>`);
    else if (c.commute && (!c.commute.hidden || g.revealed.work)) s += line("🚗", `Commute to <b>${esc(city.work[c.commute.idx].name)}</b> ≤ <b>${c.commute.max} min</b>${c.commute.hidden ? ` <span class="learned">learned</span>` : ""}`);
    else s += line("📍", `Anywhere in ${esc(city.name)}`);
    const types = c.types.length === 3 ? "any type" : c.types.map((t) => ({ house: "house", townhome: "townhome", condo: "condo" }[t])).join(" or ");
    s += line("🛏️", `<b>${c.minBeds === 0 ? "Studio+" : c.minBeds + "+ beds"}</b> · <b>${HH.baths(c.minBaths)}+ baths</b> · ${types}`);
    const groups = [["must", "Must-haves"], ["deal", "Dealbreakers (must NOT have)"], ["nice", "Nice-to-haves"]];
    groups.forEach(([kind, title]) => {
      const list = c.reqs.filter((q) => q.kind === kind && known(q));
      if (!list.length) return;
      s += `<div class="bsec">${title}</div>`;
      list.forEach((q) => { s += line(iconFor(q), `<b>${esc(q.label)}</b>${q.hidden ? ` <span class="learned">learned</span>` : ""}`, kind); });
    });
    const hiddenLeft = c.reqs.filter((q) => !known(q)).length + (c.commute && c.commute.hidden && !g.revealed.work ? 1 : 0);
    if (c.diff !== "easy") {
      s += `<div class="unknown">${hiddenLeft ? "🤔 They might want more than they've said. Questions can uncover it." : (g.asked.length ? "✅ You've uncovered everything they're hiding!" : "🤔 They might want more than they've said.")}</div>`;
    }
    if (opts.notes !== false) s += `<textarea data-notes placeholder="Your notes…">${esc(g.notes)}</textarea>`;
    if (opts.apply && c.diff === "easy") s += `<button class="btn btn-sm btn-teal btn-block" style="margin-top:8px" data-apply-brief>⚡ Apply brief to filters</button>`;
    s += `</div>`;
    return s;
  };
  UI.bindBrief = function (root) {
    HH.$$("[data-notes]", root).forEach((t) => t.addEventListener("input", () => { G().notes = t.value; HH.$$("[data-notes]").forEach((o) => { if (o !== t) o.value = t.value; }); }));
  };

  // ---------- dialogue engine ----------
  const D = { lines: [], i: 0, text: "", shown: 0, timer: null, onDone: null, typing: false };
  const SPEED = [38, 20, 9, 0];
  function speakerName() { const c = G().client; return c.people.length === 2 ? `${c.people[0].name} & ${c.people[1].name}` : c.people[0].name; }

  function say(lines, onDone) {
    D.lines = lines.slice(); D.i = 0; D.onDone = onDone;
    nextLine();
  }
  function nextLine() {
    clearInterval(D.timer);
    const box = $("#dlg-text");
    if (!box) return;
    if (D.i >= D.lines.length) { D.typing = false; setTalking(false); const f = D.onDone; D.onDone = null; if (f) f(); return; }
    D.text = D.lines[D.i++];
    D.shown = 0;
    D.typing = true;
    D.isHint = isHint(D.text);
    addLog(D.text, "client", D.isHint ? "hint" : "");
    setTalking(true);
    const sp = SPEED[UI.prefs.textSpeed == null ? 1 : UI.prefs.textSpeed];
    $("#dlg-prog").textContent = `${D.i}/${D.lines.length}`;
    if (!sp) { finishLine(); return; }
    let n = 0;
    D.timer = setInterval(() => {
      D.shown = Math.min(D.text.length, D.shown + 1);
      box.innerHTML = esc(D.text.slice(0, D.shown)) + `<span class="caret"></span>`;
      if (++n % 3 === 0) HH.sfx("blip");
      if (D.shown >= D.text.length) finishLine();
    }, sp);
  }
  function finishLine() {
    clearInterval(D.timer);
    D.typing = false;
    setTalking(false);
    const box = $("#dlg-text");
    if (box) box.innerHTML = esc(D.text) + (D.isHint ? `<span class="hint-tag" title="Hints point to something they haven't told you yet">💡 Hint</span>` : "");
    const hint = $("#dlg-next");
    if (hint) hint.classList.remove("hidden");
    if (D.isHint) UI.coach("meet-hint", "#dlg-text .hint-tag", "That was a <b>hint</b>! Your client is hiding something. Later, ask the question that matches it to find out what they really want.", { delay: 150 });
  }
  function isHint(t) { const c = G().client; return !!(c && c.hintLines && c.hintLines.indexOf(t) >= 0); }
  function advance() {
    if (G().phase !== "meeting") return;
    if (!D.started) { beginOpening(); return; }
    if (D.typing) { finishLine(); return; }
    if (D.onDone || D.i < D.lines.length) { $("#dlg-next").classList.add("hidden"); nextLine(); }
  }
  function setTalking(on) { const s = $(".clients-seat"); if (s) s.classList.toggle("talking", on); }
  function addLog(text, who, extra) {
    const log = $("#talk-log");
    if (!log) return;
    log.insertAdjacentHTML("beforeend", `<div class="talk-line ${who === "me" ? "me" : ""} ${extra || ""}">${who === "me" ? "" : `<b>${esc(speakerName())}:</b> `}${esc(text)}</div>`);
    const body = log.closest(".side-body");
    if (body) body.scrollTop = body.scrollHeight;
  }

  // ---------- office scene ----------
  function skyline(cityId) {
    const r = HH.rng(HH.hash(cityId));
    let s = `<svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMax slice">`;
    let x = 0;
    while (x < 300) {
      const w = r.int(18, 38), h = r.int(30, 105);
      s += `<rect x="${x}" y="${120 - h}" width="${w}" height="${h}" fill="${r.pick(["#7d93ad", "#8aa0b8", "#6f86a3", "#9ab0c6"])}"/>`;
      for (let wy = 120 - h + 6; wy < 116; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) if (r.chance(0.5)) s += `<rect x="${wx}" y="${wy}" width="3" height="4" fill="#dce9f5" opacity=".8"/>`;
      if (r.chance(0.12)) s += `<rect x="${x + w / 2 - 1}" y="${120 - h - 14}" width="2" height="14" fill="#6f86a3"/>`;
      x += w + r.int(0, 4);
    }
    return s + `</svg>`;
  }

  function clientsHtml(mood) {
    const c = G().client;
    let s = "";
    c.people.forEach((p) => { s += HH.art.person(p.av, { mood: mood || "happy", size: 172 }); });
    c.kids.slice(0, 3).forEach((k, i) => { s += `<span class="kid" title="${esc(k)}">${["🧒", "👧", "👦"][i % 3]}</span>`; });
    if (c.elder && G().revealed.household) s += `<span class="kid" title="${esc(c.elder)}">👵</span>`;
    c.pets.forEach((p) => { s += `<span class="pet" title="${esc(p.name)}">${p.type === "dog" ? "🐕" : "🐈"}</span>`; });
    return s;
  }
  UI.clientsHtml = clientsHtml;

  UI.meeting = {};
  UI.meeting.stop = function () { clearInterval(D.timer); clearTimeout(D.startTimer); D.onDone = null; D.typing = false; D.lines = []; D.i = 0; };
  // the opening starts after the client walks in; Skip/Space can start it early
  function beginOpening() {
    if (D.started) return;
    D.started = true;
    clearTimeout(D.startTimer);
    say(G().client.opening, showQuestions);
    UI.coach("meet-talk", "[data-dialog]", "Your client is telling you what they want in a home. <b>Click the speech box</b> or press <b>Space</b> to keep them talking.", { side: "above", align: "end", delay: 700 });
  }
  UI.meeting.start = function () {
    const g = G(), c = g.client, city = g.market.city;
    const el = $("#screen-meeting");
    const multi = g.mode !== "solo";
    el.innerHTML = `${UI.hud({ step: "meet" })}
      <div class="office">
        <div class="office-scene">
          <div class="office-window">${skyline(city.id)}</div>
          <div class="office-clock"></div>
          <div class="office-art">${HH.art.house(g.market.listings[0])}</div>
          <div class="office-plant">🪴</div>
          <div class="clients-seat clients-enter">${clientsHtml("happy")}</div>
          <div class="desk"></div>
          <div class="desk-items"><div class="desk-papers"></div><div class="desk-mug">☕</div><div class="desk-name">${esc(g.me().name)} · Agent</div>
            <div class="desk-monitor" data-go title="Go to your computer"><div class="scr">${UI.LOGO_SVG.replace('width="54" height="54"', 'width="38" height="38"')}<span>Roofline</span></div></div></div>
          <div class="dialog" data-dialog>
            <div class="who">${esc(speakerName())}</div>
            <div class="text" id="dlg-text"></div>
            <div class="dlg-foot"><span class="progress" id="dlg-prog"></span><span class="spacer"></span>
              <button class="btn btn-xs btn-ghost" data-skip>Skip ▸▸</button>
              <span class="small muted hidden" id="dlg-next">Click or press <kbd>Space</kbd> ▸</span></div>
            <div class="ask-panel hidden" id="ask-panel"></div>
          </div>
        </div>
        <aside class="meeting-side">
          <div class="side-head">🗒️ Meeting notes</div>
          <div class="side-body"><div data-brief></div><div class="bsec" style="margin:14px 0 6px;font-size:11px;font-weight:800;color:var(--ink-3);letter-spacing:.08em;text-transform:uppercase">Conversation</div><div class="talk-log" id="talk-log"></div></div>
        </aside>
      </div>`;
    UI.show("meeting");
    UI.bindHud(el);
    renderBrief();
    HH.sfx("doorbell");
    const dlg = el.querySelector("[data-dialog]");
    dlg.addEventListener("click", (e) => { if (e.target.closest("button")) return; advance(); });
    el.querySelector("[data-skip]").addEventListener("click", () => {
      if (!D.started) { D.started = true; clearTimeout(D.startTimer); D.lines = c.opening.slice(); D.i = 0; D.onDone = showQuestions; }
      clearInterval(D.timer);
      const rest = D.lines.slice(D.i);
      rest.forEach((t) => addLog(t, "client", isHint(t) ? "hint" : ""));
      D.i = D.lines.length; D.typing = false; setTalking(false);
      const f = D.onDone; D.onDone = null;
      if (f) f();
    });
    el.querySelector("[data-go]").addEventListener("click", () => goToComputer());
    if (!UI.meeting._keys) {
      UI.meeting._keys = true;
      document.addEventListener("keydown", (e) => {
        if (UI.current !== "meeting" || G().phase !== "meeting") return;
        if (e.target.closest && e.target.closest("input, textarea, select, button, a")) return;
        if (HH.$(".modal-back")) return;
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); advance(); }
      });
    }
    $("#dlg-text").innerHTML = `<span class="muted">*ding-dong* A new client has arrived: ${esc(c.archTitle.toLowerCase())}, looking in ${esc(city.name)}, ${city.state}…</span>`;
    UI.meeting.stop();
    D.started = false;
    D.startTimer = setTimeout(beginOpening, UI.prefs.reducedMotion ? 100 : 1100);
    if (multi) UI.toast(`New client! Everyone's meeting ${esc(c.shortName)}.`, "", "🔔");
  };

  function renderBrief() {
    HH.$$("[data-brief]").forEach((b) => { b.innerHTML = UI.briefHtml({ notes: true, apply: b.dataset.brief === "site" }); UI.bindBrief(b); });
    if (UI.site && UI.site.bindBriefApply) UI.site.bindBriefApply();
  }
  UI.renderBrief = renderBrief;

  const SHORT = { household: "Household", work: "Work", lifestyle: "Hobbies", dealbreakers: "Dealbreakers", budget: "Budget", timeline: "Timeline", condition: "Fixer-uppers", style: "Style" };
  function showQuestions() {
    const g = G(), c = g.client;
    const panel = $("#ask-panel");
    if (!panel) return;
    $("#dlg-next").classList.add("hidden");
    const left = g.questionsLeft;
    const unlimited = c.questions >= 99;
    const coop = g.isCoop();
    $("#dlg-text").innerHTML = unlimited
      ? `<b>Ask anything you like</b>, or head to your computer when you're ready.`
      : left > 0 ? `You can ask <b>${HH.plural(left, "more question")}</b>${coop ? " (shared with your team)" : ""}. Choose wisely!` : `<b>You're out of questions.</b> Time to find them a home!`;
    $("#dlg-prog").textContent = "";
    panel.classList.remove("hidden");
    panel.closest(".dialog").classList.add("asking");
    panel.closest(".office-scene").classList.add("asking");
    panel.innerHTML = `<div class="ask-grid">${HH.TOPICS.map((t) => {
      const asked = g.revealed[t.key];
      return `<button class="ask-btn ${asked ? "asked" : ""}" data-topic="${t.key}" title="${esc(t.q)}" ${asked || (left <= 0 && !unlimited) ? "disabled" : ""}><span class="qh"><span class="qi">${asked ? "✅" : t.icon}</span>${SHORT[t.key] || ""}</span><span class="qq">${esc(t.q)}</span></button>`;
    }).join("")}</div>
      <div class="row" style="margin-top:10px"><span class="small muted">${unlimited ? "Easy mode: every answer is optional flavor." : "Answers are added to your brief."}</span><span class="spacer"></span><button class="btn btn-primary" data-computer>💻 Head to the computer ▸</button></div>`;
    HH.$$("[data-topic]", panel).forEach((b) => b.addEventListener("click", () => {
      HH.sfx("click");
      if (coop) { G().ask(b.dataset.topic); b.disabled = true; return; }
      G().ask(b.dataset.topic);
    }));
    panel.querySelector("[data-computer]").addEventListener("click", () => goToComputer());
    UI.coach.done("meet-talk");
    UI.coach("meet-brief", ".meeting-side [data-brief] .brief", "Everything your client asked for is saved here in your <b>Meeting notes</b>. It follows you to the computer, so no need to memorize it.", { side: "left" });
    UI.coach("meet-ask", "#ask-panel .ask-grid", unlimited
      ? "On <b>Easy</b>, clients tell you everything up front. Ask questions just for fun, or skip ahead."
      : `Some wants are <b>hidden</b>! You get <b>${HH.plural(c.questions, "question")}</b> to uncover them. Pick the topics that match the client's 💡 hints.`, { side: "above", align: "start" });
    UI.coach("meet-go", "#ask-panel [data-computer]", "When you're ready, <b>head to the computer</b> to search the listings.", { side: "above", align: "end" });
  }

  function goToComputer() {
    const g = G();
    if (g.phase !== "meeting") return;
    clearInterval(D.timer);
    D.onDone = null;
    g.phase = "search";
    UI.coach.done("meet-go"); UI.coach.done("meet-talk");
    HH.sfx("whoosh");
    UI.site.open();
  }

  // reveal handling (local asks animate; teammates' asks just log)
  HH.on("revealed", ({ topic, by }) => {
    const g = G();
    if (!g.client) return;
    const t = HH.TOPICS.find((x) => x.key === topic);
    const answers = g.client.answers[topic] || [];
    const mine = by === g.myId();
    const byName = (g.player(by) || {}).name || "A teammate";
    const hadHidden = g.client.reqs.some((q) => q.hidden && q.topic === topic) || (topic === "work" && g.client.commute && g.client.commute.hidden) || (topic === "budget" && g.client.budget.stretch);
    if (UI.current === "meeting" && g.phase === "meeting" && mine) {
      addLog(t.q, "me");
      const panel = $("#ask-panel");
      if (panel) { panel.classList.add("hidden"); panel.closest(".dialog").classList.remove("asking"); panel.closest(".office-scene").classList.remove("asking"); }
      say(answers, () => { renderBrief(); showQuestions(); });
      if (hadHidden) setTimeout(() => HH.sfx("pop"), 200);
    } else if (UI.current === "meeting" && g.phase === "meeting") {
      // a teammate asked: log it quietly without interrupting this player's dialogue
      addLog(`${byName} asked: "${t.q}"`, "me");
      answers.forEach((a) => addLog(a, "client", "reveal"));
      const panel = $("#ask-panel");
      if (panel && !panel.classList.contains("hidden")) showQuestions();
      UI.toast(`${esc(byName)} asked: <i>${esc(t.q)}</i>`, "", t.icon, 3500);
    } else {
      if (!mine) UI.toast(`${esc(byName)} asked the client: <i>${esc(t.q)}</i><br>${esc(answers.join(" "))}`, "", t.icon, 6000);
    }
    renderBrief();
    // achievement: uncovered everything
    const c = g.client;
    const allKnown = c.reqs.every((q) => !q.hidden || g.revealed[q.topic]) && !(c.commute && c.commute.hidden && !g.revealed.work);
    const hadAny = c.reqs.some((q) => q.hidden) || (c.commute && c.commute.hidden);
    if (allKnown && hadAny && c.diff !== "easy") UI.unlock("mind");
  });
})(window.HH);
