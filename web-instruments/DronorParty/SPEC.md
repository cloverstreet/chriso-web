# DronorParty — KS String Synth Spec Sheet

One string-channel architecture, as of v0.18.1 (2026-05). Master-level FX
(reverb, ring modulator, output gain/mute) are intentionally NOT documented
here; this is just what a single string is and what knobs control it.

---

## Signal Flow (one string)

```
                       ┌──────────────┐
                       │   pluckKS    │
                       │ (noise burst)│
                       └──────┬───────┘
                              │
                              ▼
sympInput ──────────────►  sumNode  ◄─── feedback  ◄────┐
                              │                         │
                              ▼                         │
                            delay                       │
                       (delayTime = 1/freq)             │
                              │                         │
                              ▼                         │
                          loopFIR                       │
                    (2-tap [0.5, 0.5])                  │
                              │                         │
                       ┌──────┴──────┐                  │
                       ▼             ▼                  │
                  feedback(gain)  filter (LP)           │
                       │           "brightness"         │
                       │             │                  │
                       └─────────────┘                  │
                                     │                  │
                            ┌────────┴────────┐         │
                            ▼                 ▼         │
                          jwDry            haloDelay   ─┘  (loopFIR also taps here)
                            ▼                 │
                          shaper           haloFeedback (0.88)
                          (Jawari)             │
                            ▼                 ▼
                          jwWet            haloDelay (comb loop)
                            │                 │
                            └──────┬──────────┘
                                   ▼
                                  +───────► haloEnv (per-pluck envelope)
                                   ▼            │
                                 panner ◄───────┘
                                   │
                                   ▼
                                 strGain
                                   │
                                   ▼
                              splitter ─► aL / aR (per-string meters)
                                   │
                                   ▼
                            (to master bus)
```

The Karplus-Strong loop is the **delay + loopFIR + feedback** triangle.
Everything else is excitation in (top) or coloring out (right side).

---

## Controllable parameters — per string

| # | Knob | Range / Units | What it actually does | Where it lives |
|---|------|---------------|------------------------|----------------|
| 1 | **RATIO / DIVISOR** | integer pair | Frequency = base × ratio/divisor. Sets `delay.delayTime = 1 / freq`. | `delay.delayTime` |
| 2 | **OFFSET** | -100..+100 % | Per-string fine pitch offset around the ratio-derived freq (subtle detune apart from per-pluck DETUNE). | Multiplies into freq before delayTime |
| 3 | **HUMANIZE** | 0..100 % | Per-pluck timing jitter (delay of trigger by random ms before fire). | Adds setTimeout before pluckKS |
| 4 | **PATTERN** | string of 0–9 digits | Each digit is one step strength (0 = rest); pattern cycles. Drives `strength = (digit/9) × intensity`. | onTick / pluckKS arg |
| 5 | **INTENSITY** | 0..1 | Scales the pattern digit's strength into the burst amplitude. | pluckKS strength arg |
| 6 | **BRIGHTNESS** | 200..6000 Hz | BiquadFilter (lowpass, Q=0.5) cutoff, OUT OF the feedback loop. Higher = brighter string body. | `filter.frequency` |
| 7 | **DECAY** | 0.90..0.999 | KS loop feedback gain. Each loop pass attenuates by this much. THE primary tail-shaper. Default 0.993. | `feedback.gain` |
| 8 | **ATTACK** | 1..2000 ms | Ramp time of the noise-burst envelope that excites the loop. Short = pluck/strike; long = bowed-on swell. (Replaced the old full ADSR widget in v0.18.1.) | Sample-by-sample envelope on the burst buffer in pluckKS |
| 9 | **JAWARI** | 0..100 % wet | Crossfades dry KS signal vs. saturated signal through a `tanh(14x + 0.18)` waveshaper. Asymmetric DC bias adds even harmonics → bell-like shimmer. Out of the loop, so it doesn't destabilize. | `jwDry.gain` / `jwWet.gain` |
| 10 | **HALO** | 0..100 % | Per-pluck envelope on a comb filter (delayTime ≈ 0.71 ms ≈ 1.4 kHz fundamental, feedback 0.88). Slow rise / slow fall (0.12 s up, 3 s down). Peak ×2.0 at 100 %. Sums into the panner alongside the dry/wet KS. Taps pre-brightness (full spectrum). | `haloDelay`, `haloFeedback`, `haloEnv` |
| 11 | **DETUNE** | 0..50 ¢ | Per-pluck random ± pitch jitter applied BEFORE delay.delayTime. Each pluck gets a slightly different freq. | freq × pow(2, ±cents/1200) |
| 12 | **GAIN** | -60..+12 dB | Per-string output level, on the XY pad. | `strGain.gain` |
| 13 | **PAN** | L..R | Per-string stereo position, on the XY pad. | `panner.pan` |
| 14 | **BYPASS** | on/off | Skip this string entirely on each tick. UI only — no audio node. | onTick early-return |

---

## Global parameters that influence every string

| Knob | Range | What it actually does |
|------|-------|------------------------|
| **TEMPO / BPM** | 0..1 (log slider) | Sets `state.clockPeriod` used by the master scheduler `setInterval`. |
| **SYMP** (sympathetic resonance) | 0..100 % | Per-string output sums into every OTHER string's `sympInput`. Capped at 0.15 max even at slider 100 %. Each receiving string's KS loop amplifies it at its own pitch. |
| **EXCITE** | 0..100 % | Master scale on the noise-burst amplitude that feeds the KS loop. Low = clean string-decay character. Default 10 %. |

---

## Internal constants (not user-controllable but worth knowing)

| Constant | Value | Why |
|----------|-------|-----|
| `loopFIR` coefficients | `[0.5, 0.5]` | Canonical 2-tap KS lowpass smoother. Highs decay faster than lows → pitched, plucky sound. Non-recursive → mathematically stable forever. |
| `loopFIR` feedback coeffs | `[1.0]` | Identity denominator — no IIR poles, can't blow up. |
| Brightness filter Q | `0.5` | Gentle lowpass, not resonant. |
| `BURST_TAIL_SEC` | 0.030 s | Fixed tail of the noise burst after the Attack ramp. (D/S/R no longer extend the burst.) |
| `PLUCK_MAX_BURST_SEC` | 5 s | Hard upper cap on burst length even if Attack is set to absurd values. |
| `SYMP` max | 0.15 | Sympathetic-resonance amount cap (prevents feedback runaway at slider 100 %). |
| Halo comb delayTime | 0.00071 s | ≈ 1.4 kHz fundamental. |
| Halo comb feedback | 0.88 | Internal comb ring time. |
| Halo envelope rise | 0.12 s | Fast enough that it blooms between plucks at normal tempi. |
| Halo envelope fall | 3 s | Long tail; sounds meditative. |
| Halo envelope peak multiplier | × 2.0 | So 50–100 % halo settings are obviously present. |
| Jawari curve | `tanh(14x + 0.18)` | 14× drive + 0.18 DC bias = aggressive asymmetric clip → bell harmonics. |
| Jawari curve table | 2048 samples | Resolution of the WaveShaper lookup. |

---

## Burst pipeline (what each pluck actually does)

```
pluckKS(ks, freq, strength, brightness, attackMs, detuneCents, haloPct):
  1. Apply detune  → freq × pow(2, randomCents/1200)
  2. Set delay.delayTime = 1/freq
  3. setTargetAtTime brightness onto filter.frequency
  4. Build a one-shot AudioBuffer of length (attackMs/1000 + BURST_TAIL_SEC):
     - Phase 1 (i < aSamp):   envAmp = aLevel * (i / aSamp)         [attack ramp]
     - Phase 2 (i >= aSamp):  envAmp = aLevel * (1 - (i - aSamp) / tailSamp)
     - data[i] = (random * 2 - 1) * strength * envAmp * state.exciteScale
  5. Subtract the mean (DC remove) so the burst is exactly zero-mean.
  6. createBufferSource → sumNode (one-shot; auto-garbage-collected after end).
  7. If haloPct > 0: schedule haloEnv ramps (0 → peak over 0.12 s, peak → 0 over 3 s).
```

The KS feedback loop then takes over: sumNode is the entry, the loop rings
at `decay` for as long as it takes for the signal to fall below noise floor.
`decay` = 0.99 means after ~100 loop passes the signal is at ~1/e (37 %).
At 220 Hz, one loop pass = 1/220 s ≈ 4.5 ms, so the −60 dB tail is about
`-60 / (20 * log10(decay)) * (1/freq)` ≈ 3.1 seconds. At decay 0.993,
it's about 4.4 seconds. At 0.999, ~31 seconds.

---

## What's not in the per-string chain

These are master/global, on the destination side:

- **Master mute / gain** (on the bus)
- **Reverb** (convolution, one global instance)
- **Ring modulator** (one global instance)
- **Per-string stereo meters** are on the string but they're read-only

---

## Internal audio nodes (reference, in order along the path)

1. `sumNode` — Gain, sum of {noise burst, sympathetic input, feedback}
2. `delay` — DelayNode, the KS string length (1/freq)
3. `loopFIR` — IIRFilterNode `[0.5, 0.5]` / `[1.0]`
4. `feedback` — Gain (THIS is the DECAY knob)
5. `filter` — BiquadFilterNode lowpass (THIS is BRIGHTNESS)
6. `jwDry` / `jwWet` — crossfade gains (THIS is JAWARI)
7. `shaper` — WaveShaperNode (curve = tanh(14x+0.18))
8. `haloDelay` — DelayNode (≈0.71 ms)
9. `haloFeedback` — Gain (0.88, internal)
10. `haloEnv` — Gain (per-pluck enveloped, THIS is HALO amount)
11. `sympInput` — Gain (gated by global SYMP slider × 0.15)
12. `panner` — StereoPannerNode (THIS is PAN)
13. `strGain` — Gain (THIS is GAIN)
14. `splitter` + `aL` / `aR` — meter analysers (read-only)

---

*Generated automatically alongside the v0.18.1 changes. Update when the
audio graph changes.*
