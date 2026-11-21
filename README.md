[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Leonida Nights — GTA 6 Style Cover Maker

Turn your photos into GTA 6 poster-style cover art: a multi-panel
poster (one big hero panel, two side panels and a bottom strip) with
a sunset caption band, palm silhouettes, halftone dots and bold
lettering — exported as a PNG to share.

Built for the [make.fun GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01).

## Use it

Serve `app/` with any static server and open `index.html`:

```sh
python3 -m http.server --directory app 8080
```

1. **Add your photos** — file picker or drag-and-drop. Three sample
   photos are loaded for you to try it with.
2. **Pick a panel** — click a panel on the cover, choose a photo for
   it, drag to reposition, scroll (or use the slider) to zoom. One
   photo can fill several panels.
3. **Write the caption** — title and subtitle, with three title
   styles: Outline, Gradient, Glow.
4. **Pick a colour grade** — Sunset, Neon Night, Palm Noir or
   Vice Pastel.
5. **Export PNG** — 1080 × 1080, 1080 × 1350 or 1920 × 1080.

## How it works

- One canvas render function (`renderCover` in `app/app.js`) draws
  both the live preview and the exported PNG, so what you see is
  exactly what you get.
- Vanilla JavaScript, no external libraries, no network requests.
  Your photos are read on your own machine and never uploaded.
- Lettering uses Liberation Sans, shipped under the SIL Open Font
  License (see `app/fonts/FONT-LICENSE.txt`). No Rockstar Games
  logo, artwork or font is used anywhere.

## Files

- `app/index.html`, `app/app.js`, `app/style.css` — the app
- `app/fonts/` — Liberation Sans (OFL) + license note
- `app/samples/` — three sample photos drawn from scratch with PIL
- `screenshots/` — the cover and the editor in action
- `main.ts` — the make.fun entry program (copies `app/` +
  `screenshots/` to `/output`, writes `dossier.json`)

## License

MIT — see [LICENSE](LICENSE).
