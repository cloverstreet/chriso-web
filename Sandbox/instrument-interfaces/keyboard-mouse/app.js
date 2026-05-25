// app.js — audio engine, keyboard rendering, and input wiring.
// Self-contained except for two house-standard reusables loaded by the page:
//   /widgets/audio-widgets.{css,js}  (MeterStrip output fader/meter)
// Polyphonic ADSR voice per held key — the envelope/voice approach borrowed
// from TestCases/lfo-adsr-test (oscillator → ADSR amp → out), here in plain
// Web Audio so the tool stays light. Follows the chriso.org mobile-unlock +
// hidden-tab auto-mute conventions.

(function () {
  const M = window.Models;

  // ---- audio engine ------------------------------------------------------
  const Engine = (function () {
    let ctx = null, master = null, gate = null, muted = false;
    let wave = "triangle";
    const voices = new Map(); // id -> { o, vca }

    // ADSR (seconds / 0..1), in the spirit of lfo-adsr-test's AmplitudeEnvelope
    // but with a higher sustain so held keys ring audibly like a real keyboard.
    const env = { a: 0.012, d: 0.12, s: 0.6, r: 0.35 };
    const PEAK = 0.32; // per-voice attack peak (pre-master)

    // shared vibrato LFO → every voice's detune (cents)
    let lfo = null, lfoDepth = null;
    const vib = { on: false, rate: 5.5, depth: 14 }; // Hz, cents

    function ensure() {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 1.0;
        gate = ctx.createGain(); gate.gain.value = 1;
        master.connect(gate); gate.connect(ctx.destination);
        lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = vib.rate;
        lfoDepth = ctx.createGain(); lfoDepth.gain.value = vib.on ? vib.depth : 0;
        lfo.connect(lfoDepth); lfo.start();
      }
      if (ctx.state === "suspended" && !muted) ctx.resume();
      return ctx;
    }
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

    function noteOn(id, hz) {
      const c = ensure();
      if (voices.has(id)) return;
      const t = c.currentTime;
      const vca = c.createGain();
      vca.gain.setValueAtTime(0, t);
      vca.gain.linearRampToValueAtTime(PEAK, t + env.a);            // attack
      vca.gain.setTargetAtTime(PEAK * env.s, t + env.a, env.d / 3); // decay → sustain
      vca.connect(master);
      const o = c.createOscillator();
      o.type = wave;
      o.frequency.value = hz;
      if (lfoDepth) lfoDepth.connect(o.detune); // vibrato
      o.connect(vca);
      o.start(t);
      voices.set(id, { o, vca });
    }
    function noteOff(id) {
      const v = voices.get(id);
      if (!v) return;
      voices.delete(id);
      const t = ctx.currentTime;
      v.vca.gain.cancelScheduledValues(t);
      v.vca.gain.setValueAtTime(v.vca.gain.value, t);
      v.vca.gain.setTargetAtTime(0, t, env.r / 3);  // release
      v.o.stop(t + env.r * 3 + 0.05);
    }
    function setWave(w) { wave = w; voices.forEach(v => { v.o.type = w; }); }
    function setEnv(k, val) { env[k] = val; }
    function setVib(on, rate, depth) {
      vib.on = on;
      if (rate != null) vib.rate = rate;
      if (depth != null) vib.depth = depth;
      if (lfo) lfo.frequency.value = vib.rate;
      if (lfoDepth) lfoDepth.gain.value = vib.on ? vib.depth : 0;
    }
    return { ensure, noteOn, noteOff, setWave, setEnv, setVib,
             masterNode: () => { ensure(); return master; } };
  })();

  // ---- state -------------------------------------------------------------
  const state = {
    layout: "piano",
    system: "chromatic",
    octave: 0,
    map: {},
    down: new Set(),
  };

  function rebuild() {
    const sys = M.NOTE_SYSTEMS[state.system];
    const layout = M.LAYOUTS[state.layout];
    const built = layout.build(sys);
    const shift = state.octave * sys.stepsPerPeriod;
    state.map = {};
    built.rows.forEach(row => row.forEach(it => {
      const step = it.step + shift;
      state.map[it.code] = { step, freq: sys.stepToFreq(step) };
    }));
    renderKeyboard(built, sys, layout);
    renderInfo(built, sys, layout);
  }

  function renderKeyboard(built, sys, layout) {
    const kb = document.getElementById("keyboard");
    kb.innerHTML = "";
    const display = built.rows.slice().reverse();
    display.forEach((row) => {
      const physRow = row.length ? row[0].row : 0;
      const rowEl = document.createElement("div");
      rowEl.className = "krow";
      rowEl.style.marginLeft = (M.ROW_STAGGER[physRow] * 44) + "px";
      row.forEach(it => {
        const m = state.map[it.code];
        const lab = M.labelFreq(m.freq);
        const hue = M.hueForFreq(m.freq, sys);
        const key = document.createElement("div");
        key.className = "key";
        key.dataset.code = it.code;
        key.style.setProperty("--hue", hue.toFixed(0));
        key.innerHTML =
          `<span class="cap">${M.CAP[it.code] || ""}</span>` +
          `<span class="note">${lab.name}<sub>${lab.dev}</sub></span>` +
          `<span class="hz">${m.freq.toFixed(1)}</span>`;
        key.addEventListener("pointerdown", (e) => { e.preventDefault(); press(it.code); });
        key.addEventListener("pointerup", () => release(it.code));
        key.addEventListener("pointerleave", () => { if (state.down.has(it.code)) release(it.code); });
        rowEl.appendChild(key);
      });
      kb.appendChild(rowEl);
    });
  }

  function renderInfo(built, sys, layout) {
    document.getElementById("layoutDesc").textContent = layout.desc;
    document.getElementById("sysDesc").textContent = sys.blurb;
    const gensEl = document.getElementById("gens");
    if (built.gens) {
      gensEl.style.display = "";
      gensEl.innerHTML =
        `<b>Generators</b> (snapped to ${sys.name.split(" ·")[0]}): ` +
        `<span class="gen">${built.gens.colLabel} = ${built.gens.colGen} step${Math.abs(built.gens.colGen)===1?"":"s"}</span> · ` +
        `<span class="gen">${built.gens.rowLabel} = ${built.gens.rowGen} step${Math.abs(built.gens.rowGen)===1?"":"s"}</span>`;
    } else {
      gensEl.style.display = "none";
    }
    document.getElementById("octLabel").textContent =
      state.octave === 0 ? "0" : (state.octave > 0 ? "+" + state.octave : "" + state.octave);
  }

  function press(code) {
    const m = state.map[code];
    if (!m || state.down.has(code)) return;
    state.down.add(code);
    Engine.noteOn(code, m.freq);
    const el = document.querySelector(`.key[data-code="${code}"]`);
    if (el) el.classList.add("on");
  }
  function release(code) {
    if (!state.down.has(code)) return;
    state.down.delete(code);
    Engine.noteOff(code);
    const el = document.querySelector(`.key[data-code="${code}"]`);
    if (el) el.classList.remove("on");
  }

  window.addEventListener("keydown", (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === "ArrowUp") { e.preventDefault(); bumpOctave(1); return; }
    if (e.code === "ArrowDown") { e.preventDefault(); bumpOctave(-1); return; }
    if (state.map[e.code]) { e.preventDefault(); press(e.code); }
  });
  window.addEventListener("keyup", (e) => {
    if (state.map[e.code]) { e.preventDefault(); release(e.code); }
  });
  window.addEventListener("blur", () => { [...state.down].forEach(release); });

  function bumpOctave(d) {
    state.octave = Math.max(-3, Math.min(3, state.octave + d));
    [...state.down].forEach(release);
    rebuild();
  }

  function init() {
    const laySel = document.getElementById("layout");
    const sysSel = document.getElementById("system");
    Object.entries(M.LAYOUTS).forEach(([k, v]) => {
      const o = document.createElement("option"); o.value = k; o.textContent = v.name; laySel.appendChild(o);
    });
    Object.entries(M.NOTE_SYSTEMS).forEach(([k, v]) => {
      const o = document.createElement("option"); o.value = k; o.textContent = v.name; sysSel.appendChild(o);
    });
    laySel.value = state.layout;
    sysSel.value = state.system;
    laySel.addEventListener("change", () => { [...state.down].forEach(release); state.layout = laySel.value; rebuild(); });
    sysSel.addEventListener("change", () => { [...state.down].forEach(release); state.system = sysSel.value; rebuild(); });

    document.getElementById("wave").addEventListener("change", (e) => Engine.setWave(e.target.value));
    document.getElementById("octUp").addEventListener("click", () => bumpOctave(1));
    document.getElementById("octDown").addEventListener("click", () => bumpOctave(-1));
    document.getElementById("refsBtn").addEventListener("click", () => {
      document.getElementById("refs").classList.toggle("open");
    });

    // ADSR sliders
    const adsr = [
      ["envA", "a", 1000, "ms"], ["envD", "d", 1000, "ms"],
      ["envS", "s", 1, ""],      ["envR", "r", 1000, "ms"],
    ];
    adsr.forEach(([id, key, scale, unit]) => {
      const el = document.getElementById(id), out = document.getElementById(id + "v");
      const show = () => out.textContent = (scale === 1 ? (+el.value).toFixed(2) : Math.round(el.value * scale) + unit);
      el.addEventListener("input", () => { Engine.setEnv(key, +el.value); show(); });
      show();
    });

    // vibrato
    const vOn = document.getElementById("vibOn"), vRate = document.getElementById("vibRate"), vDepth = document.getElementById("vibDepth");
    const applyVib = () => {
      Engine.setVib(vOn.checked, +vRate.value, +vDepth.value);
      document.getElementById("vibRatev").textContent = (+vRate.value).toFixed(1) + " Hz";
      document.getElementById("vibDepthv").textContent = Math.round(vDepth.value) + "¢";
    };
    [vOn, vRate, vDepth].forEach(el => el.addEventListener("input", applyVib));
    applyVib();

    Engine.setWave(document.getElementById("wave").value);

    // MeterStrip output fader/meter (house widget)
    if (window.AudioWidgets) {
      const master = Engine.masterNode();
      const strip = new AudioWidgets.MeterStrip(
        document.getElementById("meter"), master,
        { label: "OUTPUT", gainNode: master, gainMin: -48, gainMax: 6, gainDefault: 0, height: 64 }
      );
      strip.start();
    }

    rebuild();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
