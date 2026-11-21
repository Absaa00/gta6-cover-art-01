[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Absaa00/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Absaa00/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Leonida Nights — Cover Maker

A static web app that turns your own photo and a caption into GTA 6-style
multi-panel poster cover art, in the spirit of the Vice City sunset posters.
Built for the [make.fun](https://make.fun/bounty/gta6-cover-art-01) competition
**gta6-cover-art-01** ("Make GTA 6 Cover Art").

## What it does

- **Four panels, one poster** — a big hero panel, two side panels and a
  bottom strip, with a bold caption band underneath: a setting sun, palm
  silhouettes and halftone dots.
- **Any photo** — add photos from your machine (file picker or drag-and-drop);
  each panel takes its own photo, or several panels can share one photo with
  different crops. Click a panel to select it, drag on the cover to move its
  photo, scroll to zoom, or use the per-panel zoom slider.
- **Caption your way** — edit the title and subtitle, pick a title style
  (outline, gradient or glow) and a colour grade (Sunset, Neon Night,
  Palm Noir, Vice Pastel).
- **One-click export** — PNG in 1080×1080, 1080×1350 or 1920×1080.
- **Offline** — plain static files under `app/`; no build step, no network
  requests, photos never leave your machine. The three sample photos in
  `app/samples/` were drawn from scratch with PIL for this entry.

## Try it

Serve `app/` with any static server and open `index.html` in desktop Chrome:

```sh
cd app && python3 -m http.server 8080
# open http://localhost:8080
```

Or run the entry program, which copies `app/` and `screenshots/` to the
output directory and writes `dossier.json`:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Files

- `app/index.html`, `app/app.js`, `app/style.css` — the cover maker itself.
- `app/samples/` — three original sunset scenes drawn for this entry.
- `app/fonts/` — Liberation Sans (SIL Open Font License 1.1, see
  `app/fonts/FONT-LICENSE.txt`).
- `screenshots/` — 4 screenshots: the exported cover, the editor with a
  photo loaded, the square export and the portrait export.
- `main.ts` — hands the entry in (`dossier.json` via `vendor/makefun-app.ts`).
- `LICENSE` — MIT.

## Originality

Everything here is original work made for this competition. No Rockstar Games
logo, wordmark, official artwork, character or font is used anywhere.
