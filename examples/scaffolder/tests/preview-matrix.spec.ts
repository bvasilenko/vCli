import { expect, test } from "./scaffolder-fixtures.js";
import {
  APP_TYPES,
  FIXTURE_PRIMARY_COLORS,
  openPreviewFrame,
} from "./scaffolder-test-utils.js";
import { collectPageIssues } from "../../../tests/_helpers/page-issues.js";

for (const fixture of Object.keys(FIXTURE_PRIMARY_COLORS)) {
  for (const appType of APP_TYPES) {
    test(`${fixture} ${appType} preview renders inside the iframe without page errors`, async ({
      baseUrl,
      page,
    }) => {
      const collector = collectPageIssues(page);

      const frame = await openPreviewFrame(
        page,
        baseUrl,
        fixture as keyof typeof FIXTURE_PRIMARY_COLORS,
        appType
      );

      await expect(frame.locator("body > *").first()).toBeVisible();
      expect(collector.issues.filter((issue) => issue.kind === "js-error")).toEqual(
        []
      );
    });
  }
}
