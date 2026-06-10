# `/media/` — shared image assets for chriso.org

Canonical home for public-domain (or otherwise freely-shared) image assets
that get loaded over HTTP by consumers across the site and by external
projects (e.g. the DMX node web UI). Loaded by URL, not embedded, so it
costs storage on chriso.org only — never on microcontrollers/clients
referencing it.

Sibling of `/widgets/` (shared CSS/JS) — same idea, different media type.
Set up 2026-06-09 by the chriso.org-front-page session.

## Files currently here

### `Mrs._Mary_Hallock_Greenwalt.jpg` — untouched source
Thomas Eakins, *Portrait of Mary Hallock-Greenewalt* (1903).
Source: Wikimedia Commons. Original held by Wichita Art Museum, Roland P.
Murdock Collection. Public domain (Eakins d. 1916; created pre-1928).
Keep this copy untouched — it's the master.

### `Mary Hallock-Greenewalt BG.jpg` — derived background
Greyscale + high-contrast + subtle edge-etch derived from the original
above. 666×1000, ~76 kB. Intended as a faint backdrop behind dark UIs (CSS
`background-image` with low opacity / grayscale filter).

**Stable filename** — this is the URL the DMX node UI (and any other
consumer) wires up. Drop a replacement here with the same name to swap the
look site-wide without touching consuming pages.

Regenerate from the source:
```
ffmpeg -i Mrs._Mary_Hallock_Greenwalt.jpg \
  -vf "scale=666:1000:flags=lanczos,format=gray,\
       eq=contrast=1.4:brightness=-0.08:gamma=0.95,\
       edgedetect=mode=colormix:high=0.10:low=0.04" \
  -q:v 4 \
  "Mary Hallock-Greenewalt BG.jpg"
```

**Credit line for any consumer that displays this image:**
> Mary Hallock-Greenewalt by Thomas Eakins (1903), Wichita Art Museum — public domain.

## URLs

- `https://chriso.org/media/Mrs._Mary_Hallock_Greenwalt.jpg`
- `https://chriso.org/media/Mary%20Hallock-Greenewalt%20BG.jpg`

## Conventions for future additions

- Public-domain / shared-rights only here. Anything participant-specific or
  private goes elsewhere.
- Keep the untouched source alongside any derivations, so derivations are
  reproducible (and a record exists of where the source came from).
- Stable filenames for the version consumers reference. Datestamp variants
  if you need to keep an older derivation around.
