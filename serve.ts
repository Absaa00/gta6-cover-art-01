// Vice Cover Studio — tiny static file server for local testing.
// Serves the app/ folder on http://localhost:8080 with no dependencies.
// Usage: node serve.ts   (then open http://localhost:8080 in desktop Chrome)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'app');
const port = Number(process.env.PORT ?? 8080);

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    const path = normalize(join(root, decodeURIComponent(req.url?.split('?')[0] ?? '/')));
    if (!path.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const file = path.endsWith('/') ? join(path, 'index.html') : path;
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Vice Cover Studio at http://localhost:${port}`);
});
