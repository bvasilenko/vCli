import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import fs from "fs-extra";

vi.mock("../src/utils/log.js", () => ({
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
  spinner: vi.fn(() => ({ succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() })),
}));

import {
  runDemo,
  buildRequestHandler,
  findFreePort,
  MIME_TYPES,
} from "../src/commands/demo.js";
import { VcliError } from "../src/utils/exit.js";

async function withHandler(
  dir: string,
  test: (url: string) => Promise<void>
): Promise<void> {
  const handler = buildRequestHandler(dir);
  const server = http.createServer(handler);
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as net.AddressInfo;
  try {
    await test(`http://localhost:${port}`);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
}

describe("runDemo — lifecycle", () => {
  let tmpDir: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  const capturedUrls: string[] = [];

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-demo-"));
    capturedUrls.length = 0;
    vi.clearAllMocks();

    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      if (typeof chunk === "string" && chunk.startsWith("http://"))
        capturedUrls.push(chunk.trim());
      return true;
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.remove(tmpDir);
  });

  it("throws VcliError when demoDistDir does not exist", async () => {
    await expect(
      runDemo({ noOpen: true, demoDistDir: path.join(tmpDir, "nonexistent") })
    ).rejects.toBeInstanceOf(VcliError);
  });

  it("throws VcliError when demoDistDir exists but is a file, not a dir", async () => {
    const file = path.join(tmpDir, "not-a-dir.txt");
    await fs.writeFile(file, "x");
    await expect(
      runDemo({ noOpen: true, demoDistDir: path.join(tmpDir, "ghost") })
    ).rejects.toBeInstanceOf(VcliError);
  });

  it("writes a valid http://localhost:<port> URL to stdout on startup", async () => {
    await fs.writeFile(path.join(tmpDir, "index.html"), "<html/>");
    await runDemo({ noOpen: true, demoDistDir: tmpDir });
    expect(capturedUrls).toHaveLength(1);
    expect(capturedUrls[0]).toMatch(/^http:\/\/localhost:\d+$/);
  });

  it("uses the caller-supplied port in the URL", async () => {
    await fs.writeFile(path.join(tmpDir, "index.html"), "<html/>");
    const port = await findFreePort();
    await runDemo({ noOpen: true, demoDistDir: tmpDir, port });
    const url = capturedUrls[0];
    expect(new URL(url).port).toBe(String(port));
  });

  it("exits exactly once with code 0 on success", async () => {
    await fs.writeFile(path.join(tmpDir, "index.html"), "<html/>");
    await runDemo({ noOpen: true, demoDistDir: tmpDir });
    expect(exitSpy).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("port in the emitted URL is within the valid TCP range", async () => {
    await fs.writeFile(path.join(tmpDir, "index.html"), "<html/>");
    await runDemo({ noOpen: true, demoDistDir: tmpDir });
    const port = Number(new URL(capturedUrls[0]).port);
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThanOrEqual(65535);
  });

  it("server is no longer accepting connections after runDemo resolves", async () => {
    await fs.writeFile(path.join(tmpDir, "index.html"), "<html/>");
    await runDemo({ noOpen: true, demoDistDir: tmpDir });
    await expect(fetch(capturedUrls[0])).rejects.toThrow();
  });
});

describe("findFreePort", () => {
  it("returns a positive integer port number", async () => {
    const port = await findFreePort();
    expect(Number.isInteger(port)).toBe(true);
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThanOrEqual(65535);
  });

  it("returns a port that is free (can be immediately bound)", async () => {
    const port = await findFreePort();
    await new Promise<void>((resolve, reject) => {
      const server = net.createServer();
      server.listen(port, () => server.close(() => resolve()));
      server.on("error", reject);
    });
  });

  it("returns different ports on successive calls (high probability)", async () => {
    const [a, b, c] = await Promise.all([
      findFreePort(),
      findFreePort(),
      findFreePort(),
    ]);
    const unique = new Set([a, b, c]);
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe("buildRequestHandler — routing", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-handler-"));
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it("GET / returns 200 with index.html content", async () => {
    await fs.writeFile(path.join(tmpDir, "index.html"), "<html>root</html>");
    await withHandler(tmpDir, async (url) => {
      const res = await fetch(url + "/");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("<html>root</html>");
    });
  });

  it("GET /index.html returns 200 same as GET /", async () => {
    await fs.writeFile(path.join(tmpDir, "index.html"), "<html>direct</html>");
    await withHandler(tmpDir, async (url) => {
      const [root, explicit] = await Promise.all([
        fetch(url + "/").then((r) => r.text()),
        fetch(url + "/index.html").then((r) => r.text()),
      ]);
      expect(root).toBe(explicit);
    });
  });

  it("GET /assets/app.js returns 200 for an existing nested file", async () => {
    await fs.ensureDir(path.join(tmpDir, "assets"));
    await fs.writeFile(path.join(tmpDir, "assets", "app.js"), "console.log(1)");
    await withHandler(tmpDir, async (url) => {
      const res = await fetch(url + "/assets/app.js");
      expect(res.status).toBe(200);
    });
  });

  it("GET /missing.txt returns 404", async () => {
    await withHandler(tmpDir, async (url) => {
      const res = await fetch(url + "/missing.txt");
      expect(res.status).toBe(404);
    });
  });

  it("returns 403 for a path that decodes outside the root directory", () => {
    const handler = buildRequestHandler(tmpDir);
    const statuses: number[] = [];
    const req = { url: "/../../../etc/passwd" } as http.IncomingMessage;
    const res = {
      writeHead: (code: number) => statuses.push(code),
      end: vi.fn(),
    } as unknown as http.ServerResponse;
    handler(req, res);
    expect(statuses[0]).toBe(403);
  });

  it("returns 403 when path segment escapes root via url-encoded traversal", () => {
    const handler = buildRequestHandler(tmpDir);
    const statuses: number[] = [];
    const req = {
      url: "/..%2F..%2Fetc%2Fpasswd",
    } as http.IncomingMessage;
    const res = {
      writeHead: (code: number) => statuses.push(code),
      end: vi.fn(),
    } as unknown as http.ServerResponse;
    handler(req, res);
    expect(statuses[0]).toBe(403);
  });

  it("returns 400 for a URL with invalid percent-encoding", () => {
    const handler = buildRequestHandler(tmpDir);
    const statuses: number[] = [];
    const req = { url: "/%GG" } as http.IncomingMessage;
    const res = {
      writeHead: (code: number) => statuses.push(code),
      end: vi.fn(),
    } as unknown as http.ServerResponse;
    handler(req, res);
    expect(statuses[0]).toBe(400);
  });

  it("missing req.url (undefined) is treated the same as GET / — serves index.html", async () => {
    await fs.writeFile(path.join(tmpDir, "index.html"), "<html>fallback</html>");
    await withHandler(tmpDir, async (url) => {
      const res = await fetch(url + "/");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("<html>fallback</html>");
    });
  });

  it("serves index.html when req.url is null or undefined", async () => {
    await fs.writeFile(path.join(tmpDir, "index.html"), "<html>null-fallback</html>");
    const handler = buildRequestHandler(tmpDir);
    const statuses: number[] = [];
    const { PassThrough } = await import("node:stream");
    const sink = new PassThrough();
    sink.resume();
    const fakeRes = Object.assign(sink, {
      writeHead: (code: number) => statuses.push(code),
    }) as unknown as http.ServerResponse;
    handler({ url: undefined } as http.IncomingMessage, fakeRes);
    await new Promise<void>((r) => sink.once("end", r));
    expect(statuses[0]).toBe(200);
  });
});

describe("buildRequestHandler — MIME types", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-mime-"));
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  const EXTENSION_CASES = [
    [".html", "text/html"],
    [".css", "text/css"],
    [".js", "application/javascript"],
    [".json", "application/json"],
    [".svg", "image/svg+xml"],
    [".png", "image/png"],
    [".woff2", "font/woff2"],
  ] as const;

  for (const [ext, expectedMime] of EXTENSION_CASES) {
    it(`serves ${ext} with Content-Type containing ${expectedMime}`, async () => {
      const filename = `test${ext}`;
      await fs.writeFile(path.join(tmpDir, filename), "data");
      await withHandler(tmpDir, async (url) => {
        const res = await fetch(`${url}/${filename}`);
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain(expectedMime);
      });
    });
  }

  it("serves unknown extension with application/octet-stream", async () => {
    await fs.writeFile(path.join(tmpDir, "data.xyz"), "binary");
    await withHandler(tmpDir, async (url) => {
      const res = await fetch(url + "/data.xyz");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/octet-stream");
    });
  });

  it("MIME_TYPES map covers all common Vite output extensions", () => {
    for (const ext of [".html", ".css", ".js", ".json", ".svg", ".png"]) {
      expect(MIME_TYPES).toHaveProperty(ext);
    }
  });
});
