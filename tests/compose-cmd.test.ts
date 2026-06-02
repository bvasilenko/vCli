// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { runCompose } from "../src/commands/compose.js";

const { openSpy } = vi.hoisted(() => ({
  openSpy: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),
}));
vi.mock("open", () => ({ default: openSpy }));


const BRAND = {
  name: "Test",
  voice: { canonical: "c", repoDescription: "d" },
  assets: {
    favicon: { source: "f.svg", sizes: [32] },
    og: { dimensions: [1200, 630] },
    icons: { source: "i.svg", set: [] },
  },
  tokens: { color: {}, type: {} },
};

const COMPOSITION = {
  sections: [
    { id: "hero", visible: true, density: "regular", order: 0 },
    { id: "features", visible: true, density: "regular", order: 1 },
  ],
};

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

async function get(
  port: number,
  url: string
): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    http
      .get(`http://localhost:${port}${url}`, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString(),
            headers: res.headers,
          })
        );
      })
      .on("error", reject);
  });
}

async function post(
  port: number,
  url: string,
  body: unknown
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "localhost",
        port,
        path: url,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() })
        );
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

describe("runCompose server endpoints", () => {
  let tmpDir: string;
  let distDir: string;
  let port: number;
  let stopServer: () => Promise<void>;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-compose-test-"));
    distDir = path.join(tmpDir, "compose-dist");

    await fs.writeJson(path.join(tmpDir, "brand.json"), BRAND);
    await fs.writeJson(path.join(tmpDir, "composition.json"), COMPOSITION);

    await fs.ensureDir(distDir);
    await fs.writeFile(
      path.join(distDir, "index.html"),
      "<!doctype html><html><body>compose</body></html>"
    );

    port = await findFreePort();

    const composePromise = runCompose({
      port,
      noOpen: true,
      cwd: tmpDir,
      composeDistDir: distDir,
    });

    await new Promise<void>((r) => setTimeout(r, 100));
    stopServer = async () => {
      process.emit("SIGINT", "SIGINT");
      await composePromise.catch(() => undefined);
    };
  });

  afterAll(async () => {
    await stopServer();
    await fs.remove(tmpDir);
  });

  it("GET /brand returns the brand.json content", async () => {
    const { status, body } = await get(port, "/brand");
    expect(status).toBe(200);
    const parsed = JSON.parse(body) as typeof BRAND;
    expect(parsed.name).toBe("Test");
  });

  it("GET /composition returns the composition.json content", async () => {
    const { status, body } = await get(port, "/composition");
    expect(status).toBe(200);
    const parsed = JSON.parse(body) as typeof COMPOSITION;
    expect(parsed.sections).toHaveLength(2);
  });

  it("POST /composition with valid spec persists to disk", async () => {
    const updated = {
      sections: [
        { id: "hero", visible: false, density: "compact", order: 0 },
      ],
    };
    const { status } = await post(port, "/composition", updated);
    expect(status).toBe(200);

    const onDisk = await fs.readJson(path.join(tmpDir, "composition.json"));
    expect((onDisk as typeof updated).sections[0].visible).toBe(false);
  });

  it("POST /composition success response body is { ok: true }", async () => {
    const updated = {
      sections: [{ id: "hero", visible: true, density: "regular" as const, order: 0 }],
    };
    const { status, body } = await post(port, "/composition", updated);
    expect(status).toBe(200);
    expect(JSON.parse(body)).toEqual({ ok: true });
  });

  it("POST /composition with invalid spec returns 400", async () => {
    const { status } = await post(port, "/composition", { invalid: true });
    expect(status).toBe(400);
  });

  it("POST /composition with non-JSON body returns 400", async () => {
    const { status } = await new Promise<{ status: number; body: string }>(
      (resolve, reject) => {
        const data = "not json at all";
        const req = http.request(
          {
            hostname: "localhost",
            port,
            path: "/composition",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(data),
            },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (c: Buffer) => chunks.push(c));
            res.on("end", () =>
              resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() })
            );
          }
        );
        req.on("error", reject);
        req.write(data);
        req.end();
      }
    );
    expect(status).toBe(400);
  });

  it("GET / serves the static index.html", async () => {
    const { status, body } = await get(port, "/");
    expect(status).toBe(200);
    expect(body).toContain("compose");
  });

  it("GET /nonexistent returns 404", async () => {
    const { status } = await get(port, "/nonexistent.html");
    expect(status).toBe(404);
  });

  it("GET /brand response declares Content-Type: application/json", async () => {
    const { headers } = await get(port, "/brand");
    expect(headers["content-type"]).toMatch(/application\/json/);
  });

  it("GET /composition response declares Content-Type: application/json", async () => {
    const { headers } = await get(port, "/composition");
    expect(headers["content-type"]).toMatch(/application\/json/);
  });

  it("GET /composition after POST /composition returns the persisted update", async () => {
    const unique = { sections: [{ id: "read-after-write", visible: true, density: "regular" as const, order: 0 }] };
    const { status: postStatus } = await post(port, "/composition", unique);
    expect(postStatus).toBe(200);

    const { status, body } = await get(port, "/composition");
    expect(status).toBe(200);
    const parsed = JSON.parse(body) as typeof unique;
    expect(parsed.sections[0].id).toBe("read-after-write");
  });
});

describe("runCompose startup guards", () => {
  it("throws when composeDistDir is not supplied and the default package path is absent", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-compose-nodir-"));
    await fs.writeJson(path.join(dir, "brand.json"), BRAND);
    await fs.writeJson(path.join(dir, "composition.json"), COMPOSITION);
    await expect(
      runCompose({ cwd: dir, noOpen: true })
    ).rejects.toThrow();
    await fs.remove(dir);
  });

  it("throws when brand.json is missing", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-compose-guard-"));
    const distDir = path.join(tmpDir, "dist");
    await fs.ensureDir(distDir);
    await fs.writeJson(path.join(tmpDir, "composition.json"), COMPOSITION);
    await expect(
      runCompose({ cwd: tmpDir, composeDistDir: distDir, noOpen: true })
    ).rejects.toThrow();
    await fs.remove(tmpDir);
  });

  it("throws when composition.json is missing", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-compose-guard-"));
    const distDir = path.join(tmpDir, "dist");
    await fs.ensureDir(distDir);
    await fs.writeJson(path.join(tmpDir, "brand.json"), BRAND);
    await expect(
      runCompose({ cwd: tmpDir, composeDistDir: distDir, noOpen: true })
    ).rejects.toThrow();
    await fs.remove(tmpDir);
  });

  it("throws when compose-dist is missing", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-compose-guard-"));
    await fs.writeJson(path.join(tmpDir, "brand.json"), BRAND);
    await fs.writeJson(path.join(tmpDir, "composition.json"), COMPOSITION);
    await expect(
      runCompose({ cwd: tmpDir, composeDistDir: "/nonexistent/dist", noOpen: true })
    ).rejects.toThrow();
    await fs.remove(tmpDir);
  });
});

describe("runCompose – resource endpoint error paths", () => {
  let tmpDir: string;
  let distDir: string;
  let port: number;
  let stopServer: () => Promise<void>;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-compose-err-"));
    distDir = path.join(tmpDir, "dist");

    await fs.writeJson(path.join(tmpDir, "brand.json"), BRAND);
    await fs.writeJson(path.join(tmpDir, "composition.json"), COMPOSITION);
    await fs.ensureDir(distDir);
    await fs.writeFile(path.join(distDir, "index.html"), "<!doctype html>");

    port = await findFreePort();
    const composePromise = runCompose({
      port,
      noOpen: true,
      cwd: tmpDir,
      composeDistDir: distDir,
    });
    await new Promise<void>((r) => setTimeout(r, 100));
    stopServer = async () => {
      process.emit("SIGINT", "SIGINT");
      await composePromise.catch(() => undefined);
    };
  });

  afterAll(async () => {
    await stopServer();
    await fs.remove(tmpDir);
  });

  it("GET /brand returns 404 JSON when brand.json is removed after server starts", async () => {
    await fs.remove(path.join(tmpDir, "brand.json"));
    const { status, body } = await get(port, "/brand");
    expect(status).toBe(404);
    expect(JSON.parse(body)).toHaveProperty("error");
  });

  it("GET /composition returns 404 JSON when composition.json is removed after server starts", async () => {
    await fs.remove(path.join(tmpDir, "composition.json"));
    const { status, body } = await get(port, "/composition");
    expect(status).toBe(404);
    expect(JSON.parse(body)).toHaveProperty("error");
  });
});

describe("runCompose – browser launch", () => {
  it("opens the server URL in the browser when noOpen is not set", async () => {
    openSpy.mockClear();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-compose-open-"));
    const distDir = path.join(dir, "dist");
    await fs.writeJson(path.join(dir, "brand.json"), BRAND);
    await fs.writeJson(path.join(dir, "composition.json"), COMPOSITION);
    await fs.ensureDir(distDir);
    await fs.writeFile(path.join(distDir, "index.html"), "<!doctype html>");

    const port = await findFreePort();
    const composePromise = runCompose({ port, cwd: dir, composeDistDir: distDir });
    await new Promise<void>((r) => setTimeout(r, 150));

    expect(openSpy).toHaveBeenCalledOnce();
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining(`localhost:${port}`));

    process.emit("SIGINT", "SIGINT");
    await composePromise.catch(() => undefined);
    await fs.remove(dir);
  });
});

describe("runCompose – option defaults", () => {
  it("uses process.cwd() as project root when cwd is not supplied", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-compose-cwd-"));
    const distDir = path.join(dir, "dist");
    await fs.writeJson(path.join(dir, "brand.json"), BRAND);
    await fs.writeJson(path.join(dir, "composition.json"), COMPOSITION);
    await fs.ensureDir(distDir);
    await fs.writeFile(path.join(distDir, "index.html"), "<!doctype html>");

    const cwdStub = vi.spyOn(process, "cwd").mockReturnValue(dir);
    const port = await findFreePort();
    const composePromise = runCompose({ port, noOpen: true, composeDistDir: distDir });
    await new Promise<void>((r) => setTimeout(r, 100));

    const { status } = await get(port, "/brand");
    expect(status).toBe(200);

    cwdStub.mockRestore();
    process.emit("SIGINT", "SIGINT");
    await composePromise.catch(() => undefined);
    await fs.remove(dir);
  });

  it("auto-assigns a free port and emits the URL when port is not specified", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-compose-port-"));
    const distDir = path.join(dir, "dist");
    await fs.writeJson(path.join(dir, "brand.json"), BRAND);
    await fs.writeJson(path.join(dir, "composition.json"), COMPOSITION);
    await fs.ensureDir(distDir);
    await fs.writeFile(path.join(distDir, "index.html"), "<!doctype html>");

    const capturedUrls: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      if (typeof chunk === "string" && chunk.startsWith("http://")) capturedUrls.push(chunk.trim());
      return true;
    });

    const composePromise = runCompose({ cwd: dir, noOpen: true, composeDistDir: distDir });
    await new Promise<void>((r) => setTimeout(r, 100));
    stdoutSpy.mockRestore();

    expect(capturedUrls).toHaveLength(1);
    const assignedPort = Number(new URL(capturedUrls[0]).port);
    expect(assignedPort).toBeGreaterThan(0);
    expect(assignedPort).toBeLessThanOrEqual(65535);

    process.emit("SIGINT", "SIGINT");
    await composePromise.catch(() => undefined);
    await fs.remove(dir);
  });
});
