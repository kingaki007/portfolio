// Tiny static server for ./site that behaves like GitHub Pages:
// serves folders via index.html and answers unknown paths with 404.html (status 404).
// Usage: npm run preview            (port 4173)
//        PORT=8080 npm run preview
import http from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve("site");
const port = Number(process.env.PORT) || 4173;

if (!existsSync(root)) {
  console.error('No ./site folder. Run "npm run build" first.');
  process.exit(1);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const send = (res, status, file) => {
  res.writeHead(status, { "content-type": types[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
};

http
  .createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = normalize(join(root, path));
    if (!file.startsWith(root)) return send(res, 404, join(root, "404.html"));
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!path.endsWith("/")) {
        res.writeHead(301, { location: path + "/" });
        return res.end();
      }
      file = join(file, "index.html");
    }
    if (existsSync(file)) return send(res, 200, file);
    const notFound = join(root, "404.html");
    if (existsSync(notFound)) return send(res, 404, notFound);
    res.writeHead(404);
    res.end("Not found");
  })
  .listen(port, () => console.log(`Serving ./site at http://localhost:${port}/`));
