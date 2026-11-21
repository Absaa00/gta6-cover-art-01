[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Absaa00/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Absaa00/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Leonida Nights — GTA 6 Style Cover Maker

Turn your photos into a multi-panel GTA 6-style poster: one large hero panel,
two side panels and a sunset caption band with palm silhouettes, halftone dots
and a purple-to-gold grade — then export it as a PNG to share.

Built for the [make.fun GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Multi-panel poster** — hero panel on top, two side panels below, and a
  caption band with a hand-drawn sunset, palm silhouettes and halftone dots.
- **Any photo** — upload several photos (file picker or drag & drop), pick one
  per panel, drag to reposition, scroll or slide to zoom. One photo can fill
  several panels.
- **Caption** — edit the title and subtitle live.
- **4 colour grades** — Sunset, Neon Night, Palm Noir, Vice Pastel.
- **3 title styles** — Outline, Gradient, Glow.
- **Fast export** — one click downloads a PNG in 1080&times;1080, 1080&times;1350
  or 1920&times;1080.
- **100% offline** — static files only, no network requests, no libraries.
  Photos never leave your machine. The three sample photos are drawn with
  code (PIL) and bundled under `app/samples/`.

## Try it

```sh
cd app
python3 -m http.server 8080
# open http://localhost:8080 in desktop Chrome
```

Or open `app/index.html` through any static file server. `?view=cover&size=1920x1080`
shows the cover alone, edge to edge.

## Layout

```
app/
  index.html   editor page
  app.js       one-canvas renderer (preview and export share renderCover)
  style.css    editor styling
  fonts/       Liberation Sans (SIL OFL 1.1) + FONT-LICENSE.txt
  samples/     three PIL-drawn sample photos
main.ts        copies app/ + screenshots/ to /output, writes dossier.json
screenshots/  cover + editor + square + portrait exports
```

## Originality

Everything is original: no Rockstar Games logo, wordmark, official artwork,
character or font is used. The only font is Liberation Sans under the SIL
Open Font License (see `app/fonts/FONT-LICENSE.txt`).

## License

MIT — see [LICENSE](LICENSE).
