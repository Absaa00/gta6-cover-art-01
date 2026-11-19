// Vice Cover Studio — make.fun entry program (Node 22, standard library only).
//
// The entry is a static offline web app under app/ (index.html + app.js +
// styles.css + sample photos) and 3-4 screenshots under screenshots/. This
// program hands it in: it copies app/ and screenshots/ from beside this file
// into /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with buildDossier from the vendored make.fun library.
//
// The copy is deterministic: entries are visited in sorted path order and no
// timestamps are written anywhere, so two runs produce byte-identical output.
//
// Run it from the repository root:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Gate caps from the competition kit (reference/gate.json): the dossier
// builder enforces them so a bad bundle is refused here, not by the scorer.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function copyTreeSorted(fromDir: string, toDir: string): void {
  mkdirSync(toDir, { recursive: true });
  const names = readdirSync(fromDir).sort();
  for (const name of names) {
    const from = join(fromDir, name);
    const to = join(toDir, name);
    if (statSync(from).isDirectory()) copyTreeSorted(from, to);
    else copyFileSync(from, to);
  }
}

mkdirSync(outDir, { recursive: true });
copyTreeSorted(join(repoRoot, 'app'), join(outDir, 'app'));
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  copyTreeSorted(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
}

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_CAPS));
console.log(`Wrote ${outDir}/dossier.json`);
