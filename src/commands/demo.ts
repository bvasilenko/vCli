// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { fileURLToPath } from "node:url";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import fs from "fs-extra";
import { log } from "../utils/log.js";
import { fail } from "../utils/exit.js";
import {
  MIME_TYPES as _MIME_TYPES,
  findFreePort as _findFreePort,
  buildStaticHandler,
  waitForListening as _waitForListening,
} from "../utils/serve.js";

export interface DemoOptions {
  noOpen?: boolean;
  port?: number;
  demoDistDir?: string;
}

export { _MIME_TYPES as MIME_TYPES, _findFreePort as findFreePort };

export function buildRequestHandler(dir: string): http.RequestListener {
  return buildStaticHandler(dir);
}

function resolveDemoDistDir(): string {
  return path.resolve(
    fileURLToPath(new URL("../demo-dist", import.meta.url))
  );
}

export async function runDemo(opts: DemoOptions = {}): Promise<void> {
  const dir = opts.demoDistDir ?? resolveDemoDistDir();

  if (!(await fs.pathExists(dir))) {
    fail(
      `demo-dist/ not found at "${dir}". Run the build pipeline first (npm run build).`
    );
  }

  const server = http.createServer(buildStaticHandler(dir));
  server.listen(opts.port ?? 0);
  await _waitForListening(server);
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
