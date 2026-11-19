// Takes the screenshots listed in shots.json: serves app/ on a local static
// server, opens each shot URL in headless Chromium, and saves a JPEG into
// screenshots/. Run from the repository root: `node scripts/shots.mjs`.
// Requires the playwright-core package at ~/workspace/makefun/playwright-core
// and a Chromium build in ~/.cache/ms-playwright (chromium-1255).
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(join(process.env.HOME, 'workspace/makefun/playwright-core'));

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const appDir = join(root, 'app');
const shotsDir = join(root, 'screenshots');
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(join(appDir, '.' + path));
  if (!file.startsWith(appDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const port = server.address().port;

const browser = await chromium.launch();
try {
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h }, deviceScaleFactor: shot.dsf ?? 1 });
    page.on('pageerror', (e) => console.error(`[${shot.name}] pageerror:`, e.message));
    await page.goto(`http://127.0.0.1:${port}/${shot.query}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__vice && window.__vice.ready, null, { timeout: 15000 });
    await page.waitForTimeout(400);
    const isCover = shot.query.includes('shot=cover');
    let quality = 85;
    let buf = await page.screenshot({ type: 'jpeg', quality, fullPage: !isCover });
    while (buf.length > 250 * 1024 && quality > 40) {
      quality -= 15;
      buf = await page.screenshot({ type: 'jpeg', quality, fullPage: !isCover });
    }
    mkdirSync(shotsDir, { recursive: true });
    const out = join(shotsDir, shot.name);
    writeFileSync(out, buf);
    console.log(`${shot.name}: ${buf.length} bytes (quality ${quality})`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log('done');
