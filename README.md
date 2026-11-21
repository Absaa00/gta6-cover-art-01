[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Absaa00/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Absaa00/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Leonida Nights — Cover Maker

A static, offline web app that turns your own photos and a caption into GTA-style
multi-panel poster cover art, in the spirit of the GTA 6 posters — and exports it
as a PNG to share. Built for the [make.fun bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Multi-panel poster**: one large hero panel, two side panels and a bottom strip,
  plus a caption band with a sunset gradient, palm silhouettes and halftone dots.
- **Any photo**: upload several photos (file picker or drag-and-drop), pick a photo
  per panel, drag to reposition, scroll to zoom, use the zoom slider. One photo
  can fill several panels.
- **Caption**: edit the title and subtitle, with three title styles
  (Gradient / Outline / Glow).
- **Colour grades**: four presets — Sunset, Neon Night, Palm Noir, Vice Pastel —
  each with its own sunset band, photo tint and title colours.
- **One-click PNG export** in the three common post sizes:
  1080 × 1080, 1080 × 1350 and 1920 × 1080.
- Preview and export share the same `renderCover` function, so what you see is
  exactly what you get.

## Run it

Serve `app/` with any static file server and open `index.html` in desktop Chrome,
for example:

```sh
cd app && python3 -m http.server 8080
```

No build step, no libraries, no network requests. Photos are read on your own
machine and never uploaded.

## Original art

Everything is original: the sample photos under `app/samples/` were drawn with
Python PIL for this entry, the title uses a bold system sans stack styled with
CSS and canvas (no font files), and there is no Rockstar Games logo, artwork or
font anywhere in the app.

## Layout

- `app/index.html` — editor page and cover-only view
- `app/app.js` — state, the shared `renderCover` renderer, editor interactions
- `app/style.css` — dark sunset editor theme
- `app/samples/` — three PIL-drawn sample photos
- `main.ts` — entry program: copies `app/` + `screenshots/` to `/output` and
  writes `/output/dossier.json` via `buildDossier` from `vendor/makefun-app.ts`

## License

MIT — see [LICENSE](LICENSE).
