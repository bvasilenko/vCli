import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { createServer, type Server } from "node:http";
import { createReadStream } from "node:fs";
import { extname } from "node:path";
import { runBuild } from "../src/commands/build.js";

const DEMO_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../demo"
);
const OUT_DIR = path.join(DEMO_DIR, "out");
const OUT_INDEX = path.join(OUT_DIR, "index.html");
const SCREENSHOT_DIR = path.join(DEMO_DIR, "screenshots");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
};

function serveDir(dir: string): { server: Server; url: string } {
  const server = createServer((req, res) => {
    const filePath = path.join(
      dir,
      req.url === "/" ? "index.html" : req.url ?? "index.html"
    );
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

let serverInstance: Server;
let baseUrl: string;

test.beforeAll(async () => {
  if (!(await fs.pathExists(OUT_INDEX))) {
    await runBuild({ config: "vssg.config.js", cwd: DEMO_DIR });
  }
  await fs.ensureDir(SCREENSHOT_DIR);
  const { server, url } = serveDir(OUT_DIR);
  serverInstance = server;
  baseUrl = url;
});

test.afterAll(() => {
  serverInstance?.close();
});

test("renders vsuite landing page with ≥4 vBlocks sections", async ({
  page,
}) => {
  await page.goto(baseUrl);
  const sections = page.locator("section");
  expect(await sections.count()).toBeGreaterThanOrEqual(4);
});

test("DSL role classes present — elements carry generated class names", async ({
  page,
}) => {
  await page.goto(baseUrl);
  const classed = page.locator("[class]");
  expect(await classed.count()).toBeGreaterThan(0);
});

test("zero unhandled JS errors on page load", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");
  expect(errors).toHaveLength(0);
});

test("captures screenshot to demo/screenshots/index.png", async ({ page }) => {
  await page.goto(baseUrl);
  const screenshotPath = path.join(SCREENSHOT_DIR, "index.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  expect(await fs.pathExists(screenshotPath)).toBe(true);
});
