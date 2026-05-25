// models.js — the two orthogonal sides of the puzzle.
//
//   NOTE SYSTEM   maps an integer step index  ->  an exact frequency (Hz)
//   LAYOUT        maps a physical key (event.code)  ->  an integer step index
//
// Compose them and you have an instrument. Either side swaps without touching
// the other. Everything resolves to Hz so the audio engine stays tuning-agnostic
// (no MIDI, no pitch-bend, no 12-note assumption) — same philosophy as the
// notation test cases' Tunings module.
//
// Plain global (no ES module) so the page runs by double-clicking the HTML.

window.Models = (function () {

  // Shared root. C4 in A440 tuning, used for every system so you can A/B them
  // against the same fundamental. Gamelan pitch isn't really fixed to anything;
  // this is just a convenient anchor for comparison.
  const ROOT_HZ = 261.6256; // C4

  // ---- NOTE SYSTEMS -------------------------------------------------------
  // A system is a repeating lattice of pitches given in CENTS from the root,
  // plus the size of the repeating period in cents (the octave = 1200, but
  // Bohlen–Pierce repeats at the 3:1 "tritave" = 1902).
  //
  //   degrees : cents of each scale degree within one period (ascending, the
  //             first is always 0)
  //   period  : cents until the pattern repeats (default 1200)
  //
  // stepToFreq(i) walks the lattice: negative and large i wrap through periods.
  function makeSystem(def) {
    const degrees = def.degrees;
    const n = degrees.length;
    const period = def.period || 1200;
    return {
      name: def.name,
      blurb: def.blurb || "",
      degrees,
      period,
      stepsPerPeriod: n,
      // approximate size of one step, for snapping isomorphic generators
      avgStepCents: period / n,
      // integer step index -> cents above root
      stepToCents(i) {
        const periods = Math.floor(i / n);
        const idx = ((i % n) + n) % n;
        return degrees[idx] + period * periods;
      },
      stepToFreq(i) {
        return ROOT_HZ * Math.pow(2, this.stepToCents(i) / 1200);
      },
    };
  }

  // equal temperament helper: N equal divisions of `period` cents
  function edo(name, n, period, blurb) {
    const step = (period || 1200) / n;
    const degrees = [];
    for (let i = 0; i < n; i++) degrees.push(+(i * step).toFixed(3));
    return makeSystem({ name, degrees, period: period || 1200, blurb });
  }

  const NOTE_SYSTEMS = {
    chromatic: edo("Chromatic · 12-TET", 12, 1200,
      "The familiar 12 equal semitones. Every interval is a tempered approximation; the reference everyone already hears."),

    pentatonic: makeSystem({
      name: "Pentatonic (major) · 5 notes",
      degrees: [0, 200, 400, 700, 900],
      blurb: "No semitones, no tritone — every combination consonant. The classic 'can't play a wrong note' tuning.",
    }),

    diatonic: makeSystem({
      name: "Diatonic (major / Ionian) · 7 notes",
      degrees: [0, 200, 400, 500, 700, 900, 1100],
      blurb: "Seven degrees of the major scale, 12-TET tuned. One key per degree means modes are just a different starting step.",
    }),

    wholetone: edo("Whole-tone · 6-TET", 6, 1200,
      "Six equal whole steps. Symmetrical and rootless — no leading tone, so no pull home (Debussy's haze)."),

    just: makeSystem({
      name: "Just intonation (5-limit major) · 7 notes",
      degrees: [0, 203.91, 386.31, 498.04, 701.96, 884.36, 1088.27],
      blurb: "Pure whole-number ratios (9/8, 5/4, 4/3, 3/2, 5/3, 15/8). Beatless thirds and fifths — the sound 12-TET only approximates.",
    }),

    edo19: edo("19-TET", 19, 1200,
      "19 equal steps. Sharps and flats are distinct pitches; minor thirds and the whole diatonic set sound sweeter than 12-TET."),

    edo24: edo("24-TET · quarter tones", 24, 1200,
      "Quarter-tone grid. The substrate for a lot of Arabic maqam / Western microtonal writing — every 12-TET note plus the pitch between."),

    edo31: edo("31-TET", 31, 1200,
      "31 equal steps ≈ quarter-comma meantone. Near-just thirds; the historical sweet spot Huygens and Fokker explored."),

    edo53: edo("53-TET", 53, 1200,
      "53 equal steps. Famous for near-perfect fifths and thirds (Turkish/Arabic theory, Bosanquet's harmonium)."),

    bohlenpierce: edo("Bohlen–Pierce · 13 per tritave", 13, 1902,
      "13 equal divisions of the 3:1 'tritave' instead of the 2:1 octave. No octaves at all — an alien but internally consonant world."),

    pelog: makeSystem({
      name: "Pélog (Central Javanese, 7-tone)",
      degrees: [0, 120, 258, 539, 675, 785, 943],
      blurb: "Representative Javanese pélog (no canonical tuning exists). Uneven steps; pieces usually draw a 5-note pathet subset.",
    }),

    slendro: makeSystem({
      name: "Sléndro (Javanese, 5-tone)",
      degrees: [0, 231, 474, 717, 955],
      blurb: "Five near-equal (but not 12-TET) steps. Pairs with pélog as the other Javanese gamelan tuning.",
    }),
  };

  // ---- LAYOUTS ------------------------------------------------------------
  // The physical QWERTY keyboard, by event.code (layout-independent: KeyA is
  // the same key whether your OS is QWERTY, AZERTY or Dvorak). Bottom row first
  // so row index 0 = lowest = lowest pitch.
  const PHYS_ROWS = [
    // row 0 — bottom (ZXCV)
    ["KeyZ","KeyX","KeyC","KeyV","KeyB","KeyN","KeyM","Comma","Period","Slash"],
    // row 1 — home (ASDF)
    ["KeyA","KeyS","KeyD","KeyF","KeyG","KeyH","KeyJ","KeyL","Semicolon","Quote"], // NB: KeyK handled per-layout
    // row 2 — QWERTY
    ["KeyQ","KeyW","KeyE","KeyR","KeyT","KeyY","KeyU","KeyI","KeyO","KeyP","BracketLeft","BracketRight"],
    // row 3 — number row
    ["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9","Digit0","Minus","Equal"],
  ];
  // KeyK reinserted into home row at its true position (between J and L) so the
  // home row is complete for layouts that use every key.
  const HOME_FULL = ["KeyA","KeyS","KeyD","KeyF","KeyG","KeyH","KeyJ","KeyK","KeyL","Semicolon","Quote"];

  // keycap glyphs for display
  const CAP = {
    KeyA:"A",KeyB:"B",KeyC:"C",KeyD:"D",KeyE:"E",KeyF:"F",KeyG:"G",KeyH:"H",
    KeyI:"I",KeyJ:"J",KeyK:"K",KeyL:"L",KeyM:"M",KeyN:"N",KeyO:"O",KeyP:"P",
    KeyQ:"Q",KeyR:"R",KeyS:"S",KeyT:"T",KeyU:"U",KeyV:"V",KeyW:"W",KeyX:"X",
    KeyY:"Y",KeyZ:"Z",
    Digit1:"1",Digit2:"2",Digit3:"3",Digit4:"4",Digit5:"5",Digit6:"6",
    Digit7:"7",Digit8:"8",Digit9:"9",Digit0:"0",
    Minus:"-",Equal:"=",BracketLeft:"[",BracketRight:"]",Backslash:"\\",
    Semicolon:";",Quote:"'",Comma:",",Period:".",Slash:"/",Backquote:"`",
  };

  // physical horizontal offset of each row (in key-widths) — the real QWERTY
  // stagger. Used only for drawing; the pitch math uses integer columns.
  const ROW_STAGGER = [0.85, 0.5, 0.25, 0.0]; // rows 0..3 (bottom..top)

  // Each layout returns { rows:[ {code,col,row,step}... per row ], desc, gens? }
  // step = integer index into whichever note system is selected.
  // Layouts come in two families:
  //   LINEAR     — walk keys in reading order, assign consecutive steps
  //   REGISTERED — each physical row is one period higher than the row below
  //   ISOMORPHIC — step = colGen*col + rowGen*row, generators snapped from cents

  function snap(cents, system) {
    return Math.round(cents / system.avgStepCents);
  }

  const LAYOUTS = {
    piano: {
      name: "Piano / Tracker (chromatic)",
      desc: "The tracker/DAW convention (Renoise, FL, Ableton): the home + bottom rows are one chromatic octave with 'black keys' on the offset keys above, QWERTY + number rows the octave above. The familiar reference — and the one to grow past. Built on 12 semitones, so it's most honest with the Chromatic system; under other systems the black/white grouping is just a visual overlay.",
      build(system) {
        // classic FL/Renoise mapping, two octaves.
        // lower octave: white = Z X C V B N M , . /  ; black = S D _ G H J _ L ;
        // upper octave: white = Q W E R T Y U I O P ; black = 2 3 _ 5 6 7 _ 9 0
        const lowerWhite = ["KeyZ","KeyX","KeyC","KeyV","KeyB","KeyN","KeyM","Comma","Period","Slash"];
        const lowerBlackByWhiteIdx = {0:"KeyS",1:"KeyD",3:"KeyG",4:"KeyH",5:"KeyJ",7:"KeyL",8:"Semicolon"};
        const upperWhite = ["KeyQ","KeyW","KeyE","KeyR","KeyT","KeyY","KeyU","KeyI","KeyO","KeyP"];
        const upperBlackByWhiteIdx = {0:"Digit2",1:"Digit3",3:"Digit5",4:"Digit6",5:"Digit7",7:"Digit9",8:"Digit0"};
        // semitone of each white key within its octave
        const whiteSemi = [0,2,4,5,7,9,11,12,14,16]; // C D E F G A B C D E
        const map = {}; // code -> semitone offset from low C
        lowerWhite.forEach((c,i)=>{ map[c] = whiteSemi[i]; });
        for (const [wi,c] of Object.entries(lowerBlackByWhiteIdx)) map[c] = whiteSemi[+wi]+1;
        upperWhite.forEach((c,i)=>{ map[c] = whiteSemi[i]+12; });
        for (const [wi,c] of Object.entries(upperBlackByWhiteIdx)) map[c] = whiteSemi[+wi]+1+12;
        return placeBySemitone(map, system);
      },
    },

    rampRows: {
      name: "Linear ramp (every key ascending)",
      desc: "Dead simple: every key, read left-to-right and bottom-to-top, is the next step of the scale. One key per scale degree, nothing wasted — ideal for scales with fewer than 12 notes (pentatonic, pélog) where a piano layout leaves dead keys.",
      build(system) {
        const out = [];
        let step = 0;
        const rows = [PHYS_ROWS[0], HOME_FULL, PHYS_ROWS[2], PHYS_ROWS[3]];
        rows.forEach((codes, r) => {
          const rowItems = codes.map((code, col) => ({ code, col, row: r, step: step++ }));
          out.push(rowItems);
        });
        return { rows: out };
      },
    },

    registers: {
      name: "Rows = octave registers",
      desc: "Each physical row is the same scale, one period (octave / tritave) higher than the row beneath it, left-aligned. Bottom row = lowest octave ascending, home row the next, and so on. Lets you reach across registers with the same finger shape.",
      build(system) {
        const out = [];
        const rows = [PHYS_ROWS[0], HOME_FULL, PHYS_ROWS[2], PHYS_ROWS[3]];
        rows.forEach((codes, r) => {
          const rowItems = codes.map((code, col) => ({
            code, col, row: r, step: r * system.stepsPerPeriod + col,
          }));
          out.push(rowItems);
        });
        return { rows: out };
      },
    },

    wicki: {
      name: "Wicki–Hayden (isomorphic)",
      desc: "Concertina layout: move right along a row = +1 whole tone; move up a row = +1 perfect fifth. Because the steps are constant, a chord or scale shape is identical in every key — transpose by sliding your hand. Generators are snapped to the nearest step of the current system, so the same shape stays a 'fifth' in 19-, 24-, 31-TET.",
      iso: { colCents: 200, rowCents: 700, colLabel: "→ whole tone (+200¢)", rowLabel: "↑ fifth (+700¢)" },
      build(system) { return isoBuild(this.iso, system); },
    },

    harmonic: {
      name: "Harmonic Table / Tonnetz (isomorphic)",
      desc: "The C-Thru AXiS / Tonnetz arrangement: right along a row = +1 major third, up a row = +1 perfect fifth — so the up-left diagonal is a minor third. Triads become compact fixed shapes; the lattice IS the harmonic neighbourhood of a key.",
      iso: { colCents: 400, rowCents: 700, colLabel: "→ major third (+400¢)", rowLabel: "↑ fifth (+700¢)" },
      build(system) { return isoBuild(this.iso, system); },
    },

    janko: {
      name: "Jankó (isomorphic)",
      desc: "1882 piano reform: right along a row = whole tone, and the rows are offset by a semitone, so the two ranks interleave into a full chromatic scale with one repeating shape per interval. (On non-12 systems the 'semitone' becomes the nearest single step.)",
      iso: { colCents: 200, rowCents: 100, colLabel: "→ whole tone (+200¢)", rowLabel: "↑ semitone (+100¢)" },
      build(system) { return isoBuild(this.iso, system); },
    },
  };

  // place keys whose semitone-from-root is known (piano layout). Convert each
  // semitone to the nearest step of the chosen system via cents, so the layout
  // still sounds on microtonal systems.
  function placeBySemitone(semiMap, system) {
    const out = [[],[],[],[]];
    const physForLayout = [PHYS_ROWS[0], PHYS_ROWS[1], PHYS_ROWS[2], PHYS_ROWS[3]];
    // we need the original physical position of each code for drawing
    const pos = {};
    physForLayout.forEach((codes, r) => codes.forEach((code, col) => { pos[code] = { r, col }; }));
    // Semicolon/Quote/Bracket etc. that piano layout uses also need positions:
    for (const code of Object.keys(semiMap)) {
      if (!pos[code]) {
        // find it in any physical row
        for (let r = 0; r < PHYS_ROWS.length; r++) {
          const col = PHYS_ROWS[r].indexOf(code);
          if (col >= 0) { pos[code] = { r, col }; break; }
        }
      }
    }
    for (const [code, semi] of Object.entries(semiMap)) {
      const cents = semi * 100;
      const step = snap(cents, system);
      const p = pos[code] || { r: 0, col: 0 };
      out[p.r].push({ code, col: p.col, row: p.r, step });
    }
    out.forEach(row => row.sort((a, b) => a.col - b.col));
    return { rows: out };
  }

  function isoBuild(iso, system) {
    const colGen = snap(iso.colCents, system);
    const rowGen = snap(iso.rowCents, system);
    const out = [];
    const rows = [PHYS_ROWS[0], HOME_FULL, PHYS_ROWS[2], PHYS_ROWS[3]];
    rows.forEach((codes, r) => {
      const rowItems = codes.map((code, col) => ({
        code, col, row: r, step: colGen * col + rowGen * r,
      }));
      out.push(rowItems);
    });
    return { rows: out, gens: { colGen, rowGen, colLabel: iso.colLabel, rowLabel: iso.rowLabel } };
  }

  // ---- universal pitch label ---------------------------------------------
  // Name ANY frequency by its nearest 12-TET note from A440 plus cents
  // deviation, e.g. 700¢ over C4 -> "G4" (+0), 750¢ -> "G4 +50". Gives a
  // readable anchor even for deeply microtonal pitches.
  const NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  function labelFreq(hz) {
    const midiFloat = 69 + 12 * Math.log2(hz / 440);
    const midi = Math.round(midiFloat);
    const cents = Math.round((midiFloat - midi) * 100);
    const name = NAMES[((midi % 12) + 12) % 12];
    const oct = Math.floor(midi / 12) - 1;
    const dev = cents === 0 ? "" : (cents > 0 ? `+${cents}` : `${cents}`);
    return { name: name + oct, dev, cents };
  }

  // hue for a pitch class, for coloring keys (wraps with the octave)
  function hueForFreq(hz, system) {
    const c = 1200 * Math.log2(hz / ROOT_HZ);
    const within = ((c % system.period) + system.period) % system.period;
    return (within / system.period) * 360;
  }

  return {
    ROOT_HZ,
    NOTE_SYSTEMS,
    LAYOUTS,
    PHYS_ROWS,
    HOME_FULL,
    CAP,
    ROW_STAGGER,
    labelFreq,
    hueForFreq,
  };
})();
