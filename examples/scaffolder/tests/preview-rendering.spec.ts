import { expect, test } from "./scaffolder-fixtures.js";
import {
  FIXTURE_BRAND_NAMES,
  FIXTURE_PRIMARY_COLORS,
  openPreviewFrame,
  readCssVar,
  readPreviewBrandLogoAsset,
  readPreviewPrimaryColor,
  readUtilityResolution,
} from "./scaffolder-test-utils.js";

for (const fixture of Object.keys(FIXTURE_PRIMARY_COLORS)) {
  test(`${fixture} preview applies theme tokens, utility CSS, and safe brand assets inside the iframe`, async ({
    baseUrl,
    page,
  }) => {
    const fixtureName = fixture as keyof typeof FIXTURE_PRIMARY_COLORS;
    const frame = await openPreviewFrame(page, baseUrl, fixtureName);
    const expectedColor = FIXTURE_PRIMARY_COLORS[fixtureName];
    const utility = await readUtilityResolution(frame);
    const asset = await readPreviewBrandLogoAsset(frame, fixtureName);

    expect(await readPreviewPrimaryColor(frame)).toBe(expectedColor);
    expect(await readPreviewPrimaryColor(frame)).not.toBe("#6366f1");
    expect(await readCssVar(frame, "html", "--v-color-primary")).not.toBe("");
    expect(await readCssVar(frame, "section", "--v-color-primary")).not.toBe("");

    expect(utility.styleSheetCount).toBeGreaterThanOrEqual(1);
    expect(utility.paddingClassName).toMatch(/\b(p|px|py|pt|pr|pb|pl)-/);
    expect(utility.padding).not.toBe("0px");
    expect(utility.backgroundClassName).toMatch(/\bbg-[^\s]+/);
    expect(utility.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(utility.backgroundColor).not.toBe("transparent");

    expect(asset.alt).toBe(`${FIXTURE_BRAND_NAMES[fixtureName]} logo`);
    expect(asset.base).toBeTruthy();
    expect(asset.width).toBeGreaterThan(16);
    expect(asset.height).toBeGreaterThan(16);
    expect(asset.resolved).toMatch(/^data:image\/svg\+xml,/);
    if (asset.naturalWidth !== null) {
      expect(asset.naturalWidth).toBeGreaterThan(0);
      expect(asset.naturalHeight).toBeGreaterThan(0);
    }
  });
}
