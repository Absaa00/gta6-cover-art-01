/* Leonida Nights Cover Maker — entry program.
 * Copies app/ and screenshots/ from this repository into the output
 * directory and writes /output/dossier.json with buildDossier from
 * the kit library vendor/makefun-app.ts. Standard library only. */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const name of ['app', 'screenshots']) {
  const src = join('.', name);
  if (existsSync(src)) cpSync(src, join(outDir, name), { recursive: true });
}

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
console.log(`wrote ${outDir}/dossier.json`);
