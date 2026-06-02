// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import http from "node:http";
import net from "node:net";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";

export const MIME_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, () => {
      const { port } = probe.address() as net.AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

export function buildStaticHandler(rootDir: string): http.RequestListener {
  const resolvedRoot = path.resolve(rootDir);

  return (req, res) => {
    const rawUrl = req.url === "/" ? "/index.html" : (req.url ?? "/index.html");
    const urlPath = rawUrl.split("?")[0].split("#")[0];

    let decoded: string;
    try {
      decoded = decodeURIComponent(urlPath);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }

    const resolved = path.resolve(resolvedRoot, "." + decoded);
    const withinRoot =
      resolved === resolvedRoot || resolved.startsWith(resolvedRoot + path.sep);

    if (!withinRoot) {
      res.writeHead(403);
      res.end();
      return;
    }

    if (!existsSync(resolved)) {
      res.writeHead(404);
      res.end();
      return;
    }

    const mime =
      MIME_TYPES[path.extname(resolved)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    createReadStream(resolved).pipe(res);
  };
}

export function waitForListening(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
}
