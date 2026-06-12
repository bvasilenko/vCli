import { expect, test } from "./scaffolder-fixtures.js";
import { openScaffolder } from "./scaffolder-test-utils.js";

test("scaffolder controls expose stable user-facing names", async ({
  baseUrl,
  page,
}) => {
  await openScaffolder(page, baseUrl);

  for (const name of ["Brand fixture", "Brand source handle", "App type"]) {
    await expect(page.getByLabel(name)).toBeVisible();
  }

  for (const name of ["Load brand", "Download scaffold"]) {
    await expect(page.getByRole("button", { name })).toBeVisible();
  }
});
