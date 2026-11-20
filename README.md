# Vice Cover Studio

[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/gta6-cover-art-01)

Entry for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on make.fun — a web app that turns a person's photo and a caption into cover art in the style of GTA 6 posters: multi-panel poster look, bold lettering, Vice City sunset or neon colour grade, exported as a PNG to share.

## What it does

- **Your photos, local only** — pick files or drag and drop them; nothing is uploaded, the app works fully offline. Two built-in sample photos are included.
- **Three multi-panel layouts** — Sunset Strip (hero + two panels), Neon Grid (2×2), Boulevard Trio (three tall strips).
- **Per-panel control** — choose which photo fills each panel, then zoom and pan to crop it exactly how you want.
- **Three colour grades** — Vice Sunset, Neon Nights, Palm Noir, applied as a wash over every panel plus a glowing sun disc and vignette.
- **Bold lettering** — an editable title and subtitle drawn on the cover in heavy italic system fonts, with outline and shadow.
- **PNG export** — one click downloads the cover at 1080×1080, 1080×1350, or 1920×1080. The export is drawn by the same code as the live preview, so what you see is what you get.

## Run it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

No build step, no dependencies, no network requests: `app/` is plain static files (`index.html`, `style.css`, `cover.js`, plus the sample photos under `app/samples/`).

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# out/ holds app/, screenshots/ and dossier.json
```

## Originality

Everything here is original: the layouts, grades, lettering and code are my own. No Rockstar logo, wordmark, official artwork, character or font file is used — lettering is drawn with system fonts and the sample photos were made with an image model for make.fun. License: MIT.
