# Vice Cover Forge

[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn a photo and a caption into a multi-panel cover in the style of a Vice City sunset poster — bold lettering, neon colour grades, PNG export. Built for the [make.fun bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Upload a photo** (file picker or drag-and-drop onto the preview). Photos are read locally and never leave the machine.
- **3 multi-panel layouts**: Hero + Duo, Grid 2×2, Strip ×3.
- **Per-panel control**: pick a photo per panel (bundled samples, a drawn skyline, or your uploads), zoom and pan each panel.
- **Editable lettering**: title + subtitle, drawn bold on canvas with system fonts only.
- **3 colour grades**: Sunset, Neon, Dusk.
- **Live preview** and **PNG export** at 1080×1080, 1080×1350, and 1920×1080.

All artwork and lettering is original or drawn in code. No Rockstar logo, artwork, or font is used. The two bundled sample photos were made for make.fun and are free to use.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network, no dependencies — plain static files under `app/`.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored make.fun library. It is deterministic: two runs produce byte-identical output.

## License

MIT — see [LICENSE](LICENSE).
