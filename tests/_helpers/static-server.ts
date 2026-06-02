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

export interface ServeDirOptions {
  /**
   * Strip this URL prefix before resolving files.
   * Used when the Vite build was produced with a non-root `base` (e.g. "/vCli/").
   */
  stripBase?: string;
  /**
   * Serve index.html for requests whose resolved path has no file extension
   * and maps to no existing file (SPA client-side routing support).
   */
  spaFallback?: boolean;
}

function resolveUrlPath(rawUrl: string, opts: ServeDirOptions): string {
  const withoutQuery = rawUrl.split("?")[0].split("#")[0];
  const stripped =
    opts.stripBase && withoutQuery.startsWith(opts.stripBase)
      ? withoutQuery.slice(opts.stripBase.length) || "/"
      : withoutQuery;
  return stripped === "/" ? "/index.html" : stripped;
}

export function serveDir(
  dir: string,
  opts: ServeDirOptions = {}
): StaticServerHandle {
  const rootDir = path.resolve(dir);

  const server = createServer((req, res) => {
    const urlPath = resolveUrlPath(req.url ?? "/", opts);
    const filePath = path.resolve(rootDir, "." + urlPath);

    if (!filePath.startsWith(rootDir + path.sep) && filePath !== rootDir) {
      res.writeHead(403);
      res.end();
      return;
    }

    if (!fs.pathExistsSync(filePath)) {
      if (opts.spaFallback && !extname(urlPath)) {
        const indexPath = path.join(rootDir, "index.html");
        if (fs.pathExistsSync(indexPath)) {
          res.writeHead(200, { "Content-Type": MIME[".html"] });
          createReadStream(indexPath).pipe(res);
          return;
        }
      }
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
