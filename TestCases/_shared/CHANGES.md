# `TestCases/_shared/` — Change Log & Migration Notes

This file is **for Claude Code instances** (and future-Christopher) working
on chriso.org instruments that consume the shared widgets in this folder.

The shared widgets are imported by multiple unrelated test cases and
sometimes by the FX Processor itself. Even small changes here can ripple
through every consumer. This file is the bulletin board for "I'm planning to
change `audio-widgets.{css,js}` — here's what might break and how I'm
handling it."

## Procedure for changing anything in `_shared/`

1. **Read the most recent entries below.** Are there pending proposals that
   conflict with what you're about to do?
2. **Snapshot before edit.** Copy the file you're about to modify with a
   date suffix:
   ```
   cp audio-widgets.js audio-widgets-2026-05-02.js
   cp audio-widgets.css audio-widgets-2026-05-02.css
   ```
   Keep these around for ~30 days. Git history is the durable source of
   truth, but the date-suffixed copies make it easy to A/B alternative
   implementations without git operations. After 30 days, delete the
   date-suffixed copies — they should not stay forever.
3. **Append a section to this file** describing what changed, why, which
   consumers you've checked, and what's left.
4. **Test every consumer you can.** Grep for the file name across the repo:
   ```
   grep -r "audio-widgets" --include="*.html" .
   ```
5. **If a consumer can't be tested**, document that explicitly in your
   change-log entry so the next person knows it's an open risk.

## Known consumers (audit when modifying shared widgets)

| Consumer | Path | Uses |
|---|---|---|
| FX Processor | `web-instruments/fx-processor/index.html` | Inline `gain-meter-wrap` HTML; does **not** link the shared CSS or JS — has its own inline copy. Changes to shared CSS won't affect it directly, but conventions should match. |
| LFO + ADSR test | `TestCases/lfo-adsr-test/index.html` | Inline CSS, may not link `_shared/`. Verify before relying on shared changes. |
| Buffer Shuffler | `TestCases/buffer-shuffler/index.html` | Unknown — check before modifying. |
| TelloFoam tests | `TestCases/tellofone-test-*/index.html` | Linked to `_shared/audio-widgets.{css,js}`; this is the original consumer the shared widgets were extracted for. |
| Web Audio Capture | `TestCases/web-audio-capture-test-01/index.html` | Verify. |
| **DronorParty** | `TestCases/DronorParty/index.html` | Linked to `_shared/audio-widgets.{css,js}`. v0.7+ overrides the gain-meter-slider locally — see open proposal below. |

When in doubt, run `grep -l "audio-widgets" $(find . -name '*.html')` and
read each match.

---

## Open proposals (not yet applied)

### Proposed 2026-05-02 — Backport DronorParty v0.7's custom gain thumb into the shared widget

**Status:** Proposed. Not yet applied. Owner: TBD next session.

**Why:**
The shared `.gain-meter-slider` relies on Chrome's native vertical-mode
`<input type="range">` (`writing-mode: vertical-lr; direction: rtl`).
Across multiple sessions in different instruments, this slider has
exhibited two recurring failure modes:

1. **Drag freeze** — after a few pixels of motion, the slider stops
   tracking the cursor until released and re-clicked. Suspected cause:
   per-frame `style.height` updates on the meter level/peak siblings
   interrupt the slider's pointer capture.
2. **Inverted visual** — under certain CSS combinations, the thumb's
   position vs. value relationship flips: dragging down moves the thumb
   visually up (audio direction stays correct, which is even more
   confusing).

DronorParty v0.7 sidesteps both by:
- Hiding the native slider element (`opacity: 0`, native thumb sized 0)
- Adding a custom `<div class="gain-thumb">` positioned in pixels by JS
  (no `writing-mode` involvement)
- Routing all pointer events to the wrap, not the slider

**The proposal:** lift this pattern into `audio-widgets.{css,js}` so all
consumers benefit. The cleanest shape is probably a new `GainStrip`
class alongside the existing `MeterStrip`, since `MeterStrip` is also
consumed for level-only metering (no slider) and shouldn't gain a slider
hard-coded.

**What might break — DO NOT silently apply this without per-consumer review:**

- **fx-processor** has its own *inline* gain-meter HTML and uses native
  slider with `oninput` handlers. It does NOT link the shared CSS, so
  changes to the shared CSS won't break it directly. But: the FX Processor
  itself has shown the same drag-freeze symptom in past sessions
  (per Christopher) and should be migrated to the new pattern at the
  same time as the shared widget update — otherwise we have two diverging
  conventions in the codebase.
- **lfo-adsr-test, buffer-shuffler, web-audio-capture-test-01** —
  unknown linkage. Audit before applying.
- **tellofone-test-* and any future shared-widget consumer** — currently
  use the existing `MeterStrip` (level-only, no slider). They are NOT
  affected by a `GainStrip` addition, only by direct changes to
  `MeterStrip` or to the `.gain-meter-*` CSS classes used inline.
- **CSS rules with `pointer-events: none` on `.gain-meter-bg/-bar/-level/-peak`**
  added in DronorParty v0.5 are independently useful; could be merged
  into shared CSS without waiting for the full GainStrip migration.

**Recommended migration path:**

1. Add `pointer-events: none` to the meter visualizer divs in shared CSS
   (low-risk; consumers that already work continue to work).
2. Add a new `GainStrip` class to `audio-widgets.js` implementing the
   custom-thumb drag pattern. Take care to handle the case where the
   wrap's `clientHeight` is 0 at construction time (use `ResizeObserver`
   or defer until first interaction).
3. **Per consumer**, decide explicitly:
   - Migrate to `GainStrip` (preferred for new work).
   - Keep using inline native-slider (acceptable if it currently works
     for that instrument and migration is risky).
4. **Don't** add `opacity: 0` to `.gain-meter-slider` in shared CSS —
   that would silently break every consumer of the inline pattern. Make
   the new pattern opt-in via a different class (e.g.,
   `.gain-strip-custom-thumb` on the wrap).

**Rollback / safety:**

- Git: `git log _shared/audio-widgets.*` and revert the offending commit.
- File-snapshot: if `audio-widgets-2026-05-DD.js/css` exist, copy them
  back over the working copies.
- Per-consumer fallback: each consumer's `index.html` can locally override
  shared CSS (DronorParty v0.7 is currently doing exactly this); reverting
  the consumer's local override is enough to put it back on the original
  shared behavior.

---

## Applied changes

(none yet — start logging here when actual `_shared/` edits are made.)
