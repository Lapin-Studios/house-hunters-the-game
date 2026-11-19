// Procedural SVG avatars for clients and agents.
(function (HH) {
  "use strict";
  HH.art = HH.art || {};
  const shade = (c, a) => HH.shade(c, a);

  // mood: happy | neutral | sad | wow | meh | talk
  HH.art.person = function (av, opts) {
    opts = opts || {};
    const mood = opts.mood || "neutral";
    const size = opts.size || 120;
    const skin = av.skin, hair = av.hair, shirt = av.shirt;
    const senior = av.age >= 60;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="${size}" height="${Math.round(size * 140 / 120)}" class="person mood-${mood}">`;
    // back hair
    if (av.style === "long") s += `<path d="M30 60 Q28 112 44 118 H76 Q92 112 90 60 Z" fill="${hair}"/>`;
    if (av.style === "afro") s += `<circle cx="60" cy="50" r="38" fill="${hair}"/>`;
    if (av.style === "curly") s += `<g fill="${hair}"><circle cx="38" cy="44" r="14"/><circle cx="82" cy="44" r="14"/><circle cx="60" cy="30" r="18"/><circle cx="44" cy="30" r="12"/><circle cx="76" cy="30" r="12"/></g>`;
    if (av.style === "bun") s += `<circle cx="60" cy="16" r="11" fill="${hair}"/>`;
    if (av.style === "ponytail") s += `<path d="M84 46 q18 10 10 42 q-4 -18 -16 -26z" fill="${hair}"/>`;
    if (av.style === "bob") s += `<path d="M30 52 Q30 90 40 92 H80 Q90 90 90 52 Z" fill="${hair}"/>`;
    // body
    s += `<path d="M18 140 Q20 104 60 100 Q100 104 102 140 Z" fill="${shirt}"/>`;
    s += `<path d="M48 100 L60 116 L72 100" fill="none" stroke="${shade(shirt, -0.25)}" stroke-width="3"/>`;
    s += `<rect x="51" y="82" width="18" height="20" rx="6" fill="${shade(skin, -0.08)}"/>`;
    // head
    s += `<ellipse cx="33" cy="58" rx="5" ry="7" fill="${shade(skin, -0.06)}"/><ellipse cx="87" cy="58" rx="5" ry="7" fill="${shade(skin, -0.06)}"/>`;
    s += `<ellipse cx="60" cy="56" rx="27" ry="31" fill="${skin}"/>`;
    // front hair
    switch (av.style) {
      case "short": s += `<path d="M33 52 Q34 24 60 24 Q86 24 87 52 Q80 36 60 36 Q42 36 33 52Z" fill="${hair}"/>`; break;
      case "side": s += `<path d="M33 54 Q30 22 62 24 Q90 26 87 52 Q82 34 66 34 Q56 44 33 54Z" fill="${hair}"/>`; break;
      case "buzz": s += `<path d="M34 50 Q36 26 60 26 Q84 26 86 50 Q80 34 60 33 Q40 34 34 50Z" fill="${hair}" opacity=".85"/>`; break;
      case "quiff": s += `<path d="M33 52 Q30 20 58 18 Q74 12 86 26 Q90 36 87 52 Q82 34 62 32 Q44 36 33 52Z" fill="${hair}"/>`; break;
      case "bald": s += `<path d="M33 58 Q32 50 36 46 M84 46 Q88 50 87 58" stroke="${hair}" stroke-width="5" fill="none" stroke-linecap="round"/>`; break;
      case "long": case "bob": s += `<path d="M32 60 Q28 24 60 23 Q92 24 88 60 Q84 38 70 34 Q58 44 40 42 Q34 48 32 60Z" fill="${hair}"/>`; break;
      case "bun": case "ponytail": s += `<path d="M33 54 Q32 24 60 24 Q88 24 87 54 Q82 34 60 33 Q38 34 33 54Z" fill="${hair}"/>`; break;
      case "pixie": s += `<path d="M33 56 Q30 22 60 22 Q90 22 87 52 Q78 30 62 38 Q50 30 33 56Z" fill="${hair}"/>`; break;
      case "afro": s += `<path d="M34 46 Q60 30 86 46 Q84 30 60 28 Q36 30 34 46Z" fill="${hair}"/>`; break;
      case "curly": s += `<path d="M34 48 Q60 34 86 48 Q84 32 60 30 Q36 32 34 48Z" fill="${hair}"/>`; break;
    }
    if (av.beard) s += `<path d="M36 64 Q38 90 60 92 Q82 90 84 64 Q78 80 60 80 Q42 80 36 64Z" fill="${hair}" opacity=".9"/>`;
    // eyes & brows by mood
    const browY = mood === "sad" ? 44 : mood === "wow" ? 39 : 42;
    const browTilt = mood === "sad" ? -3 : mood === "meh" ? 2 : 0;
    s += `<path d="M42 ${browY + browTilt} L52 ${browY}" stroke="${shade(hair, -0.2)}" stroke-width="2.6" stroke-linecap="round"/><path d="M68 ${browY} L78 ${browY + browTilt}" stroke="${shade(hair, -0.2)}" stroke-width="2.6" stroke-linecap="round"/>`;
    const eyeR = mood === "wow" ? 4 : 3.2;
    s += `<g class="eyes"><ellipse cx="48" cy="54" rx="${eyeR}" ry="${mood === "happy" ? 2.2 : eyeR}" fill="#2b2b2b"/><ellipse cx="72" cy="54" rx="${eyeR}" ry="${mood === "happy" ? 2.2 : eyeR}" fill="#2b2b2b"/><circle cx="49.2" cy="52.8" r="1" fill="#fff"/><circle cx="73.2" cy="52.8" r="1" fill="#fff"/></g>`;
    if (av.glasses) s += `<g fill="none" stroke="#333" stroke-width="2"><circle cx="48" cy="54" r="8.5"/><circle cx="72" cy="54" r="8.5"/><path d="M56.5 54 H63.5"/></g>`;
    if (senior) s += `<path d="M40 62 q4 2 8 0 M72 62 q4 2 8 0" stroke="${shade(skin, -0.2)}" stroke-width="1" fill="none"/>`;
    // nose
    s += `<path d="M60 58 q-3 8 1 9" stroke="${shade(skin, -0.25)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    // cheeks
    if (mood === "happy" || mood === "wow") s += `<circle cx="42" cy="66" r="4.5" fill="#ff8a80" opacity=".35"/><circle cx="78" cy="66" r="4.5" fill="#ff8a80" opacity=".35"/>`;
    // mouth
    const m = {
      happy: `<path d="M48 72 Q60 84 72 72 Q60 78 48 72Z" fill="#7a2e2e" stroke="#7a2e2e" stroke-width="1.5" stroke-linejoin="round"/>`,
      neutral: `<path d="M51 74 Q60 77 69 74" stroke="#7a2e2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
      sad: `<path d="M50 78 Q60 70 70 78" stroke="#7a2e2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
      wow: `<ellipse cx="60" cy="76" rx="5" ry="6" fill="#7a2e2e"/>`,
      meh: `<path d="M51 75 L69 73" stroke="#7a2e2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
      talk: `<ellipse cx="60" cy="75" rx="6" ry="3.5" fill="#7a2e2e"/>`,
    }[mood] || "";
    s += `<g class="mouth">${m}</g>`;
    s += "</svg>";
    return s;
  };

  HH.art.agentAvatar = function (color, name) {
    const r = HH.rng(HH.hash(name || "agent"));
    const av = { skin: r.pick(["#f6d7c3", "#eac0a0", "#d9a27e", "#b97c56", "#8d5a3b", "#5e3b28"]), hair: r.pick(["#2b1d16", "#4a3123", "#b5783f", "#1c1c1c", "#d8b26e"]), style: r.pick(["short", "side", "bob", "long", "curly", "bun", "quiff", "afro", "pixie"]), shirt: color || "#e85d3f", glasses: r.chance(0.3), beard: false, age: 35 };
    return HH.art.person(av, { mood: "happy", size: 40 });
  };

  HH.moodFor = function (score) {
    if (score >= 88) return "wow";
    if (score >= 72) return "happy";
    if (score >= 55) return "neutral";
    if (score >= 40) return "meh";
    return "sad";
  };
})(window.HH);
