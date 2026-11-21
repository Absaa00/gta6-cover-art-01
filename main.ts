// Leonida Nights Cover Maker — the program that hands the entry in.
//
// It takes the static web app in app/ and the screenshots in screenshots/
// from next to this file, copies them into the output directory, and writes
// output/dossier.json with the vendored make.fun library so the judge can
// read the entry's summary. Run locally with:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// (Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.)

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const shotsDir = join(repoRoot, "screenshots");
const appDir = join(repoRoot, "app");

function fail(message) {
  throw new Error("leonida-nights main.ts: " + message);
}

if (!existsSync(appDir) || !readdirSync(appDir).length) fail("app/ is missing or empty");
if (!existsSync(join(appDir, "index.html"))) fail("app/index.html is missing");

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, "app"), { recursive: true });

const outShots = join(outDir, "screenshots");
mkdirSync(outShots, { recursive: true });
if (existsSync(shotsDir)) {
  const shots = readdirSync(shotsDir).filter((name) => /\.(png|jpe?g)$/i.test(name));
  if (!shots.length) fail("screenshots/ has no PNG/JPEG files");
  cpSync(shotsDir, outShots, { recursive: true });
} else {
  fail("screenshots/ is missing");
}

// Caps from the scorer's reference gate: keep the entry inside the limits
// the scorer enforces (4 screenshots, 256 KiB each; app/ under 993 files
// and 48 MiB; paths under 1000 bytes; dossier text under 160 KiB).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, "dossier.json"), dossier);
console.log("Leonida Nights entry written to " + outDir);
