import { expect, test } from "./scaffolder-fixtures.js";
import {
  APP_TYPES,
  CANONICAL_TEMPLATE_FILES,
  downloadScaffoldArchive,
  readCanonicalPackageJson,
  readCanonicalTemplateFile,
  readRootPackageVersion,
  type PackageJsonContract,
  readZipJson,
  readZipText,
  scaffolderUrl,
  type ScaffoldMetadataContract,
} from "./scaffolder-test-utils.js";

test("downloaded scaffold mirrors the canonical CLI scaffold template files", async ({
  baseUrl,
  page,
}) => {
  await page.goto(scaffolderUrl(baseUrl, "stripe", "landing"));
  await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({
    timeout: 15_000,
  });

  const zip = await downloadScaffoldArchive(page);

  for (const filePath of CANONICAL_TEMPLATE_FILES) {
    expect(await readZipText(zip, filePath)).toBe(
      await readCanonicalTemplateFile(filePath)
    );
  }
});

test("downloaded scaffold metadata stays synchronized across every app type", async ({
  baseUrl,
  page,
}) => {
  const version = await readRootPackageVersion();
  const canonicalPackage = await readCanonicalPackageJson();

  for (const appType of APP_TYPES) {
    await page.goto(scaffolderUrl(baseUrl, "stripe", appType));
    await expect(page.locator("button:has-text('Download scaffold')")).toBeEnabled({
      timeout: 15_000,
    });

    const zip = await downloadScaffoldArchive(page);
    const scaffold = await readZipJson<ScaffoldMetadataContract>(zip, "scaffold.json");
    const packageJson = await readZipJson<PackageJsonContract>(zip, "package.json");

    expect(scaffold.appType).toBe(appType);
    expect(scaffold.generatedBy).toEqual({ package: "@booga/vcli", version });
    expect(scaffold.dependencies).toEqual(canonicalPackage.dependencies);
    expect(packageJson.dependencies).toEqual(canonicalPackage.dependencies);
  }
});
