// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import fs from "fs-extra";
import JSZip from "jszip";
import { serveDir } from "../../../tests/_helpers/static-server.js";
import { collectPageIssues } from "../../../tests/_helpers/page-issues.js";

const ALL_APP_TYPES = ["landing", "marketing", "docs", "dashboard"] as const;

const DIST_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist"
);

let serverInstance: Server;
let baseUrl: string;

test.beforeAll(async () => {
  if (!(await fs.pathExists(path.join(DIST_DIR, "index.html")))) {
    throw new Error(
      "examples/scaffolder/dist/index.html not found. Run: cd examples/scaffolder && bun run build"
    );
  }
  const handle = serveDir(DIST_DIR, {
    stripBase: "/vCli",
    spaFallback: true,
  });
  serverInstance = handle.server;
  baseUrl = handle.url;
});

test.afterAll(() => {
  serverInstance?.close();
});

for (const appType of ALL_APP_TYPES) {
  test(`${appType} app-type loads fixture:stripe without JS errors`, async ({ page }) => {
    const collector = collectPageIssues(page);

    await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=${appType}`);
    await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({ timeout: 15_000 });

    const jsErrors = collector.issues.filter((i) => i.kind === "js-error");
    expect(jsErrors).toHaveLength(0);
  });
}

test("composition editor panel mounts with section toggles", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=landing`);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });

  await expect(page.getByText("Sections", { exact: true })).toBeVisible();
  const checkboxes = page.locator("aside input[type='checkbox']");
  await expect(checkboxes.first()).toBeVisible();
  expect(await checkboxes.count()).toBeGreaterThanOrEqual(1);
});

test("preview panel contains rendered template content", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=landing`);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });

  await expect(page.getByText("Preview", { exact: true })).toBeVisible();

  await expect(
    page.getByText("Preview", { exact: true }).first().locator("+ div")
  ).not.toBeEmpty({ timeout: 5_000 });
});

test("download button is enabled after brand loads", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=landing`);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });

  const downloadBtn = page.locator("button:has-text('Download scaffold')");
  await expect(downloadBtn).toBeVisible();
  await expect(downloadBtn).toBeEnabled();
});

test("download button produces a non-empty zip file", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=landing`);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("button:has-text('Download scaffold')").click(),
  ]);

  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Download path is null");
  const { size } = await fs.stat(downloadPath);
  expect(size).toBeGreaterThan(0);
});

test("docs app-type renders docs-template section checkboxes in the composition editor", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=docs`);

  // The docs template renders its own <aside> for the sidebar section, so waiting
  // on a specific CompositionEditor checkbox avoids the strict-mode aside collision.
  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#section-article")).toBeVisible();
  await expect(page.locator("#section-toc")).toBeVisible();
});

test("?app=<type> query parameter restores the app-type sections on page reload", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=docs`);
  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 15_000 });

  await page.reload();

  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#section-article")).toBeVisible();
});

test("download zip scaffold.json.appType matches the selected app type", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=docs`);
  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 15_000 });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("button:has-text('Download scaffold')").click(),
  ]);

  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Download path is null");
  const buffer = await fs.readFile(downloadPath);
  const zip = await JSZip.loadAsync(buffer);
  const scaffoldFile = zip.file("scaffold.json");
  if (!scaffoldFile) throw new Error("scaffold.json not found in downloaded zip");
  const scaffoldJson = JSON.parse(await scaffoldFile.async("string")) as { appType: string };
  expect(scaffoldJson.appType).toBe("docs");
});

test("URL carries a composition hash after the initial brand load", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=landing`);
  await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({ timeout: 15_000 });

  await expect(page).toHaveURL(/#composition=/);
});

test("page reload restores brand handle, app-type, and composition together from URL", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=docs`);
  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 15_000 });

  await page.locator("#section-toc").click();
  await expect(page.locator("#section-toc")).not.toBeChecked();

  const urlWithState = page.url();
  expect(urlWithState).toMatch(/brand=fixture%3Astripe/);
  expect(urlWithState).toMatch(/app=docs/);
  expect(urlWithState).toMatch(/#composition=/);

  await page.goto(urlWithState);

  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#section-toc")).not.toBeChecked();
});

test("switching app-type replaces composition with the new template default sections", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=landing`);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#section-hero")).toBeVisible();

  await page.locator("select.sfc-select").nth(1).selectOption("docs");

  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 8_000 });
  await expect(page.locator("#section-article")).toBeVisible();
  await expect(page.locator("#section-hero")).not.toBeVisible();

  await expect(page).toHaveURL(/app=docs/);
});

test("composition section state persists when the brand handle changes", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=landing`);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });

  await page.locator("#section-hero").click();
  await expect(page.locator("#section-hero")).not.toBeChecked();

  await page.locator("select.sfc-select").first().selectOption("vercel");

  await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({ timeout: 15_000 });
  await expect(page.locator("#section-hero")).not.toBeChecked();
});

test("selecting a fixture from the dropdown loads the brand without the Load button", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=fixture%3Astripe&app=landing`);
  await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({ timeout: 15_000 });

  await page.locator("select.sfc-select").first().selectOption("vercel");

  await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({ timeout: 15_000 });
  await expect(page).toHaveURL(/brand=fixture%3Avercel/);
});

test("unrecognised brand handle prefix surfaces an error message in the panel", async ({ page }) => {
  await page.goto(`${baseUrl}/?brand=bad%3Ahandle&app=landing`);

  await expect(page.getByText(/Unknown prefix/)).toBeVisible({ timeout: 10_000 });
});
