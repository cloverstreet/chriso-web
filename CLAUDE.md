# chriso.org — Claude Code Context

This file is read automatically at the start of every Claude Code session in this folder. It's the bridge between what's been built in Claude chat and what you (Claude Code) need to know to keep going.

---

## Who you're working with

**Christopher Overstreet** — composer, performer, technologist, interactive media artist on Vashon Island, WA. ~30 years building musically expressive interfaces. His artistic identity and brand is **Performance Reality** ([perfreal.com](https://perfreal.com)), a framework for musically expressive interfaces, multi-person art-making, gestural mapping, and transcending notation/technology constraints for unified performance media.

**Core philosophy — this matters for every design decision:**
- **Real instruments are fun immediately, offer infinite depth, and create desire to practice.** Every UI/UX choice should serve this. No "iPhone Theremin" training wheels.
- **Feedback is a feature.** If a routing option can create runaway feedback when driven hard, that's acceptable — the user's ear and hand are the safety clamp. Virtuosity requires the possibility of chaos.
- **AI is an enabler for large-scale collaborative art** that was previously cost-prohibitive.
- **Ethical tensions around AI stay live and unresolved** — they're generative, not problems to close.

**Working preference:** Execute and narrate rather than hand tasks back. Christopher values sessions where context is documented and AI forms its own positions. Questions are welcome but should be distilled to only the most essential given his limited time.

---

## The main project — FX Processor

A browser-based audio instrument, an early prototype of **JamLand** (the long-term vision: a 3D navigable interpolation space for multi-person performance).

- **Live URL:** https://chriso.org/web-instruments/fx-processor/
- **Canonical source file:** `web-instruments/fx-processor/index.html` (this is the one to edit)
- **Deploy target (Dreamhost):** `/home/dh_srf7dw/chriso.org/web-instruments/fx-processor/index.html`

**Current version:** v52 (see git log for exact commit)

**Architecture:**
- Layout: INPUTS column (172px) | FX+IS column (290px, pitch+delay side-by-side, IS below) | OUTPUTS column (172px)
- Signal chain is all Tone.js, stereo throughout (`channelCount:2, channelCountMode:'explicit'` on all Gain nodes)
- Key nodes: `micGainNode → micPanner → preFxGain`, signal gen through `testEnvelope → testPanner → preFxGain`, `preFxGain → pitchDryG + pitchShift → pitchSumG → pitchToDelayG → delayNode → delayDry/WetGain → outputGainNode`
- Feedback path: `delayNode → delayToPitchG → preFxGain` (danger-zone musical feedback)
- Direct sends: `micPanner → micDirectG → outputGainNode`, `testPanner → testDirectG → outputGainNode`
- Flanking stereo meters on pitch and delay modules (skinny bars at left = input, right = output)

**Modules:**
- MIC INPUT — Tone.UserMedia, device selector, channel selector, stereo pan, gain+meter, direct-to-out, mute
- SIGNAL GEN — STEADY/PULSED (ADSR envelope), waveform, freq (log), pan, direct-to-out, gain+meter, 6 presets
- TAB CAPTURE — getDisplayMedia, source info (LABEL/TYPE/CH/RATE/DRM), vertical gain+meter
- PITCH SHIFT — Tone.PitchShift, dry/wet mix, THRU→delay, THRU→out sends, 6 presets, **TRUE bypass** (disconnects pitchShift entirely to eliminate its windowSize latency)
- DELAY — Tone.Delay + feedback loop, DRY→OUT, WET→OUT, WET→PITCH SHIFT (feedback — tapped from delayNode pre-wet for true level), piecewise time curve (linear 0.01→1s in first third, log 1→60s after), 6 presets, bypass
- INTERPOLATION SPACE — 16 slots (0=home/blue, 1-15 per-node color palette in HSL), IDW interpolation, WASD nav (shift=sprint, 7 px/frame max with 1s ease-in ramp), preset drag/listener drag/shift+click save, number keys 0-9 teleport, layout save/load
- OUTPUT — device selector, channel pair routing (Ch 1-2, 3-4…), MAX CH display, gain+meter, mute

**Key utilities / conventions:**
- Click-to-type on ALL value displays (via `makeEditableSafe`)
- Arrow keys on sliders trigger `paramRampTime=0.25` slew for smooth audio transitions (vs default 0.03)
- Dblclick on any gain slider → 0dB
- 0dB reference mark on gain meters via CSS `--zero-db` variable
- Typed values are authoritative — `freqLog.toPos` / `timeLog.toPos` don't round; sliders use `step="any"`
- Per-slot color palette for IS nodes: HSL hue array `PS_COLORS` in the JS, matching CSS rules for preset buttons

---

## Infrastructure & workflow

### Local / iCloud
- Repo root: `/Users/christophero/Library/Mobile Documents/com~apple~CloudDocs/Documents/Websites/chriso.org/` (iCloud Drive; works but keep `.git` intact)
- Git repo: `github.com/cloverstreet/chriso-web` — **public** (never commit credentials)
- VS Code SFTP plugin is configured per-subfolder in `.vscode/sftp.json` files (gitignored — they contain the password). Saving a file in VS Code auto-deploys via SFTP.

### Dreamhost server
- Host: `iad1-shared-b8-46.dreamhost.com`
- SFTP user: `dh_srf7dw`
- Password: `0OlxAcO%g%` (keep this OUT of git — `.gitignore` already excludes sftp.json)
- Dreamhost bans your IP after ~5 failed auth attempts. If deploy starts refusing, wait 15-30 min or whitelist your IP in the Dreamhost panel.
- New OpenSSH on macOS tries publickey first and sshpass misses the password prompt. Always use `-o PreferredAuthentications=password -o PubkeyAuthentication=no` with sshpass.

### Deploy command (what has worked reliably)
```bash
export PATH="/opt/homebrew/bin:$PATH" && SSHPASS="0OlxAcO%g%" sshpass -e scp \
  -o ConnectTimeout=15 -o StrictHostKeyChecking=no \
  -o PreferredAuthentications=password -o PubkeyAuthentication=no \
  "web-instruments/fx-processor/index.html" \
  dh_srf7dw@iad1-shared-b8-46.dreamhost.com:/home/dh_srf7dw/chriso.org/web-instruments/fx-processor/index.html
```

### Git workflow
- Commit after every deploy: `git add <file> && git commit -m "fx-processor vNN: ..."`
- Push to GitHub separately (not required for deploy; purely paper trail)
- If push fails with `postBuffer`, it's already set to 150MB for this repo

### Folder layout (current)
```
chriso.org/
  web-instruments/
    fx-processor/          ← canonical FX Processor source (deploys here)
    luminous-strings.html
    index.html, list.php   ← landing page that auto-discovers instruments
  TestCases/               ← isolated feature experiments
    web-audio-capture-test-01/
  Sandbox/                 ← messy play / prototypes (in .gitignore for some subfolders)
  about/, lessons/, glitchpage/
  uploads/                 ← has participant data — NEVER commit contents
  _myNotes/                ← personal, local-only
  media-operaRelated/      ← large media files, local-only
```

**Do NOT commit:** `node_modules/`, `dist/` in Sandbox/TestCases, `_myNotes/`, `media-operaRelated/`, `uploads/participantFiles/`, any `.vscode/sftp.json` (all already in `.gitignore`).

---

## Notion — the cross-session knowledge base

Christopher uses Notion as a living documentation system. It's connected via MCP. Key documents to know about:

- 🔗 **Master handoff doc:** https://www.notion.so/33bdbb5222768111987dc71eeefe1de0
  — Check this FIRST for current state and backlog
- 🔗 **UI Standards & Component Specs:** https://www.notion.so/33bdbb52227681c3bbd1d8692d67c9a8
  — Reusable widgets (gain/meter slider, mod-head anatomy), design tokens
- 🔗 **Default Presets & Parameter Reference:** https://www.notion.so/33bdbb52227681eca527fd761263d1cc
- 🔗 **Artist Profile & Performance Reality:** https://www.notion.so/33adbb52227681d4bcfffb14c8705d6f
- 🔗 **Key Commands & Terminal Reference:** https://www.notion.so/33bdbb52227681f58b6cf897320ebb27
- 🔗 **JamLand / PlaySpace Design Doc:** https://www.notion.so/33adbb5222768196add1de51d45149a1

**When to read Notion:**
- At session start — fetch the master handoff doc for latest state
- When touching shared conventions (UI standards) or architecture decisions
- Before making design choices that affect multiple instruments

**When to write to Notion:**
- When completing a major feature or chunk of work — update the handoff doc
- When discovering a reusable pattern worth documenting
- When Christopher explicitly says "note this in Notion" or "update the handoff"
- NOT for every tiny change — commit messages handle granular history

**Convention:** Notion pages are the source of truth for *conventions and decisions*. Git is the source of truth for *code*.

---

## Cross-project coordination — "multiple Claudes"

Christopher often has parallel Claude chats/Claude Code sessions running. Rules:

- **Don't integrate suggestions across projects without checking with him first.** Projects maintain distinct identities.
- If another session/project comes up, treat it as referential context but don't assume its conventions apply here.
- The master handoff doc is the shared ground truth across all Claude instances.

---

## Current backlog (Nov 2026, post-v52)

**Immediate:**
1. **Latency research** — there's still ~100-200ms of round-trip latency even with both FX bypassed. Sources to investigate: `rawContext.baseLatency`, `rawContext.outputLatency`, AudioWorklet options, Chrome's audio pipeline. Meters respond at schedule time, not at output time — the gap is real.
2. **New TestCase: LFO + graphical ADSR** at `TestCases/lfo-adsr-test/`
   - Copy of Signal Gen + Output module
   - New LFO module (rate, shape, depth, target menu populated with sig gen params: freq / pulse rate / pan / volume). Presets. NOT assignable to ADSR params.
   - Graphical ADSR envelope with time/value at each node: A (20ms→0dB), D (50ms→-12dB), S (100ms sustain duration at decay level), R (100ms→silence). Drag points to edit. Click-to-type. Look at common ADSR UIs online for reference.
3. **Phone-friendly layout** — touch targets 44px min, vertical reflow at narrow viewports
4. **Mass-damper PlaySpace** (remind Christopher at session start) — user drives a target with direct keys; target controls the actual listener node via spring/damper system, with adjustable mass and springiness.

**Pending design discussions:**
- Full matrix routing widget (every FX module can send to every other module + output, visualized as a grid)
- 3D interpolation space (JamLand-scale): Mode A = volumetric IDW, Mode B = Z-axis controls parameter subsets orthogonal to X/Y timbre space
- Variable influence radius per preset node (like MaxMSP `nodes~` object)
- LFO/modulator system beyond just this first test case

---

## Code discipline (hard-won conventions)

- **Always read the file first** before patching — use file reads + grep to find exact strings
- **Always show a version number in the app UI itself.** Every patch (fx-processor v56, lfo-adsr-test v0.4, luminous-strings v4.7…) should bump a version string that's visible somewhere in the rendered page — a small fixed-position badge in a corner is fine, doesn't need to be prominent. Christopher tests by reload + URL, and the version badge is the only reliable way to confirm which build is actually running. Bump the badge with every commit that ships a user-visible change.
- **Python3 inline edits** via exact string replacement with assertion checks, one concept per edit
- **Syntax-check JS** before deploying: `node -e "new Function(...)"` on the script block
- **Verify board div balance** (opens == closes) after big HTML edits
- **Prefer smaller targeted fixes over large refactors**
- **Confirm before rebuilds**; flag unclear items and ask
- **When `html.replace()` fails silently**, use `repr()` of surrounding area or line-number targeting instead of string matching
- **For Safari testing**: Cmd+R reload, Cmd+Option+R hard reload (Develop menu must be enabled)
- **For Chrome testing**: Cmd+Shift+R hard reload

---

## What to do at session start

1. Read this file (automatic)
2. Check `git log -5 --oneline web-instruments/fx-processor/index.html` for the latest state
3. Ask Christopher what he's seeing and what he wants to work on
4. Optionally fetch the master handoff doc from Notion if diving into specifics or picking up mid-task
