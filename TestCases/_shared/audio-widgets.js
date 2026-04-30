/* ─────────────────────────────────────────────────────────────────────────
   audio-widgets.js
   MeterStrip — the canonical gain/meter widget extracted from FX Processor.
   Same visual + interaction spec as fx-processor/index.html, packaged so any
   page can drop in <script src="../_shared/audio-widgets.js"></script> and
   instantiate consistent widgets.

   Usage:
     const strip = new MeterStrip(containerEl, sourceNode, {
       label: 'OUTPUT', gainNode: outputGain,
       gainMin: -60, gainMax: 12, gainDefault: 0,
       onGainChange: db => console.log('gain', db),
     });
     strip.start();
     // … later …
     strip.destroy();

   Notes:
   - `sourceNode` is what the meter measures. Pass a Web Audio node that has
     audio flowing through it (e.g. a GainNode, MediaStreamAudioSourceNode).
   - `gainNode` is what the slider thumb controls. May be the same as
     `sourceNode` (common case) or different (e.g. measure pre-gain, control
     post-gain).
   - `stereo: true` (default) splits the input via ChannelSplitter for L/R
     bars. If the source is mono both bars track the same level.
   ───────────────────────────────────────────────────────────────────────── */

(function (global) {
  'use strict';

  const dbToGain = db => Math.pow(10, db / 20);
  const gainToDb = g  => 20 * Math.log10(Math.max(g, 1e-6));

  class MeterStrip {
    constructor(container, sourceNode, opts = {}) {
      if (!container) throw new Error('MeterStrip: container required');
      if (!sourceNode) throw new Error('MeterStrip: sourceNode required');

      this.container   = container;
      this.sourceNode  = sourceNode;
      this.audioCtx    = sourceNode.context;
      this.gainNode    = opts.gainNode || null;
      this.label       = opts.label || 'GAIN';
      this.gainMin     = opts.gainMin ?? -60;
      this.gainMax     = opts.gainMax ?? 12;
      this.gainDefault = opts.gainDefault ?? 0;
      this.stereo      = opts.stereo !== false;
      this.mode        = opts.mode || (this.gainNode ? 'gain' : 'level');
      this.showClip    = opts.showClip !== false;
      this.showReadout = opts.showReadout !== false;
      this.peakHoldMs  = opts.peakHoldMs ?? 1600;
      this.height      = opts.height || 80;
      this.onGainChange = opts.onGainChange || (() => {});

      // Display range for level mapping. Bottom of bar = gainMin, top = gainMax.
      // 0 dB sits at (0 - gainMin)/(gainMax - gainMin) up from bottom.
      this._zeroDbPct = ((0 - this.gainMin) / (this.gainMax - this.gainMin)) * 100;

      this._buildDom();
      this._buildAudio();
      this._attachEvents();

      // Initial gain value from gainNode, or default
      const initDb = this.gainNode
        ? gainToDb(this.gainNode.gain.value)
        : this.gainDefault;
      this.setGainDb(initDb, false);

      this._rafId = null;
      this._peakL = 0; this._peakR = 0;
      this._peakLTime = 0; this._peakRTime = 0;
      this._buf = new Float32Array(1024);
    }

    _buildDom() {
      const wrap = document.createElement('div');
      wrap.className = 'gain-strip';
      wrap.style.setProperty('--strip-height', this.height + 'px');
      wrap.innerHTML = `
        <div class="ctrl-row">
          <span class="ctrl-lbl">${this.label}</span>
          <span class="ctrl-val" data-role="gain-val">${this.gainDefault.toFixed(1)} dB</span>
        </div>
        <div class="meter-row">
          <div class="gain-meter-wrap" style="--zero-db:${this._zeroDbPct.toFixed(2)}%">
            <div class="gain-meter-bg">
              <div class="gain-meter-bar" data-bar="L">
                <div class="gain-meter-level" data-fill="L"></div>
                <div class="gain-meter-peak"  data-peak="L"></div>
              </div>
              ${this.stereo ? `
              <div class="gain-meter-bar" data-bar="R">
                <div class="gain-meter-level" data-fill="R"></div>
                <div class="gain-meter-peak"  data-peak="R"></div>
              </div>` : ''}
            </div>
            ${this.mode === 'gain' ? `
            <input type="range" class="gain-meter-slider"
                   min="${this.gainMin}" max="${this.gainMax}" step="0.5"
                   value="${this.gainDefault}">` : ''}
          </div>
          ${this.showClip ? `<span class="clip-dot" data-clip></span>` : ''}
        </div>
        ${this.showReadout ? `<div class="db-readout" data-readout>—</div>` : ''}
      `;
      this.container.appendChild(wrap);
      this.el = wrap;
      this.elGainVal = wrap.querySelector('[data-role="gain-val"]');
      this.elFillL   = wrap.querySelector('[data-fill="L"]');
      this.elFillR   = wrap.querySelector('[data-fill="R"]');
      this.elPeakL   = wrap.querySelector('[data-peak="L"]');
      this.elPeakR   = wrap.querySelector('[data-peak="R"]');
      this.elSlider  = wrap.querySelector('.gain-meter-slider');
      this.elClip    = wrap.querySelector('[data-clip]');
      this.elReadout = wrap.querySelector('[data-readout]');
    }

    _buildAudio() {
      // Build a tap from sourceNode → splitter (if stereo) → analyser(s).
      // We do NOT route this anywhere downstream — caller's main signal path
      // is unchanged. We're a passive listener.
      if (this.stereo) {
        this.splitter   = this.audioCtx.createChannelSplitter(2);
        this.analyserL  = this.audioCtx.createAnalyser();
        this.analyserR  = this.audioCtx.createAnalyser();
        this.analyserL.fftSize = 1024; this.analyserL.smoothingTimeConstant = 0;
        this.analyserR.fftSize = 1024; this.analyserR.smoothingTimeConstant = 0;
        this.sourceNode.connect(this.splitter);
        this.splitter.connect(this.analyserL, 0);
        this.splitter.connect(this.analyserR, 1);
      } else {
        this.analyserL = this.audioCtx.createAnalyser();
        this.analyserL.fftSize = 1024; this.analyserL.smoothingTimeConstant = 0;
        this.sourceNode.connect(this.analyserL);
      }
    }

    _attachEvents() {
      if (this.elSlider) {
        this.elSlider.addEventListener('input', () => {
          const db = parseFloat(this.elSlider.value);
          this._applyGain(db);
        });
        // Double-click to reset to 0 dB (FX Processor convention)
        this.elSlider.addEventListener('dblclick', () => this.setGainDb(0));
      }
      if (this.elGainVal) {
        // Click-to-type on the dB value, FX Processor convention
        this.elGainVal.addEventListener('click', () => this._editGainValue());
      }
    }

    _editGainValue() {
      const cur = this.elGainVal.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = parseFloat(cur).toFixed(1);
      input.style.cssText = 'width:60px; font-size:.72rem; text-align:right; background:#0a0a0a; border:1px solid var(--amber); color:var(--amber); font-family:inherit;';
      this.elGainVal.replaceWith(input);
      input.focus(); input.select();
      const commit = () => {
        const db = parseFloat(input.value);
        if (isFinite(db)) this.setGainDb(db);
        const span = document.createElement('span');
        span.className = 'ctrl-val';
        span.dataset.role = 'gain-val';
        span.textContent = (isFinite(db) ? db : parseFloat(cur)).toFixed(1) + ' dB';
        span.addEventListener('click', () => this._editGainValue());
        input.replaceWith(span);
        this.elGainVal = span;
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') { input.value = parseFloat(cur); input.blur(); }
      });
    }

    _applyGain(db) {
      const clamped = Math.max(this.gainMin, Math.min(this.gainMax, db));
      if (this.gainNode) this.gainNode.gain.value = dbToGain(clamped);
      if (this.elGainVal) this.elGainVal.textContent = clamped.toFixed(1) + ' dB';
      this.onGainChange(clamped);
    }

    setGainDb(db, fireCallback = true) {
      const clamped = Math.max(this.gainMin, Math.min(this.gainMax, db));
      if (this.elSlider) this.elSlider.value = clamped;
      if (this.gainNode) this.gainNode.gain.value = dbToGain(clamped);
      if (this.elGainVal) this.elGainVal.textContent = clamped.toFixed(1) + ' dB';
      if (fireCallback) this.onGainChange(clamped);
    }

    start() {
      if (this._rafId) return;
      const tick = () => {
        this._rafId = requestAnimationFrame(tick);
        this._update();
      };
      tick();
    }

    stop() {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    _update() {
      const now = performance.now();
      // L
      this.analyserL.getFloatTimeDomainData(this._buf);
      let peak = 0;
      for (let i = 0; i < this._buf.length; i++) {
        const v = Math.abs(this._buf[i]);
        if (v > peak) peak = v;
      }
      const dbL = gainToDb(peak);
      this._renderBar(dbL, peak, 'L', now);

      if (this.stereo) {
        this.analyserR.getFloatTimeDomainData(this._buf);
        peak = 0;
        for (let i = 0; i < this._buf.length; i++) {
          const v = Math.abs(this._buf[i]);
          if (v > peak) peak = v;
        }
        const dbR = gainToDb(peak);
        this._renderBar(dbR, peak, 'R', now);
        if (this.elReadout) {
          this.elReadout.textContent = dbL.toFixed(1) + ' / ' + dbR.toFixed(1) + ' dB';
        }
      } else if (this.elReadout) {
        this.elReadout.textContent = dbL.toFixed(1) + ' dB';
      }

      // Clip detection (any channel ≥ -0.5 dBFS)
      if (this.elClip) {
        const clip = this.stereo
          ? (this._lastDbL >= -0.5 || this._lastDbR >= -0.5)
          : (this._lastDbL >= -0.5);
        this.elClip.classList.toggle('clip', clip);
      }
    }

    _renderBar(db, rawPeak, side, now) {
      // Map db (gainMin..gainMax) → 0..1
      const pct = Math.max(0, Math.min(1, (db - this.gainMin) / (this.gainMax - this.gainMin)));
      const fillEl = side === 'L' ? this.elFillL : this.elFillR;
      const peakEl = side === 'L' ? this.elPeakL : this.elPeakR;
      if (fillEl) fillEl.style.height = (pct * 100) + '%';

      // Peak hold
      const lastPeakKey = '_peak' + side;
      const lastTimeKey = '_peak' + side + 'Time';
      if (rawPeak >= this[lastPeakKey] || (now - this[lastTimeKey]) > this.peakHoldMs) {
        if (rawPeak >= this[lastPeakKey]) this[lastTimeKey] = now;
        this[lastPeakKey] = rawPeak;
      } else {
        // Decay slowly after hold
        if ((now - this[lastTimeKey]) > this.peakHoldMs) {
          this[lastPeakKey] *= 0.92;
        }
      }
      const peakDb = gainToDb(this[lastPeakKey]);
      const peakPct = Math.max(0, Math.min(1, (peakDb - this.gainMin) / (this.gainMax - this.gainMin)));
      if (peakEl) {
        peakEl.style.bottom = (peakPct * 100) + '%';
        peakEl.classList.toggle('active', this[lastPeakKey] > 1e-4);
      }

      this['_lastDb' + side] = db;
    }

    destroy() {
      this.stop();
      try { this.sourceNode.disconnect(this.splitter || this.analyserL); } catch(e) {}
      try { if (this.splitter) this.splitter.disconnect(); } catch(e) {}
      try { this.analyserL.disconnect(); } catch(e) {}
      try { if (this.analyserR) this.analyserR.disconnect(); } catch(e) {}
      if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    }
  }

  /* ── HMeter — horizontal level-only meter (compact rows) ─────────────── */
  class HMeter {
    constructor(container, sourceNode, opts = {}) {
      this.container = container;
      this.audioCtx = sourceNode.context;
      this.sourceNode = sourceNode;
      this.dbMin = opts.dbMin ?? -60;
      this.dbMax = opts.dbMax ?? 0;

      const el = document.createElement('div');
      el.className = 'hmeter';
      el.innerHTML = '<div class="hmeter-fill"></div>';
      container.appendChild(el);
      this.el = el;
      this.fillEl = el.querySelector('.hmeter-fill');

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024; this.analyser.smoothingTimeConstant = 0;
      sourceNode.connect(this.analyser);
      this._buf = new Float32Array(this.analyser.fftSize);
      this._rafId = null;
    }

    start() {
      if (this._rafId) return;
      const tick = () => {
        this._rafId = requestAnimationFrame(tick);
        this.analyser.getFloatTimeDomainData(this._buf);
        let peak = 0;
        for (let i = 0; i < this._buf.length; i++) {
          const v = Math.abs(this._buf[i]); if (v > peak) peak = v;
        }
        const db = gainToDb(peak);
        const pct = Math.max(0, Math.min(1, (db - this.dbMin) / (this.dbMax - this.dbMin)));
        this.fillEl.style.width = (pct * 100) + '%';
      };
      tick();
    }
    stop() { if (this._rafId) cancelAnimationFrame(this._rafId); this._rafId = null; }
    destroy() {
      this.stop();
      try { this.sourceNode.disconnect(this.analyser); } catch(e) {}
      if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    }
  }

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  // Standard mic constraints (DSP forced off, used everywhere in tellofoam).
  function micConstraints(deviceId, channelCount = 1) {
    const c = {
      sampleRate: { ideal: 48000 },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    };
    if (channelCount > 1) c.channelCount = { ideal: channelCount };
    if (deviceId) c.deviceId = { exact: deviceId };
    return { audio: c };
  }

  // Format a deviceInfo entry for a <select>. Handles "default" pseudo-device
  // by stripping the "Default - " prefix and labeling cleanly.
  function formatDeviceLabel(d, fallbackIdx, kind) {
    if (d.deviceId === 'default' || d.deviceId === '') {
      const clean = (d.label || '').replace(/^Default\s*[-–]\s*/i, '').trim();
      return clean ? `Default (System) — ${clean}` : 'Default (System)';
    }
    return d.label || `${kind} ${fallbackIdx + 1}`;
  }

  function deviceIdValue(d) {
    return (d.deviceId === 'default' || d.deviceId === '') ? '' : d.deviceId;
  }

  /* ── Output channel-pair routing (FX Processor pattern) ──────────────── */
  // Wires: sourceNode → splitter(2) → merger(maxCh) → audioCtx.destination
  // Returns { split, merge, setPair(pairStart) } so caller can re-route on UI change.
  function makeOutputRouter(audioCtx, sourceNode, initialPair = [0, 1]) {
    const maxCh = audioCtx.destination.maxChannelCount || 2;
    try {
      audioCtx.destination.channelCount          = Math.min(maxCh, audioCtx.destination.maxChannelCount);
      audioCtx.destination.channelCountMode      = 'explicit';
      audioCtx.destination.channelInterpretation = 'discrete';
    } catch (e) { console.warn('makeOutputRouter destination config:', e); }

    let split = audioCtx.createChannelSplitter(2);
    let merge = audioCtx.createChannelMerger(Math.max(2, initialPair[1] + 1));
    let connectedToDest = false;
    let currentPair = initialPair.slice();

    function rewire(pair) {
      try { split.disconnect(); } catch (e) {}
      try { merge.disconnect(); } catch (e) {}
      split = audioCtx.createChannelSplitter(2);
      merge = audioCtx.createChannelMerger(Math.max(2, pair[1] + 1));
      try { sourceNode.disconnect(); } catch (e) {}
      sourceNode.connect(split);
      split.connect(merge, 0, pair[0]);
      split.connect(merge, 1, pair[1]);
      if (connectedToDest) merge.connect(audioCtx.destination);
      currentPair = pair.slice();
    }

    sourceNode.connect(split);
    split.connect(merge, 0, currentPair[0]);
    split.connect(merge, 1, currentPair[1]);

    return {
      get split() { return split; },
      get merge() { return merge; },
      setPair(pair) { rewire(pair); },
      enable() { try { merge.connect(audioCtx.destination); } catch (e) {} connectedToDest = true; },
      disable() { try { merge.disconnect(audioCtx.destination); } catch (e) {} connectedToDest = false; },
      get maxCh() { return audioCtx.destination.maxChannelCount || 2; },
    };
  }

  /* ── Channel-pair <select> populator ─────────────────────────────────── */
  function populateChannelPairs(selectEl, maxCh) {
    const prev = selectEl.value;
    selectEl.innerHTML = '';
    for (let i = 0; i < maxCh; i += 2) {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = 'Ch ' + (i + 1) + '–' + (i + 2);
      selectEl.appendChild(o);
    }
    if (prev && [...selectEl.options].some(o => o.value === prev)) selectEl.value = prev;
  }

  /* ── Public exports ───────────────────────────────────────────────────── */
  global.AudioWidgets = {
    MeterStrip,
    HMeter,
    micConstraints,
    formatDeviceLabel,
    deviceIdValue,
    makeOutputRouter,
    populateChannelPairs,
    dbToGain,
    gainToDb,
  };
})(typeof window !== 'undefined' ? window : globalThis);
