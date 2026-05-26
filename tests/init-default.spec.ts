// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { test, expect } from "@playwright/test";
import type { Server } from "node:http";
import { serveDir } from "./_helpers/static-server.js";
import { scaffoldAndBuild } from "./_helpers/scaffold-build.js";
import { collectPageIssues } from "./_helpers/page-issues.js";

let serverInstance: Server;
let baseUrl: string;
let cleanupScaffold: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
  const scaffold = await scaffoldAndBuild("default");
  cleanupScaffold = scaffold.cleanup;
  const handle = serveDir(scaffold.distDir);
  serverInstance = handle.server;
  baseUrl = handle.url;
});

test.afterAll(async () => {
  serverInstance?.close();
  await cleanupScaffold?.();
});

test("scaffolded default template loads with zero JS and HTTP errors", async ({ page }) => {
  const collector = collectPageIssues(page);
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");
  expect(collector.issues).toHaveLength(0);
});

test("scaffolded default template contains ≥4 vBlocks semantic landmark elements", async ({ page }) => {
  await page.goto(baseUrl);
  const sections = page.locator("section, footer");
  expect(await sections.count()).toBeGreaterThanOrEqual(4);
});

test("bg-background class is present in the scaffolded default template DOM", async ({ page }) => {
  await page.goto(baseUrl);
  expect(await page.locator(".bg-background").count()).toBeGreaterThan(0);
});

test("bg-card class is present in the scaffolded default template DOM", async ({ page }) => {
  await page.goto(baseUrl);
  expect(await page.locator(".bg-card").count()).toBeGreaterThan(0);
});

test("at least one grid-cols-* class is present in the scaffolded default template DOM", async ({ page }) => {
  await page.goto(baseUrl);
  expect(await page.locator("[class*='grid-cols-']").count()).toBeGreaterThan(0);
});
