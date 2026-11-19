// Synthesized sound effects and a gentle background music loop (Web Audio, no files).
(function (HH) {
  "use strict";
  let ctx = null, master = null, sfxGain = null, musicGain = null;
  const settings = HH.store.get("audio", { sfx: 0.7, music: 0.25, muted: false });

  function ensure() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.connect(master);
    apply();
    return true;
  }
  function apply() {
    if (!ctx) return;
    master.gain.value = settings.muted ? 0 : 1;
    sfxGain.gain.value = settings.sfx;
    musicGain.gain.value = settings.music * 0.5;
  }

  function tone(freq, start, dur, opts) {
    opts = opts || {};
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type || "sine";
    o.frequency.setValueAtTime(freq, start);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, start + dur);
    const v = opts.vol == null ? 0.3 : opts.vol;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(v, start + (opts.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(opts.out || sfxGain);
    o.start(start);
    o.stop(start + dur + 0.05);
  }
  function noise(start, dur, vol, filterFreq) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = filterFreq || 3000;
    const g = ctx.createGain();
    g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(start);
  }

  const SFX = {
    click(t) { tone(660, t, 0.06, { type: "triangle", vol: 0.15 }); },
    hover(t) { tone(880, t, 0.03, { type: "sine", vol: 0.04 }); },
    blip(t) { tone(520 + Math.random() * 140, t, 0.035, { type: "square", vol: 0.025 }); },
    doorbell(t) { tone(659, t, 0.7, { vol: 0.25 }); tone(523, t + 0.45, 0.9, { vol: 0.25 }); },
    pop(t) { tone(500, t, 0.09, { type: "sine", vol: 0.2, slide: 900 }); },
    save(t) { tone(700, t, 0.07, { type: "triangle", vol: 0.15 }); tone(1050, t + 0.07, 0.1, { type: "triangle", vol: 0.15 }); },
    remove(t) { tone(600, t, 0.08, { type: "triangle", vol: 0.12, slide: 350 }); },
    cash(t) {
      noise(t, 0.08, 0.25, 2500);
      tone(1318, t + 0.08, 0.5, { type: "triangle", vol: 0.22 });
      tone(1760, t + 0.16, 0.6, { type: "triangle", vol: 0.2 });
      tone(2637, t + 0.24, 0.7, { type: "sine", vol: 0.12 });
    },
    success(t) { [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.11, 0.4, { type: "triangle", vol: 0.2 })); },
    fail(t) { [392, 370, 349, 311].forEach((f, i) => tone(f, t + i * 0.22, 0.32, { type: "sawtooth", vol: 0.07 })); },
    tick(t) { tone(1200, t, 0.03, { type: "square", vol: 0.05 }); },
    warn(t) { tone(880, t, 0.12, { type: "square", vol: 0.08 }); tone(880, t + 0.18, 0.12, { type: "square", vol: 0.08 }); },
    join(t) { tone(587, t, 0.12, { type: "triangle", vol: 0.15 }); tone(880, t + 0.1, 0.18, { type: "triangle", vol: 0.15 }); },
    leave(t) { tone(587, t, 0.12, { type: "triangle", vol: 0.12 }); tone(392, t + 0.1, 0.2, { type: "triangle", vol: 0.12 }); },
    drum(t) { for (let i = 0; i < 14; i++) noise(t + i * 0.07, 0.06, 0.12 + i * 0.01, 300); },
    whoosh(t) { noise(t, 0.35, 0.12, 900); },
    type(t) { noise(t, 0.02, 0.06, 4000); },
  };

  HH.sfx = function (name) {
    try {
      if (settings.muted || settings.sfx <= 0) return;
      if (!ensure()) return;
      const fn = SFX[name];
      if (fn) fn(ctx.currentTime + 0.01);
    } catch (e) { /* audio is optional */ }
  };

  // ---------- background music: mellow jazz-ish chord loop ----------
  let musicTimer = null, musicOn = false, step = 0;
  const CHORDS = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0], // Am7
    [293.66, 349.23, 440.0, 523.25], // Dm7
    [196.0, 246.94, 293.66, 349.23], // G7
  ];
  const MELODY = [659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440, 523.25, 587.33, 493.88, 523.25, 587.33, 392];
  function playBar() {
    if (!musicOn || !ctx) return;
    const t = ctx.currentTime + 0.05;
    const chord = CHORDS[step % CHORDS.length];
    chord.forEach((f, i) => tone(f / 2, t + i * 0.015, 2.3, { type: "sine", vol: 0.05, attack: 0.08, out: musicGain }));
    tone(chord[0] / 4, t, 0.5, { type: "triangle", vol: 0.09, out: musicGain });
    tone(chord[2] / 4, t + 1.2, 0.5, { type: "triangle", vol: 0.07, out: musicGain });
    for (let i = 0; i < 4; i++) {
      if (Math.random() < 0.55) tone(MELODY[(step * 4 + i) % MELODY.length], t + i * 0.6 + 0.3, 0.45, { type: "triangle", vol: 0.035, attack: 0.02, out: musicGain });
    }
    step++;
  }
  HH.music = {
    start() {
      if (musicOn) return;
      if (!ensure()) return;
      musicOn = true;
      playBar();
      musicTimer = setInterval(playBar, 2400);
    },
    stop() { musicOn = false; clearInterval(musicTimer); },
    get on() { return musicOn; },
  };

  HH.audioSettings = settings;
  HH.setAudio = function (patch) {
    Object.assign(settings, patch);
    HH.store.set("audio", settings);
    apply();
    if (settings.music > 0 && !settings.muted) HH.music.start();
    if (settings.music <= 0) HH.music.stop();
  };
  // unlock audio on first interaction
  const unlock = () => {
    ensure();
    if (settings.music > 0 && !settings.muted) HH.music.start();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
})(window.HH);
