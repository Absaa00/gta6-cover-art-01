# Vice Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Absaa00/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Absaa00/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photo + caption into GTA 6-style poster cover art — multi-panel,
bold lettering, Vice City sunset / neon colour grade — and export it as a PNG
to share. Built for the [make.fun bounty "Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Any photo:** add photos from your machine (file picker or drag & drop) —
  nothing is ever uploaded. Two sample photos are bundled under `app/samples/`.
- **Multi-panel layouts:** Hero + Duo (1 big + 2 small), Grid 2×2, or Strip ×3.
  Fill several panels with one photo or several.
- **Crop & position per panel:** click a panel to select it, drag on the
  preview to move the photo, scroll to zoom, or use the sliders.
- **Caption:** editable title + subtitle, drawn as bold poster lettering with
  outline and neon shadow on the canvas.
- **Colour grades:** Sunset, Neon, Dusk.
- **Fast export:** one click exports a PNG in 1080 × 1080, 1080 × 1350, or
  1920 × 1080.

## Original art only

All lettering and art are drawn on canvas with system fonts. No Rockstar
Games logo, wordmark, official artwork, character, or font is used anywhere.

## Run it

The app is plain static files — no build step, no network:

```sh
# serve app/ with any static server, e.g.
python3 -m http.server 8080 --directory app
# open http://localhost:8080 in desktop Chrome
```

Or from this repo, `node serve.ts` (serves `app/` on http://localhost:8080).

Deterministic screenshot URLs the app supports (for `?shot=`):

- `?shot=cover&photo=pier&caption=Sunset%20Heist` — cover only, fullscreen
- `?shot=editor&photo=boulevard&caption=Boulevard%20Queen` — editor with a photo loaded

`?layout=hero|grid|strip`, `?grade=sunset|neon|dusk`, and
`?size=1080x1080|1080x1350|1920x1080` also work.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
into the output directory and writes `dossier.json` with `buildDossier` from
`vendor/makefun-app.ts`. Two runs produce byte-identical output.

Screenshots are taken with `node scripts/shots.mjs` (Playwright, headless
Chromium) — see `shots.json` for the shot list.
