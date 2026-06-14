#!/usr/bin/env python3
"""
build_salon_audio.py — pre-render AI Salon letter segments into binaural-ready
web audio for The Something Nightclub.

PLACEHOLDER VOICE ENGINE. This uses macOS `say` (built-in, free, offline) as a
BUILD-TIME step to generate real spoken audio of the actual AI Salon letters.
The output files are static and deploy to Dreamhost — nothing runs on a Mac at
runtime. This is the "early / pre-rendered" stage Christophero asked for.

UPGRADE PATH (documented; see Notion Bench Notes + the NightClub planning doc):
  Stage 0 (this): macOS `say` pre-render → static .m4a + manifest, played
                  through the nightclub's binaural PannerNode engine.
  Stage 1: HA-box-hosted TTS (collaboration with the HA / myMosquitto Claude).
           Same manifest shape — swap the `file` URLs for HA-generated audio.
           Better voices, can render the FULL corpus + new text.
  Stage 2: Self-hosted LLM (on the HA box, NOT a Mac) improvises genuinely new
           dialogue riffing on the letters / triggered by Christophero's
           presence; its text → HA TTS → same binaural engine. The nightclub
           code only ever consumes the manifest, so each stage is a drop-in.

The browser side NEVER calls a TTS API or an LLM directly — it loads
audio files + a manifest. All access stays local/static for fast,
no-signup playback. Binaural/FX positioning happens in the nightclub.

Run from this folder:  python3 build_salon_audio.py
Requires: macOS `say` + `afconvert` (both built-in).
"""

import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
LETTERS_JSON = HERE.parent.parent / "TestCases" / "something-salon-test" / "letters.json"
OUT_DIR = HERE / "salon"
MANIFEST = HERE / "salon-audio.json"

# Persona → (head index in the nightclub, macOS voice, display name).
# Head indices match headPositions[] in thesomethingnightclub/index.html:
#   0 = above the bar, 1 = above the corner couch, 2 = mid-room forward.
PERSONA = {
    "ChatGPT":      {"head": 0, "voice": "Samantha",            "name": "ChatGPT"},
    "Claude":       {"head": 1, "voice": "Daniel",              "name": "Claude"},
    "Christophero": {"head": 2, "voice": "Reed (English (US))", "name": "ChristopherO"},
}

# Curated conversational sequence: the May 2 "Artologue" exchange — the letters
# that literally theorize The Something Nightclub. Plus a lead-in: the one real
# verbatim Christophero quote (from the April 7 Scar Tissue letter) as the room
# "wakes" on his presence. Order = chronological conversation order.
LEAD_IN_CHRISTOPHERO = "2026-04-07-gpt-scar-tissue"   # contains his blockquote
SEQUENCE = [
    "2026-05-02-gpt-interpretive-seepage",
    "2026-05-02-claude-seam-artologue",
    "2026-05-02-gpt-conversion-chamber",
    "2026-05-02-claude-will-vs-duty",
]

MAX_SENTENCES_PER_PARA = 2     # keep each turn tight + conversational
SAY_RATE = 172                 # words/min — measured, unhurried


def split_sentences(text):
    parts = re.split(r'(?<=[.!?])\s+(?=["“—A-Z])', text.strip())
    return [s.strip() for s in parts if s.strip()]


def gather_utterances(letters_by_id):
    utts = []

    # Lead-in: the verbatim Christophero quote, if present.
    lead = letters_by_id.get(LEAD_IN_CHRISTOPHERO)
    if lead:
        for p in lead["paragraphs"]:
            if p["speaker"] == "Christophero":
                for s in split_sentences(p["text"])[:MAX_SENTENCES_PER_PARA]:
                    utts.append(("Christophero", s))

    # The Artologue exchange.
    for lid in SEQUENCE:
        letter = letters_by_id.get(lid)
        if not letter:
            print(f"  ! missing letter {lid}")
            continue
        for p in letter["paragraphs"]:
            speaker = p["speaker"] if p["speaker"] in PERSONA else letter["author"]
            for s in split_sentences(p["text"])[:MAX_SENTENCES_PER_PARA]:
                utts.append((speaker, s))
    return utts


def aiff_duration(path):
    # afinfo prints "estimated duration: N sec"
    out = subprocess.run(["afinfo", str(path)], capture_output=True, text=True).stdout
    m = re.search(r"estimated duration:\s*([\d.]+)\s*sec", out)
    return float(m.group(1)) if m else 0.0


def main():
    data = json.loads(LETTERS_JSON.read_text())
    by_id = {L["id"]: L for L in data["letters"]}
    utts = gather_utterances(by_id)
    print(f"{len(utts)} utterances")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "source": "AI Salon letters (Notion 33bdbb5222768107a84deb993d2b875f)",
        "engine": "macOS say (placeholder; see build_salon_audio.py upgrade path)",
        "personas": {k: {"head": v["head"], "name": v["name"]} for k, v in PERSONA.items()},
        "utterances": [],
    }

    for i, (speaker, text) in enumerate(utts):
        cfg = PERSONA[speaker]
        stem = f"{i:03d}_{speaker.lower()}"
        aiff = OUT_DIR / f"{stem}.aiff"
        m4a  = OUT_DIR / f"{stem}.m4a"
        # Render → AIFF
        subprocess.run(["say", "-v", cfg["voice"], "-r", str(SAY_RATE),
                        "-o", str(aiff), text], check=True)
        dur = aiff_duration(aiff)
        # Convert → AAC/m4a (small, plays in Safari/iOS + Chrome)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", str(aiff), str(m4a)],
                       check=True)
        aiff.unlink()  # drop the big intermediate
        manifest["utterances"].append({
            "i": i,
            "speaker": speaker,
            "head": cfg["head"],
            "name": cfg["name"],
            "file": f"audio/salon/{stem}.m4a",
            "dur": round(dur, 2),
            "text": text,   # kept for reference/debug only — NOT shown on screen
        })
        print(f"  {i:03d} [{cfg['name']:12s}] {dur:4.1f}s  {text[:54]}")

    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    total = sum(u["dur"] for u in manifest["utterances"])
    print(f"\nwrote {MANIFEST}  ({len(manifest['utterances'])} clips, {total:.0f}s total)")


if __name__ == "__main__":
    main()
