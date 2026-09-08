// Servidor estático mínimo para el preview local, sin caché (así los cambios en
// JS/CSS se ven al recargar sin quedar pegados a una versión vieja del módulo).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 4174;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    let ruta = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    if (ruta.endsWith('/')) ruta += 'index.html';
    const abs = join(ROOT, normalize(ruta));
    if (!abs.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const cuerpo = await readFile(abs);
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(abs)] || 'application/octet-stream',
      'Cache-Control': 'no-store, must-revalidate',
    });
    res.end(cuerpo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}).listen(PORT, () => {
  console.log(`dev-server en http://localhost:${PORT}`);
});
