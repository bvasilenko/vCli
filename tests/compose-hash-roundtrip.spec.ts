// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import type { Page } from "@playwright/test";
import fs from "fs-extra";
import { serveDir } from "./_helpers/static-server.js";

const COMPOSE_DIST_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../compose-dist"
);

type SectionState = { id: string; visible: boolean; density: string; order: number };
type CompositionHash = { sections: SectionState[] };

const STUB_BRAND = {
  name: "Test",
  voice: { canonical: "t", repoDescription: "Test brand" },
  assets: {
    favicon: { source: "f.svg", sizes: [32] },
    og: { dimensions: [1200, 630] },
    icons: { source: "i.svg", set: [] },
  },
  tokens: { color: {}, type: {} },
};

const SERVER_COMPOSITION: CompositionHash = {
  sections: [
    { id: "hero", visible: true, density: "regular", order: 0 },
    { id: "features", visible: true, density: "regular", order: 1 },
  ],
};

const HASH_COMPOSITION: CompositionHash = {
  sections: [
    { id: "hero", visible: false, density: "regular", order: 0 },
    { id: "features", visible: true, density: "regular", order: 1 },
  ],
};

const MIXED_COMPOSITION: CompositionHash = {
  sections: [
    { id: "hero", visible: false, density: "regular", order: 0 },
    { id: "features", visible: false, density: "regular", order: 1 },
  ],
};

const EMPTY_COMPOSITION: CompositionHash = { sections: [] };

function specToHash(spec: CompositionHash): string {
  const encoded = Buffer.from(JSON.stringify(spec)).toString("base64");
  return `#composition=${encoded}`;
}

function decodeHash(url: string): CompositionHash {
  const hash = new URL(url).hash;
  const encoded = new URLSearchParams(hash.slice(1)).get("composition");
  if (!encoded) throw new Error(`No #composition in URL: ${url}`);
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8")) as CompositionHash;
}

async function setupApiMocks(page: Page, serverComposition: unknown): Promise<void> {
  await page.route("**/brand", (route) => route.fulfill({ json: STUB_BRAND }));
  await page.route("**/composition", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 200, body: "" });
    }
    return route.fulfill({ json: serverComposition });
  });
}

let serverInstance: Server;
let baseUrl: string;

test.beforeAll(async () => {
  if (!(await fs.pathExists(path.join(COMPOSE_DIST_DIR, "index.html")))) {
    throw new Error(
      "compose-dist/index.html not found. Run: bun run build"
    );
  }
  const handle = serveDir(COMPOSE_DIST_DIR);
  serverInstance = handle.server;
  baseUrl = handle.url;
});

test.afterAll(() => {
  serverInstance?.close();
});

test("hash composition takes priority over server composition", async ({ page }) => {
  await setupApiMocks(page, SERVER_COMPOSITION);
  await page.goto(baseUrl + specToHash(HASH_COMPOSITION));
  await expect(page.locator("aside")).toBeVisible();

  await expect(page.locator("#section-hero")).not.toBeChecked();
  await expect(page.locator("#section-features")).toBeChecked();
});

test("absent hash falls back to server composition", async ({ page }) => {
  await setupApiMocks(page, SERVER_COMPOSITION);
  await page.goto(baseUrl);
  await expect(page.locator("aside")).toBeVisible();

  await expect(page.locator("#section-hero")).toBeChecked();
  await expect(page.locator("#section-features")).toBeChecked();
});

test("toggling a section writes the updated composition into the URL hash", async ({ page }) => {
  await setupApiMocks(page, SERVER_COMPOSITION);
  await page.goto(baseUrl);
  await expect(page.locator("aside")).toBeVisible();

  await page.locator("#section-hero").click();

  await expect(page).toHaveURL(/#composition=/);

  const decoded = decodeHash(page.url());
  const hero = decoded.sections.find((s) => s.id === "hero");
  const features = decoded.sections.find((s) => s.id === "features");
  expect(hero?.visible).toBe(false);
  expect(features?.visible).toBe(true);
});

test("toggling a hidden section back to visible updates the URL hash", async ({ page }) => {
  await setupApiMocks(page, SERVER_COMPOSITION);
  await page.goto(baseUrl + specToHash(HASH_COMPOSITION));
  await expect(page.locator("aside")).toBeVisible();
  await expect(page.locator("#section-hero")).not.toBeChecked();

  await page.locator("#section-hero").click();

  await expect(page).toHaveURL(/#composition=/);

  const decoded = decodeHash(page.url());
  const hero = decoded.sections.find((s) => s.id === "hero");
  const features = decoded.sections.find((s) => s.id === "features");
  expect(hero?.visible).toBe(true);
  expect(features?.visible).toBe(true);
});

test("URL hash encodes all section states simultaneously", async ({ page }) => {
  await setupApiMocks(page, SERVER_COMPOSITION);
  await page.goto(baseUrl + specToHash(MIXED_COMPOSITION));
  await expect(page.locator("aside")).toBeVisible();

  await expect(page.locator("#section-hero")).not.toBeChecked();
  await expect(page.locator("#section-features")).not.toBeChecked();

  const decoded = decodeHash(page.url());
  const hero = decoded.sections.find((s) => s.id === "hero");
  const features = decoded.sections.find((s) => s.id === "features");
  expect(hero?.visible).toBe(false);
  expect(features?.visible).toBe(false);
});

test("malformed hash falls back to server composition", async ({ page }) => {
  await setupApiMocks(page, SERVER_COMPOSITION);
  await page.goto(baseUrl + "#composition=!!!not_valid_base64!!!");
  await expect(page.locator("aside")).toBeVisible();

  await expect(page.locator("#section-hero")).toBeChecked();
});

test("empty sections array in hash falls back gracefully to server composition", async ({ page }) => {
  await setupApiMocks(page, SERVER_COMPOSITION);
  await page.goto(baseUrl + specToHash(EMPTY_COMPOSITION));
  await expect(page.locator("aside")).toBeVisible();

  await expect(page.locator("#section-hero")).toBeChecked();
  await expect(page.locator("#section-features")).toBeChecked();
});

test("valid base64 of non-JSON content falls back to server composition", async ({ page }) => {
  await setupApiMocks(page, SERVER_COMPOSITION);
  const validBase64OfNonJson = Buffer.from("not-json{{{broken").toString("base64");
  await page.goto(baseUrl + `#composition=${validBase64OfNonJson}`);
  await expect(page.locator("aside")).toBeVisible();

  await expect(page.locator("#section-hero")).toBeChecked();
});

test("body element uses system-ui font family regardless of page state", async ({ page }) => {
  await setupApiMocks(page, SERVER_COMPOSITION);
  await page.goto(baseUrl);

  await expect(page.locator("body")).toHaveCSS("font-family", /system-ui/);
});
