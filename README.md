# Vice Cover Studio — GTA 6-style cover art maker

[![make.fun](https://img.shields.io/badge/make.fun-bounty-ff5e3a)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your photo + caption into a multi-panel poster
cover in the style of GTA 6 posters: bold slanted lettering, a Vice City
sunset / neon colour grade, and export as PNG in 1080×1080, 1080×1350 and
1920×1080.

## What it does

- Upload your own photos (file picker or drag-drop) or use the two bundled
  sample photos. Photos are read on your machine and never leave it.
- Three multi-panel layouts: **Hero + Duo** (one big panel, two stacked),
  **Grid 2×2**, and **Strip ×3**.
- Per-panel crop: zoom, shift, drag the photo inside its panel, replace the
  photo per panel.
- Editable title + subtitle, title size, top/bottom caption banner.
- Three colour grades: **Sunset**, **Neon**, **Dusk**.
- Live preview; one-click PNG export in the three common post sizes.

## Originality

All lettering is drawn on canvas with system fonts. No Rockstar logo,
wordmark, artwork or font is used anywhere. The two sample photos were made
for make.fun with an image model and are free to use.

## Run it

Serve the `app/` folder with any static server and open `index.html` in
desktop Chrome. No build step, no network requests.

```sh
cd app && python3 -m http.server 8080
# open http://localhost:8080
```

## Hand-in program

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
make.fun library:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
