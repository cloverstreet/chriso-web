// Tuning tables. Everything resolves to a frequency in Hz so the synth
// stays tuning-agnostic. Microtonal scales are just cents arrays.
// Plain global (no ES module) so the pages run by double-clicking the HTML.

window.Tunings = (function () {
  const A4 = 440;

  // 12-TET via MIDI note number. middle C (C4) = MIDI 60.
  function mtof(midi) {
    return A4 * Math.pow(2, (midi - 69) / 12);
  }

  // note name like "C4", "F#5", "Bb3" -> MIDI number
  const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function nameToMidi(name) {
    const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name);
    if (!m) throw new Error("bad note name: " + name);
    let n = STEP[m[1].toUpperCase()];
    if (m[2] === "#") n += 1;
    if (m[2] === "b") n -= 1;
    return n + (parseInt(m[3], 10) + 1) * 12;
  }
  function noteFreq(name) {
    return mtof(nameToMidi(name));
  }

  function centsToFreq(baseHz, cents) {
    return baseHz * Math.pow(2, cents / 1200);
  }

  // --- Pélog (7-tone) -------------------------------------------------
  // IMPORTANT: there is no canonical pélog. Every gamelan is tuned uniquely,
  // and a piece often draws on only a 5-note subset (a pathet). The cents
  // below are a *representative* Central-Javanese pélog (Sethares-style
  // measurements), here to sound plausible and be easy to swap. Absolute
  // root pitch is arbitrary; gamelan pitch is not fixed to A440.
  const PELOG = {
    name: "Pélog (representative Central Javanese, 7-tone)",
    rootHz: 262, // arbitrary, ~C4 for familiarity
    // degree:   1    2    3    4    5    6    7   (octave = +1200)
    cents: [0, 120, 258, 539, 675, 785, 943],
  };

  // Sléndro kept for comparison / future use (5-tone, ~equal steps).
  const SLENDRO = {
    name: "Sléndro (representative, 5-tone)",
    rootHz: 262,
    cents: [0, 231, 474, 717, 955],
  };

  // degree is 1-based; octave shifts by whole 1200¢ multiples.
  function scaleFreq(scale, degree, octave) {
    octave = octave || 0;
    const n = scale.cents.length;
    const idx = ((degree - 1) % n + n) % n;
    const octShift = octave + Math.floor((degree - 1) / n);
    return centsToFreq(scale.rootHz, scale.cents[idx] + 1200 * octShift);
  }

  return {
    A4,
    mtof,
    nameToMidi,
    noteFreq,
    centsToFreq,
    PELOG,
    SLENDRO,
    scaleFreq,
  };
})();
