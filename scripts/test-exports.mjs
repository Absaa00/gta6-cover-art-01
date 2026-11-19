// Verifies the app's Export PNG flow end to end in headless Chromium:
// loads the editor with a sample photo, exports all three sizes, and checks
// each downloaded file is a real PNG with the expected dimensions.
// Run from the repository root: `node scripts/test-exports.mjs`
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(join(process.env.HOME, 'workspace/makefun/playwright-core'));

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const appDir = join(root, 'app');

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

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

function pngSize(buf) {
  if (buf.length < 33 || buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a PNG');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const browser = await chromium.launch();
let failures = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => { console.error('pageerror:', e.message); failures++; });
  page.on('console', (m) => { if (m.type() === 'error') console.error('console error:', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/?shot=editor&photo=pier,boulevard&caption=Sunset%20Heist`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__vice && window.__vice.ready, null, { timeout: 15000 });
  await page.waitForTimeout(300);
  for (const size of ['1080x1080', '1080x1350', '1920x1080']) {
    await page.click(`#sizeSeg [data-size="${size}"]`);
    await page.waitForTimeout(200);
    const dlPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.click('#exportBtn2');
    const download = await dlPromise;
    const path = `/tmp/vice-export-${size}.png`;
    await download.saveAs(path);
    const buf = readFileSync(path);
    const { w, h } = pngSize(buf);
    const [ew, eh] = size.split('x').map(Number);
    const ok = w === ew && h === eh;
    console.log(`${size}: ${buf.length} bytes, ${w}x${h} ${ok ? 'OK' : `MISMATCH (expected ${ew}x${eh})`}`);
    if (!ok) failures++;
  }
  // Sanity: the preview canvas is non-blank.
  const blank = await page.evaluate(() => {
    const c = document.getElementById('preview');
    const x = c.getContext('2d');
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 401) sum += d[i] + d[i + 1] + d[i + 2];
    return sum === 0;
  });
  console.log(`preview non-blank: ${!blank}`);
  if (blank) failures++;
} finally {
  await browser.close();
  server.close();
}
console.log(failures === 0 ? 'ALL EXPORT TESTS PASSED' : `${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
