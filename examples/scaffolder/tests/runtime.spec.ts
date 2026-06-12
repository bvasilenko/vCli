// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { expect, test } from "./scaffolder-fixtures.js";
import {
  downloadScaffoldArchive,
  openScaffolder,
  previewFrame,
  readCanonicalPackageJson,
  readZipJson,
  scaffolderUrl,
  type PackageJsonContract,
  type ScaffoldMetadataContract,
} from "./scaffolder-test-utils.js";

test("composition editor panel mounts with section toggles", async ({
  baseUrl,
  page,
}) => {
  await openScaffolder(page, baseUrl);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });

  await expect(page.getByText("Sections", { exact: true })).toBeVisible();
  const checkboxes = page.locator("aside input[type='checkbox']");
  await expect(checkboxes.first()).toBeVisible();
  expect(await checkboxes.count()).toBeGreaterThanOrEqual(1);
});

test("preview panel contains rendered template content", async ({ baseUrl, page }) => {
  await openScaffolder(page, baseUrl);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });

  await expect(page.getByText("Preview", { exact: true })).toBeVisible();
  const frame = previewFrame(page);
  await expect(
    frame.getByRole("heading", { name: "Stripe", exact: true })
  ).toBeVisible({ timeout: 5_000 });
});

test("download button is enabled after brand loads", async ({ baseUrl, page }) => {
  await openScaffolder(page, baseUrl);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });

  const downloadBtn = page.locator("button:has-text('Download scaffold')");
  await expect(downloadBtn).toBeVisible();
  await expect(downloadBtn).toBeEnabled();
});

test("download button produces a non-empty zip file", async ({ baseUrl, page }) => {
  await openScaffolder(page, baseUrl);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });

  const zip = await downloadScaffoldArchive(page);
  expect(Object.keys(zip.files).length).toBeGreaterThan(0);
});

test("docs app-type renders docs-template section checkboxes in the composition editor", async ({
  baseUrl,
  page,
}) => {
  await page.goto(scaffolderUrl(baseUrl, "stripe", "docs"));
  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#section-article")).toBeVisible();
  await expect(page.locator("#section-toc")).toBeVisible();
});

test("?app=<type> query parameter restores the app-type sections on page reload", async ({
  baseUrl,
  page,
}) => {
  await page.goto(scaffolderUrl(baseUrl, "stripe", "docs"));
  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 15_000 });

  await page.reload();

  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#section-article")).toBeVisible();
});

test("download zip scaffold.json.appType matches the selected app type", async ({
  baseUrl,
  page,
}) => {
  await page.goto(scaffolderUrl(baseUrl, "stripe", "docs"));
  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 15_000 });

  const zip = await downloadScaffoldArchive(page);
  const canonicalPackage = await readCanonicalPackageJson();
  const packageJson = await readZipJson<PackageJsonContract>(zip, "package.json");
  const scaffoldJson = await readZipJson<ScaffoldMetadataContract>(
    zip,
    "scaffold.json"
  );
  expect(scaffoldJson.appType).toBe("docs");
  expect(packageJson.dependencies).toEqual(canonicalPackage.dependencies);
  expect(scaffoldJson.dependencies).toEqual(canonicalPackage.dependencies);
});

test("URL carries a composition hash after the initial brand load", async ({
  baseUrl,
  page,
}) => {
  await page.goto(scaffolderUrl(baseUrl, "stripe", "landing"));
  await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({
    timeout: 15_000,
  });

  await expect(page).toHaveURL(/#composition=/);
});

test("page reload restores brand handle, app-type, and composition together from URL", async ({
  baseUrl,
  page,
}) => {
  await page.goto(scaffolderUrl(baseUrl, "stripe", "docs"));
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

test("switching app-type replaces composition with the new template default sections", async ({
  baseUrl,
  page,
}) => {
  await openScaffolder(page, baseUrl);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#section-hero")).toBeVisible();

  await page.locator("select.sfc-select").nth(1).selectOption("docs");

  await expect(page.locator("#section-sidebar")).toBeVisible({ timeout: 8_000 });
  await expect(page.locator("#section-article")).toBeVisible();
  await expect(page.locator("#section-hero")).not.toBeVisible();

  await expect(page).toHaveURL(/app=docs/);
});

test("composition section state persists when the brand handle changes", async ({
  baseUrl,
  page,
}) => {
  await openScaffolder(page, baseUrl);
  await expect(page.locator("aside")).toBeVisible({ timeout: 15_000 });

  await page.locator("#section-hero").click();
  await expect(page.locator("#section-hero")).not.toBeChecked();

  await page.locator("select.sfc-select").first().selectOption("vercel");

  await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({
    timeout: 15_000,
  });
  await expect(page.locator("#section-hero")).not.toBeChecked();
});

test("selecting a fixture from the dropdown loads the brand without the Load button", async ({
  baseUrl,
  page,
}) => {
  await page.goto(scaffolderUrl(baseUrl, "stripe", "landing"));
  await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({
    timeout: 15_000,
  });

  await page.locator("select.sfc-select").first().selectOption("vercel");

  await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({
    timeout: 15_000,
  });
  await expect(page).toHaveURL(/brand=fixture%3Avercel/);
});

test("unrecognised brand handle prefix surfaces an error message in the panel", async ({
  baseUrl,
  page,
}) => {
  await page.goto(`${baseUrl}/?brand=bad%3Ahandle&app=landing`);

  await expect(page.getByText(/Unknown prefix/)).toBeVisible({ timeout: 10_000 });
});
