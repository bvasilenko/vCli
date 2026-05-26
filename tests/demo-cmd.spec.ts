import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import type { Server } from "node:http";
import { serveDir } from "./_helpers/static-server.js";
import { collectPageIssues } from "./_helpers/page-issues.js";

const DEMO_DIST_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../demo-dist"
);

let serverInstance: Server;
let baseUrl: string;

test.beforeAll(async () => {
  if (!(await fs.pathExists(path.join(DEMO_DIST_DIR, "index.html")))) {
    throw new Error(
      "demo-dist/index.html not found. Run: npm run build (which builds demo-dist/)"
    );
  }

  const handle = serveDir(DEMO_DIST_DIR);
  serverInstance = handle.server;
  baseUrl = handle.url;
});

test.afterAll(() => {
  serverInstance?.close();
});

test("demo page loads with zero JS errors and zero HTTP errors", async ({ page }) => {
  const collector = collectPageIssues(page);

  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");

  expect(collector.issues).toHaveLength(0);
});

test("demo page contains ≥4 vBlocks semantic landmark elements", async ({ page }) => {
  await page.goto(baseUrl);
  const sections = page.locator("section, footer");
  expect(await sections.count()).toBeGreaterThanOrEqual(4);
});

test("bg-background class is present in the DOM", async ({ page }) => {
  await page.goto(baseUrl);
  const el = page.locator(".bg-background");
  expect(await el.count()).toBeGreaterThan(0);
});

test("bg-card class is present in the DOM", async ({ page }) => {
  await page.goto(baseUrl);
  const el = page.locator(".bg-card");
  expect(await el.count()).toBeGreaterThan(0);
});

test("at least one grid-cols-* class is present in the DOM", async ({ page }) => {
  await page.goto(baseUrl);
  const el = page.locator("[class*='grid-cols-']");
  expect(await el.count()).toBeGreaterThan(0);
});
