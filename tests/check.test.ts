import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/utils/log.js", () => ({
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
  spinner: vi.fn(() => ({ succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() })),
}));

vi.mock("@booga/vlint", () => ({
  lintGlob: vi.fn(),
  lint: vi.fn(),
}));

import { runCheck } from "../src/commands/check.js";
import { VcliError } from "../src/utils/exit.js";

const noIssues = [{ file: "src/App.tsx", diagnostics: [] }];

const withErrors = [
  {
    file: "src/App.tsx",
    diagnostics: [
      {
        file: "src/App.tsx",
        line: 5,
        column: 2,
        ruleId: "no-raw-classname",
        message: "raw className not allowed",
        severity: "error" as const,
      },
    ],
  },
];

const withWarnings = [
  {
    file: "src/App.tsx",
    diagnostics: [
      {
        file: "src/App.tsx",
        line: 3,
        column: 0,
        ruleId: "some-rule",
        message: "advisory",
        severity: "warn" as const,
      },
    ],
  },
];

describe("check command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves cleanly when there are no diagnostics", async () => {
    const { lintGlob } = await import("@booga/vlint");
    vi.mocked(lintGlob).mockResolvedValue(noIssues as never);
    await expect(runCheck({})).resolves.toBeUndefined();
  });

  it("throws VcliError with exit code 1 when errors are present", async () => {
    const { lintGlob } = await import("@booga/vlint");
    vi.mocked(lintGlob).mockResolvedValue(withErrors as never);
    await expect(runCheck({})).rejects.toBeInstanceOf(VcliError);
  });

  it("resolves (does not throw) when only warnings are present", async () => {
    const { lintGlob } = await import("@booga/vlint");
    vi.mocked(lintGlob).mockResolvedValue(withWarnings as never);
    await expect(runCheck({})).resolves.toBeUndefined();
  });

  it("passes an absolute glob pattern to lintGlob", async () => {
    const { lintGlob } = await import("@booga/vlint");
    vi.mocked(lintGlob).mockResolvedValue(noIssues as never);
    await runCheck({ cwd: "/some/project" });
    expect(vi.mocked(lintGlob)).toHaveBeenCalledWith(
      expect.stringContaining("/some/project")
    );
  });

  it("resolves when lintGlob returns an empty result set (no source files)", async () => {
    const { lintGlob } = await import("@booga/vlint");
    vi.mocked(lintGlob).mockResolvedValue([] as never);
    await expect(runCheck({})).resolves.toBeUndefined();
  });

  it("throws when errors appear across multiple files", async () => {
    const { lintGlob } = await import("@booga/vlint");
    const multiFileErrors = [
      {
        file: "src/A.tsx",
        diagnostics: [
          { file: "src/A.tsx", line: 1, column: 0, ruleId: "rule-a", message: "err a", severity: "error" as const },
        ],
      },
      {
        file: "src/B.tsx",
        diagnostics: [
          { file: "src/B.tsx", line: 2, column: 0, ruleId: "rule-b", message: "err b", severity: "error" as const },
        ],
      },
    ];
    vi.mocked(lintGlob).mockResolvedValue(multiFileErrors as never);
    await expect(runCheck({})).rejects.toBeInstanceOf(VcliError);
  });

  it("resolves when files have only warnings across multiple files", async () => {
    const { lintGlob } = await import("@booga/vlint");
    const multiFileWarnings = [
      { file: "src/A.tsx", diagnostics: [{ file: "src/A.tsx", line: 1, column: 0, ruleId: "r", message: "w", severity: "warn" as const }] },
      { file: "src/B.tsx", diagnostics: [{ file: "src/B.tsx", line: 2, column: 0, ruleId: "r", message: "w", severity: "warn" as const }] },
    ];
    vi.mocked(lintGlob).mockResolvedValue(multiFileWarnings as never);
    await expect(runCheck({})).resolves.toBeUndefined();
  });
});
