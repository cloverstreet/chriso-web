// Shared Web Audio synth for the notation test cases.
// Frequency-based on purpose: microtones are exact (just pass Hz),
// no MIDI / pitch-bend / tuning-table gymnastics required.
// Plain global (no ES module) so the pages run by double-clicking the HTML.

window.Synth = (function () {
  const MASTER_LEVEL = 0.55; // output level (turned down — was overloading)
  let ctx = null;
  let master = null; // user-controlled output gain (driven by MeterStrip)
  let gate = null;   // separate auto-mute gate (hidden tab), so the two don't fight
  let muted = false; // hidden-tab auto-mute state

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = MASTER_LEVEL;
      gate = ctx.createGain();
      gate.gain.value = 1;
      master.connect(gate);
      gate.connect(ctx.destination);
    }
    // Browsers start the context suspended until a user gesture.
    if (ctx.state === "suspended" && !muted) ctx.resume();
    return ctx;
  }

  // --- Mobile audio unlock (chriso.org standard) ---------------------
  // Resume inside a gesture handler, retry until running, then detach.
  // Listen on touchend AND click; do NOT use {once:true}.
  function unlock() {
    const tryResume = () => {
      ensure();
      ctx.resume().then(() => {
        if (ctx.state === "running") {
          document.removeEventListener("touchend", tryResume);
          document.removeEventListener("click", tryResume);
        }
      });
    };
    document.addEventListener("touchend", tryResume);
    document.addEventListener("click", tryResume);
  }

  // --- Auto-mute when tab hidden (chriso.org standard) ---------------
  function onVisibility() {
    if (!ctx) return;
    if (document.hidden) {
      muted = true;
      const t = ctx.currentTime;
      gate.gain.cancelScheduledValues(t);
      gate.gain.setTargetAtTime(0, t, 0.02);
      setTimeout(() => { if (document.hidden && ctx) ctx.suspend(); }, 80);
    } else {
      muted = false;
      ctx.resume().then(() => {
        const t = ctx.currentTime;
        gate.gain.cancelScheduledValues(t);
        gate.gain.setTargetAtTime(1, t, 0.02);
      });
    }
  }
  document.addEventListener("visibilitychange", onVisibility);
  unlock();

  // Partial sets define timbre. Each entry is [frequencyRatio, amplitude].
  // "gamelan" uses inharmonic partials to evoke struck bronze metallophones.
  const TIMBRES = {
    mallet: [[1, 1], [2, 0.4], [3, 0.15]],
    sine: [[1, 1]],
    gamelan: [[1, 1], [2.8, 0.55], [5.25, 0.32], [8.9, 0.16], [12.1, 0.08]],
  };

  // Play a single frequency. opts: {decay, timbre, gain, when}
  // `decay` = exponential decay TIME CONSTANT in seconds: a struck-and-
  // ringing tail (longer = rings longer), not a sustain plateau. `when` is
  // an absolute AudioContext time; omit for "now".
  function playFreq(hz, opts) {
    opts = opts || {};
    const c = ensure();
    const t0 = (opts.when != null ? opts.when : c.currentTime) + 0.001;
    const peak = opts.gain != null ? opts.gain : 0.25;
    const decay = opts.decay != null ? opts.decay : 0.4;
    const tail = decay * 6; // ring out to ~ -52 dB before we free the oscs
    const partials = TIMBRES[opts.timbre] || TIMBRES.mallet;

    const voice = c.createGain();
    voice.gain.value = 0;
    voice.connect(master);

    // Struck envelope: near-instant attack, then a natural exponential
    // ring-down governed by `decay` (no held sustain).
    const attack = 0.004;
    voice.gain.setValueAtTime(0, t0);
    voice.gain.linearRampToValueAtTime(peak, t0 + attack);
    voice.gain.setTargetAtTime(0, t0 + attack, decay);

    const oscs = [];
    for (const [ratio, amp] of partials) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = hz * ratio;
      const g = c.createGain();
      g.gain.value = amp;
      o.connect(g).connect(voice);
      o.start(t0);
      o.stop(t0 + attack + tail + 0.05);
      oscs.push(o);
    }
    return t0;
  }

  // Short noise/blip for "wrong answer" feedback.
  function buzz(opts) {
    opts = opts || {};
    const c = ensure();
    const t0 = c.currentTime + 0.001;
    const dur = 0.18;
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.value = 110;
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.18, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  return {
    ensure,
    now: () => ensure().currentTime,
    playFreq,
    buzz,
    timbres: () => Object.keys(TIMBRES),
    context: () => ensure(),
    masterNode: () => { ensure(); return master; }, // for MeterStrip (measure + control)
  };
})();
