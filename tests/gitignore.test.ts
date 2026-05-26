// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GITIGNORE_PATH = path.join(ROOT, ".gitignore");

function parsePatterns(content: string): string[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

function patternCovers(pattern: string, filePath: string): boolean {
  const isDir = pattern.endsWith("/");
  const core = isDir ? pattern.slice(0, -1) : pattern;
  const isAnchored = core.includes("/");
  const basename = filePath.split("/").pop() ?? "";

  if (isDir) {
    if (isAnchored) {
      return filePath.startsWith(core + "/");
    }
    return (
      filePath.startsWith(core + "/") ||
      filePath.includes("/" + core + "/")
    );
  }

  if (core.includes("*")) {
    const reStr = core
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, "[^/]*");
    if (isAnchored) {
      return new RegExp(`^${reStr}(/.*)?$`).test(filePath);
    }
    return new RegExp(`^${reStr}$`).test(basename);
  }

  if (isAnchored) {
    return filePath === core || filePath.startsWith(core + "/");
  }
  return filePath === core || basename === core;
}

function covered(patterns: string[], relPath: string): boolean {
  return patterns.some((p) => patternCovers(p, relPath.replace(/\\/g, "/")));
}

let patterns: string[];

beforeAll(async () => {
  const content = await fs.readFile(GITIGNORE_PATH, "utf-8");
  patterns = parsePatterns(content);
});

describe(".gitignore — structure", () => {
  it("file exists at repository root", async () => {
    expect(await fs.pathExists(GITIGNORE_PATH)).toBe(true);
  });

  it("contains at least one non-empty, non-comment pattern", () => {
    expect(patterns.length).toBeGreaterThan(0);
  });

  it("contains no duplicate patterns", () => {
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it("no pattern is an empty string after trimming", () => {
    expect(patterns.every((p) => p.length > 0)).toBe(true);
  });
});

describe(".gitignore — build and distribution artifacts", () => {
  it("ignores files inside root dist/", () => {
    expect(covered(patterns, "dist/cli.js")).toBe(true);
  });

  it("ignores files inside root out/", () => {
    expect(covered(patterns, "out/index.html")).toBe(true);
  });

  it("ignores files inside anchored demo/out/", () => {
    expect(covered(patterns, "demo/out/index.html")).toBe(true);
  });

  it("ignores TypeScript incremental build-info files at root", () => {
    expect(covered(patterns, "tsconfig.tsbuildinfo")).toBe(true);
  });

  it("ignores TypeScript build-info files with arbitrary base name", () => {
    expect(covered(patterns, "tsconfig.app.tsbuildinfo")).toBe(true);
  });

  it("does not ignore an unrelated .json file at root", () => {
    expect(covered(patterns, "package.json")).toBe(false);
  });
});

describe(".gitignore — dependency directories", () => {
  it("ignores files inside root node_modules/", () => {
    expect(covered(patterns, "node_modules/react/index.js")).toBe(true);
  });

  it("ignores deeply nested files inside root node_modules/", () => {
    expect(covered(patterns, "node_modules/@scope/pkg/dist/index.js")).toBe(
      true
    );
  });

  it("ignores files inside anchored demo/node_modules/", () => {
    expect(covered(patterns, "demo/node_modules/vite/index.js")).toBe(true);
  });

  it("does not confuse a source file named 'node_modules.ts' as a dependency", () => {
    expect(covered(patterns, "src/node_modules.ts")).toBe(false);
  });
});

describe(".gitignore — secrets and environment files", () => {
  it("ignores .env at root", () => {
    expect(covered(patterns, ".env")).toBe(true);
  });

  it("ignores .env.local at root", () => {
    expect(covered(patterns, ".env.local")).toBe(true);
  });

  it("does not ignore .env.example (safe template conventionally committed)", () => {
    expect(covered(patterns, ".env.example")).toBe(false);
  });
});

describe(".gitignore — CI and pipeline artifacts", () => {
  it("ignores test coverage output directory", () => {
    expect(covered(patterns, "coverage/lcov.info")).toBe(true);
  });

  it("ignores vmdx cache directory", () => {
    expect(covered(patterns, ".vmdx-cache/hash.json")).toBe(true);
  });

  it("ignores playwright test-results directory", () => {
    expect(covered(patterns, "test-results/trace.zip")).toBe(true);
  });

  it("ignores agent transcript files", () => {
    expect(covered(patterns, "transcripts/run-001.log")).toBe(true);
  });

  it("ignores contribot state files with a short infix", () => {
    expect(covered(patterns, "contribot.state.abc.json")).toBe(true);
  });

  it("ignores contribot state files with a date-stamp infix", () => {
    expect(covered(patterns, "contribot.state.2026-05-26.json")).toBe(true);
  });

  it("ignores contribot state files with a long infix", () => {
    expect(
      covered(patterns, "contribot.state.cycle-15-main-branch.json")
    ).toBe(true);
  });

  it("does not ignore contribot files that lack the state infix", () => {
    expect(covered(patterns, "contribot.config.json")).toBe(false);
  });
});

describe(".gitignore — transient probe and debug artifacts", () => {
  it("ignores .playwright-cli/ directory", () => {
    expect(covered(patterns, ".playwright-cli/console-2026.log")).toBe(true);
  });

  it("ignores log files inside .playwright-cli/", () => {
    expect(
      covered(patterns, ".playwright-cli/console-2026-05-25T19-56-36-844Z.log")
    ).toBe(true);
  });

  it("ignores yml snapshot files inside .playwright-cli/", () => {
    expect(
      covered(patterns, ".playwright-cli/page-2026-05-25T19-56-37-035Z.yml")
    ).toBe(true);
  });

  it("ignores png screenshot files inside .playwright-cli/", () => {
    expect(
      covered(patterns, ".playwright-cli/page-2026-05-25T21-01-58-178Z.png")
    ).toBe(true);
  });

  it("does not ignore a similarly-named directory that is not .playwright-cli/", () => {
    expect(covered(patterns, ".playwright-cli-backup/trace.yml")).toBe(false);
  });

  it("does not ignore a file named .playwright-cli (non-directory) at root", () => {
    expect(covered(patterns, ".playwright-cli")).toBe(false);
  });
});

describe(".gitignore — non-canonical subpackage lockfiles", () => {
  it("ignores demo/package-lock.json (npm lockfile under bun toolchain)", () => {
    expect(covered(patterns, "demo/package-lock.json")).toBe(true);
  });

  it("does not ignore demo/bun.lock (canonical lockfile)", () => {
    expect(covered(patterns, "demo/bun.lock")).toBe(false);
  });

  it("does not ignore root-level package-lock.json (pattern is anchored to demo/)", () => {
    expect(covered(patterns, "package-lock.json")).toBe(false);
  });

  it("does not ignore a package-lock.json in an unrelated subdir", () => {
    expect(covered(patterns, "packages/other/package-lock.json")).toBe(false);
  });
});
