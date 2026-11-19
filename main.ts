// Vice Cover Forge — a gta6-cover-art-01 entry (Node 22, standard library only).
//
// The program hands the app in: it copies app/ and screenshots/ from beside
// this file into the output directory and writes /output/dossier.json with
// buildDossier from the kit's vendored make.fun library. The app itself is
// plain static files a desktop browser loads offline (app/index.html and its
// ES modules, no library, no network request).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files, in all, or a path under app/ over 1000 bytes: app/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json).
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

/** Counts files and bytes under a directory, following no symlinks. */
function countTree(root) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      const sub = countTree(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (stats.isFile()) {
      files += 1;
      bytes += stats.size;
    }
  }
  return { files, bytes };
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

const appTotals = countTree(join(out, 'app'));
const shotFiles = readdirSync(join(out, 'screenshots')).filter((name) => {
  const stats = statSync(join(out, 'screenshots', name));
  return stats.isFile();
});
if (shotFiles.length > DOSSIER_LIMITS.screenshots.max) {
  throw new Error(`too many screenshots: ${shotFiles.length} (max ${DOSSIER_LIMITS.screenshots.max})`);
}
const dossierPath = join(out, 'dossier.json');
writeFileSync(dossierPath, buildDossier(out, DOSSIER_LIMITS));
const dossierBytes = statSync(dossierPath).size;
console.log(
  `vice-cover-forge: app ${appTotals.files} files, ${appTotals.bytes} bytes; `
  + `${shotFiles.length} screenshots; dossier ${dossierBytes} bytes written to ${dossierPath}`,
);
