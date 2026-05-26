// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { fileURLToPath } from "node:url";
import http from "node:http";
import net from "node:net";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import fs from "fs-extra";
import { log } from "../utils/log.js";
import { fail } from "../utils/exit.js";

export interface DemoOptions {
  noOpen?: boolean;
  port?: number;
  demoDistDir?: string;
}

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

function resolveDemoDistDir(): string {
  return path.resolve(
    fileURLToPath(new URL("../demo-dist", import.meta.url))
  );
}

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

export function buildRequestHandler(dir: string): http.RequestListener {
  const rootDir = path.resolve(dir);

  return (req, res) => {
    const rawUrl = req.url === "/" ? "/index.html" : (req.url ?? "/index.html");

    let decoded: string;
    try {
      decoded = decodeURIComponent(rawUrl);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }

    const resolved = path.resolve(rootDir, "." + decoded);
    const withinRoot =
      resolved === rootDir || resolved.startsWith(rootDir + path.sep);

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

    const mime = MIME_TYPES[path.extname(resolved)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    createReadStream(resolved).pipe(res);
  };
}

function waitForListening(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
}

export async function runDemo(opts: DemoOptions = {}): Promise<void> {
  const dir = opts.demoDistDir ?? resolveDemoDistDir();

  if (!(await fs.pathExists(dir))) {
    fail(
      `demo-dist/ not found at "${dir}". Run the build pipeline first (npm run build).`
    );
  }

  const server = http.createServer(buildRequestHandler(dir));
  server.listen(opts.port ?? 0);
  await waitForListening(server);
  const port = (server.address() as net.AddressInfo).port;

  const url = `http://localhost:${port}`;
  process.stdout.write(url + "\n");
  log.info(`Demo: ${url}`);

  if (!opts.noOpen) {
    const { default: open } = await import("open");
    await open(url);
  }

  const delayMs = opts.noOpen ? 0 : 2_000;
  await new Promise<void>((r) => setTimeout(r, delayMs));

  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

  process.exit(0);
}
