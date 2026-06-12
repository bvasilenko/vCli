import { expect, test } from "./scaffolder-fixtures.js";
import {
  openPreviewFrame,
  readPreviewSrcDoc,
} from "./scaffolder-test-utils.js";

test("preview renders a complete isolated themed document", async ({
  baseUrl,
  page,
}) => {
  const frame = await openPreviewFrame(page, baseUrl);
  const srcDoc = await readPreviewSrcDoc(page);

  expect(srcDoc).toContain("<!doctype html>");
  expect(srcDoc).toContain("<base href=");
  expect(srcDoc).toContain("<style>");
  expect(srcDoc).toContain("<body>");
  expect(srcDoc).not.toContain("<script");
  await expect(frame.locator("body > *")).not.toHaveCount(0);
});

test("preview iframe is absent when brand content is unavailable", async ({
  baseUrl,
  page,
}) => {
  await page.goto(`${baseUrl}/?brand=bad%3Ahandle&app=landing`);
  await expect(page.getByText(/Unknown prefix/)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('iframe[title="vCli preview"]')).toHaveCount(0);
});
