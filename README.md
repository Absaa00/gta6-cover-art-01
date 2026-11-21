[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Absaa00/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Absaa00/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
# Leonida Nights — GTA-style Cover Maker

Turn your photos into GTA 6-style poster cover art: a multi-panel poster
(one large hero panel, two side panels, one bottom strip), a sunset caption
band with palm silhouettes and halftone dots, a purple → magenta → orange →
gold grade with teal shadows, and bold caption lettering — exported as a PNG
to share.

Entry for [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01)
on make.fun.

## Try it

Serve `app/` with any static file server and open `index.html` in desktop
Chrome. No build step, no network, no upload — photos are read on your own
machine.

```sh
cd app
python3 -m http.server 8080
# open http://localhost:8080
```

## How it works

1. **Add photos** — file picker or drag-and-drop. Three original sample
   photos (drawn for this app, in `app/samples/`) are loaded so the editor
   works immediately.
2. **Arrange each panel** — click a panel to select it, pick its photo, drag
   to reposition, scroll to zoom, or use the zoom slider. One photo can fill
   several panels.
3. **Write the caption** — edit the title and subtitle, pick a title style
   (Outline / Gradient / Glow).
4. **Pick a grade** — Sunset, Neon Night, Palm Noir, or Vice Pastel.
5. **Export** — one click, one PNG: 1080 × 1080, 1080 × 1350, or 1920 × 1080.

The preview and the export share one render function (`renderCover` in
`app/app.js`), so what you see is exactly what the PNG holds.

## Originality

Everything here is original: the layout, the drawn sample photos, the palm
and halftone art (drawn in code), and the Liberation Sans font (SIL Open Font
License 1.1 — see `app/fonts/FONT-LICENSE.txt`). No Rockstar Games logo,
artwork, character, or font is used anywhere. Not affiliated with Rockstar
Games.

## Layout

- `app/index.html` — editor page
- `app/app.js` — cover renderer, panel editing, grades, export
- `app/style.css` — editor styling
- `app/fonts/` — Liberation Sans (OFL 1.1) + license note
- `app/samples/` — three original sample photos drawn with Python PIL
- `vendor/makefun-app.ts` — make.fun kit library, unchanged
- `main.ts` — entry program: copies `app/` + `screenshots/` to the output
  directory and writes `dossier.json`
- `screenshots/` — four screenshots of the app and its exported covers

## License

MIT — see [LICENSE](LICENSE).
