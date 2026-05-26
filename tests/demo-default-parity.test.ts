// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { glob } from "glob";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Only the src/ subtree is the canonical shared source.
// Config files (package.json, vite.config, lockfiles) are intentionally
// different between the demo workspace and the scaffolded user project.
const TEMPLATE_SRC_DIR = path.join(ROOT, "src/template/files-default/src");
const DEMO_SRC_DIR = path.join(ROOT, "demo/src");

async function collectRelativePaths(dir: string): Promise<string[]> {
  const matches = await glob("**/*", { cwd: dir, nodir: true, dot: true });
  return matches.sort();
}

describe("demo/src and default template src — single source of truth", () => {
  let templateFiles: string[];
  let demoFiles: string[];

  beforeAll(async () => {
    templateFiles = await collectRelativePaths(TEMPLATE_SRC_DIR);
    demoFiles = await collectRelativePaths(DEMO_SRC_DIR);
  });

  it("template src directory contains at least one tracked file (glob is not vacuously passing)", () => {
    expect(templateFiles.length).toBeGreaterThan(0);
  });

  it("demo/src directory contains at least one tracked file (glob is not vacuously passing)", () => {
    expect(demoFiles.length).toBeGreaterThan(0);
  });

  it("both directories contain exactly the same set of filenames", () => {
    expect(demoFiles).toEqual(templateFiles);
  });

  it("every shared file is byte-identical between template src and demo/src", async () => {
    // Intersect to avoid ENOENT when file sets diverge — the set-equality test
    // above is the authoritative signal for set mismatches.
    const shared = templateFiles.filter((rel) => demoFiles.includes(rel));
    const mismatches: string[] = [];

    for (const rel of shared) {
      const templateContent = await fs.readFile(path.join(TEMPLATE_SRC_DIR, rel));
      const demoContent = await fs.readFile(path.join(DEMO_SRC_DIR, rel));
      if (!templateContent.equals(demoContent)) {
        mismatches.push(rel);
      }
    }

    expect(
      mismatches,
      `Content diverged for: ${mismatches.join(", ")}`
    ).toEqual([]);
  });
});
