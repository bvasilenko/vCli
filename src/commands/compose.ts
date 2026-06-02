// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { fileURLToPath } from "node:url";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import fs from "fs-extra";
import { CompositionSpecSchema } from "@booga/vbrand/composition";
import { log } from "../utils/log.js";
import { fail } from "../utils/exit.js";
import {
  buildStaticHandler,
  findFreePort,
  waitForListening,
} from "../utils/serve.js";

export interface ComposeOptions {
  port?: number;
  noOpen?: boolean;
  cwd?: string;
  composeDistDir?: string;
}

function resolveComposeDistDir(): string {
  return path.resolve(
    fileURLToPath(new URL("../compose-dist", import.meta.url))
  );
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function buildComposeHandler(
  staticDir: string,
  brandPath: string,
  compositionPath: string
): http.RequestListener {
  const staticHandler = buildStaticHandler(staticDir);

  return async (req, res) => {
    const method = req.method ?? "GET";
    const url = req.url?.split("?")[0] ?? "/";

    if (method === "GET" && url === "/brand") {
      try {
        const brand = await fs.readJson(brandPath);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(brand));
      } catch {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "brand.json not found" }));
      }
      return;
    }

    if (method === "GET" && url === "/composition") {
      try {
        const composition = await fs.readJson(compositionPath);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(composition));
      } catch {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "composition.json not found" }));
      }
      return;
    }

    if (method === "POST" && url === "/composition") {
      try {
        const body = await readBody(req);
        const parsed: unknown = JSON.parse(body);
        const result = CompositionSpecSchema.safeParse(parsed);
        if (!result.success) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: result.error.message })
          );
          return;
        }
        await fs.writeJson(compositionPath, result.data, { spaces: 2 });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
      }
      return;
    }

    staticHandler(req, res);
  };
}

export async function runCompose(opts: ComposeOptions = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const brandPath = path.join(cwd, "brand.json");
  const compositionPath = path.join(cwd, "composition.json");
  const dir = opts.composeDistDir ?? resolveComposeDistDir();

  if (!(await fs.pathExists(brandPath))) {
    fail(
      `brand.json not found at "${brandPath}". Run "vcli scaffold --brand <handle>" first.`
    );
  }

  if (!(await fs.pathExists(compositionPath))) {
    fail(
      `composition.json not found at "${compositionPath}". Run "vcli scaffold --brand <handle>" first.`
    );
  }

  if (!(await fs.pathExists(dir))) {
    fail(
      `compose-dist/ not found at "${dir}". Run the build pipeline first.`
    );
  }

  const port = opts.port ?? (await findFreePort());
  const handler = buildComposeHandler(dir, brandPath, compositionPath);
  const server = http.createServer(handler);
  server.listen(port);
  await waitForListening(server);

  const actualPort = (server.address() as net.AddressInfo).port;
  const url = `http://localhost:${actualPort}`;
  process.stdout.write(url + "\n");
  log.info(`Compose: ${url}`);

  if (!opts.noOpen) {
    const { default: open } = await import("open");
    await open(url);
  }

  await new Promise<void>((resolve, reject) => {
    process.once("SIGINT", () => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });
}
