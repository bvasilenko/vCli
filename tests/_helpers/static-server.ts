import { createServer, type Server } from "node:http";
import { createReadStream } from "node:fs";
import path from "node:path";
import { extname } from "node:path";
import fs from "fs-extra";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

export interface StaticServerHandle {
  server: Server;
  url: string;
}

export function serveDir(dir: string): StaticServerHandle {
  const rootDir = path.resolve(dir);

  const server = createServer((req, res) => {
    const rawUrl = req.url === "/" ? "/index.html" : (req.url ?? "/index.html");
    const filePath = path.resolve(rootDir, "." + rawUrl);

    if (!filePath.startsWith(rootDir + path.sep) && filePath !== rootDir) {
      res.writeHead(403);
      res.end();
      return;
    }

    if (!fs.pathExistsSync(filePath)) {
      res.writeHead(404);
      res.end();
      return;
    }

    const mime = MIME[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    createReadStream(filePath).pipe(res);
  });

  server.listen(0);
  const port = (server.address() as { port: number }).port;
  return { server, url: `http://localhost:${port}` };
}
