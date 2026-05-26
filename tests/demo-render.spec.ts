// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import type { Server } from "node:http";
import { serveDir } from "./_helpers/static-server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEMO_DIST_DIR = path.resolve(__dirname, "../demo-dist");
const SCREENSHOT_DIR = path.resolve(__dirname, "../demo/screenshots");

let serverInstance: Server;
let baseUrl: string;

test.beforeAll(async () => {
  if (!(await fs.pathExists(path.join(DEMO_DIST_DIR, "index.html")))) {
    throw new Error(
      "demo-dist/index.html not found — run: npm run build (produces demo-dist/)"
    );
  }
  await fs.ensureDir(SCREENSHOT_DIR);
  const handle = serveDir(DEMO_DIST_DIR);
  serverInstance = handle.server;
  baseUrl = handle.url;
});

test.afterAll(() => {
  serverInstance?.close();
});

test("captures full-page screenshot of the demo to demo/screenshots/index.png", async ({
  page,
}) => {
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");
  const screenshotPath = path.join(SCREENSHOT_DIR, "index.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  expect(await fs.pathExists(screenshotPath)).toBe(true);
});
