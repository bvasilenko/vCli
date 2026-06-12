import { describe, expect, test } from "vitest";
import {
  HOSTED_APP_TYPES,
  HOSTED_CHECKS,
  HOSTED_FIXTURES,
  assertHostedChecks,
  bugVerdict,
  cleanVerdict,
  failedCheckNames,
  hostedProbeCases,
  hostedProbeLabel,
  hostedScaffolderUrl,
  isEntrypoint,
  isLocatorVisible,
  requiredHostedCheckFailures,
} from "../scripts/web-qa-execute.mjs";

const COMPLETE_HOSTED_CHECKS = Object.fromEntries(
  HOSTED_CHECKS.map((checkName) => [checkName, true])
);

describe("web-QA verdict helpers", () => {
  test.each([
    {
      localSpecs: ["local-a.spec.ts", "local-b.spec.ts"],
      hostedProbeCount: HOSTED_FIXTURES.length * HOSTED_APP_TYPES.length,
      coveredSurfaces: 2,
      expected: "CLEAN: 22 probes, 0 bugs, 2/2 surfaces covered\n",
    },
    {
      localSpecs: [],
      hostedProbeCount: 1,
      coveredSurfaces: ["hosted scaffolder"],
      expected: "CLEAN: 1 probes, 0 bugs, 1/1 surfaces covered\n",
    },
  ])(
    "formats clean verdicts for numeric and named surface coverage",
    ({ localSpecs, hostedProbeCount, coveredSurfaces, expected }) => {
      expect(cleanVerdict(localSpecs, hostedProbeCount, coveredSurfaces)).toBe(
        expected
      );
    }
  );

  test.each([
    [new Error("hosted URL returned 404"), "BUGS: hosted URL returned 404\n"],
    ["network offline", "BUGS: network offline\n"],
  ])("formats arbitrary thrown values as bug verdicts", (input, expected) => {
    expect(bugVerdict(input)).toBe(expected);
  });
});

describe("hosted probe matrix", () => {
  test("generates one hosted probe per fixture and app-type pair", () => {
    expect(hostedProbeCases(["stripe", "vercel"], ["landing", "docs"])).toEqual([
      { fixture: "stripe", appType: "landing", brandName: "Stripe" },
      { fixture: "stripe", appType: "docs", brandName: "Stripe" },
      { fixture: "vercel", appType: "landing", brandName: "Vercel" },
      { fixture: "vercel", appType: "docs", brandName: "Vercel" },
    ]);
  });

  test("default matrix covers every configured fixture and app-type exactly once", () => {
    const probes = hostedProbeCases();
    const labels = probes.map(hostedProbeLabel);

    expect(probes).toHaveLength(HOSTED_FIXTURES.length * HOSTED_APP_TYPES.length);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toEqual(
      HOSTED_FIXTURES.flatMap((fixture) =>
        HOSTED_APP_TYPES.map((appType) => `${fixture}/${appType}`)
      )
    );
  });

  test("falls back to the fixture handle when no display name is registered", () => {
    expect(hostedProbeCases(["custom-brand"], ["landing"])).toEqual([
      {
        fixture: "custom-brand",
        appType: "landing",
        brandName: "custom-brand",
      },
    ]);
  });

  test("labels hosted probe failures with fixture and app-type", () => {
    expect(
      hostedProbeLabel({ fixture: "stripe", appType: "docs", brandName: "Stripe" })
    ).toBe("stripe/docs");
  });
});

describe("hosted scaffolder URL generation", () => {
  test.each([
    [
      "https://example.com/vCli/",
      undefined,
      "https://example.com/vCli/?brand=fixture%3Astripe&app=landing",
    ],
    [
      "https://example.com/vCli/?brand=fixture%3Avercel&app=docs&preserve=1",
      { fixture: "linear", appType: "dashboard", brandName: "Linear" },
      "https://example.com/vCli/?brand=fixture%3Alinear&app=dashboard&preserve=1",
    ],
    [
      "https://example.com/vCli/?brand=fixture%3Astripe&app=landing#composition=abc",
      { fixture: "github", appType: "marketing", brandName: "GitHub" },
      "https://example.com/vCli/?brand=fixture%3Agithub&app=marketing#composition=abc",
    ],
  ])(
    "normalizes hosted probe state while preserving unrelated URL state",
    (input, probe, expected) => {
      expect(hostedScaffolderUrl(input, probe)).toBe(expected);
    }
  );
});

describe("hosted surface check aggregation", () => {
  test("reports only observed false checks for generic diagnostics", () => {
    expect(
      failedCheckNames({
        brandSource: true,
        composition: false,
        preview: false,
        downloadEnabled: true,
      })
    ).toEqual(["composition", "preview"]);
  });

  test("reports all missing required checks in contract order", () => {
    expect(requiredHostedCheckFailures({})).toEqual(HOSTED_CHECKS);
  });

  test("reports missing required checks as hosted contract failures", () => {
    expect(
      requiredHostedCheckFailures({
        brandSource: true,
        composition: true,
        preview: true,
        downloadEnabled: true,
      })
    ).toEqual(["brandPreview"]);
  });

  test.each([
    [
      { ...COMPLETE_HOSTED_CHECKS, composition: false },
      "hosted checks failed: composition",
    ],
    [
      { brandSource: true, composition: true, preview: true, downloadEnabled: true },
      "hosted checks failed: brandPreview",
    ],
  ])("throws one generalized error for failed hosted contracts", (checks, error) => {
    expect(() => assertHostedChecks(checks)).toThrow(error);
  });

  test("includes the hosted probe label in scoped contract failures", () => {
    expect(() =>
      assertHostedChecks(
        { ...COMPLETE_HOSTED_CHECKS, preview: false },
        { fixture: "notion", appType: "dashboard", brandName: "Notion" }
      )
    ).toThrow("hosted checks failed for notion/dashboard: preview");
  });

  test("accepts all hosted checks when every required behavior is visible", () => {
    expect(() => assertHostedChecks(COMPLETE_HOSTED_CHECKS)).not.toThrow();
  });
});

describe("locator visibility guard", () => {
  test.each([
    [{ isVisible: async () => true }, true],
    [{ isVisible: async () => false }, false],
    [
      {
        isVisible: async () => {
          throw new Error("detached");
        },
      },
      false,
    ],
  ])("normalizes visible, hidden, and unavailable locators", async (locator, expected) => {
    await expect(isLocatorVisible(locator)).resolves.toBe(expected);
  });
});

describe("script entrypoint detection", () => {
  test.each([
    ["file:///tmp/web-qa-execute.mjs", "/tmp/web-qa-execute.mjs", true],
    ["file:///tmp/web-qa-execute.mjs", "/tmp/vitest-worker.mjs", false],
  ])("compares the module URL to the executed file path", (moduleUrl, argvPath, expected) => {
    expect(isEntrypoint(moduleUrl, argvPath)).toBe(expected);
  });
});
