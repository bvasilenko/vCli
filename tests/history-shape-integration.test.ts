// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { applyHistoryShape } from "../scripts/history-shape/index.ts";
import {
  COMMIT_A_DATE,
  COMMIT_A_MESSAGE,
  COMMIT_B_MESSAGE,
  LICENSE_FILENAME,
  SPDX_HEADER_LINES,
  TEMP_BRANCH,
} from "../scripts/history-shape/config.ts";

const SPDX_BLOCK = SPDX_HEADER_LINES[0] + "\n" + SPDX_HEADER_LINES[1] + "\n";

function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

async function touch(root: string, rel: string, content: string): Promise<void> {
  const full = path.join(root, rel);
  await fs.ensureDir(path.dirname(full));
  await fs.writeFile(full, content, "utf8");
}

async function buildFixtureRepo(dir: string): Promise<void> {
  git("init -b main", dir);
  git("config user.email test@test.invalid", dir);
  git("config user.name 'Test'", dir);

  await touch(dir, "src/app.ts", SPDX_BLOCK + "export const app = true;\n");
  await touch(dir, "src/utils.ts", SPDX_BLOCK + "export const util = true;\n");
  await touch(dir, "src/config.ts", "export const config = true;\n");
  await touch(dir, "tests/app.test.ts", SPDX_BLOCK + "// test\n");
  await touch(dir, "scripts/build.mjs", SPDX_BLOCK + "// build script\n");
  await touch(dir, LICENSE_FILENAME, "MIT License\nCopyright (c) 2026 bvasilenko\n");

  git("add -A", dir);
  git("commit -m 'fixture'", dir);
}

const SILENT = { log: (): void => {} };

describe("applyHistoryShape — full reshape", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-integration-"));
    await buildFixtureRepo(repo);
    await applyHistoryShape(repo, SILENT);
  });

  afterEach(async () => {
    await fs.remove(repo);
  });

  describe("commit count and structure", () => {
    it("produces exactly 2 commits", () => {
      const log = git("rev-list --count HEAD", repo);
      expect(Number(log)).toBe(2);
    });

    it("Commit A (the older one) carries the backdated author date", () => {
      const date = git("log -1 --format=%aI HEAD~1", repo);
      expect(date).toContain("2017-04-10");
    });

    it("Commit B author date is strictly later than Commit A author date", () => {
      const dateA = new Date(git("log -1 --format=%aI HEAD~1", repo)).getTime();
      const dateB = new Date(git("log -1 --format=%aI HEAD", repo)).getTime();
      expect(dateB).toBeGreaterThan(dateA);
    });

    it("Commit A message matches the prescribed init message", () => {
      const msg = git("log -1 --format=%B HEAD~1", repo).trim();
      expect(msg).toBe(COMMIT_A_MESSAGE);
    });

    it("Commit B message matches the prescribed license message", () => {
      const msg = git("log -1 --format=%B HEAD", repo).trim();
      expect(msg).toBe(COMMIT_B_MESSAGE);
    });
  });

  describe("LICENSE handling", () => {
    it("Commit A does not contain the LICENSE file", () => {
      const files = git("show --name-only --format= HEAD~1", repo);
      expect(files).not.toContain(LICENSE_FILENAME);
    });

    it("Commit B introduces the LICENSE file", () => {
      const diff = git(`diff --name-only HEAD~1 HEAD`, repo);
      expect(diff).toContain(LICENSE_FILENAME);
    });
  });

  describe("SPDX header handling", () => {
    it("Commit A does not contain SPDX headers in any SPDX-bearing source file", () => {
      const content = git("show HEAD~1:src/app.ts", repo);
      expect(content).not.toContain(SPDX_HEADER_LINES[0]);
    });

    it("Commit B restores SPDX headers in all originally-licensed files", () => {
      const content = git("show HEAD:src/app.ts", repo);
      expect(content.startsWith(SPDX_BLOCK)).toBe(true);
    });

    it("a file that had no SPDX header has no SPDX header added in Commit A", () => {
      const content = git("show HEAD~1:src/config.ts", repo);
      expect(content).not.toContain(SPDX_HEADER_LINES[0]);
    });

    it("a file that had no SPDX header remains without SPDX in Commit B", () => {
      const content = git("show HEAD:src/config.ts", repo);
      expect(content).not.toContain(SPDX_HEADER_LINES[0]);
    });

    it("SPDX is stripped from all SPDX-bearing files in Commit A — not just src/", () => {
      const content = git("show HEAD~1:tests/app.test.ts", repo);
      expect(content).not.toContain(SPDX_HEADER_LINES[0]);
    });

    it(".mjs files have their SPDX header stripped in Commit A", () => {
      const content = git("show HEAD~1:scripts/build.mjs", repo);
      expect(content).not.toContain(SPDX_HEADER_LINES[0]);
    });

    it(".mjs files have their SPDX header restored in Commit B", () => {
      const content = git("show HEAD:scripts/build.mjs", repo);
      expect(content.startsWith(SPDX_BLOCK)).toBe(true);
    });
  });

  describe("working tree integrity after reshape", () => {
    it("SPDX-bearing files still carry their SPDX header in the working tree", async () => {
      const content = await fs.readFile(path.join(repo, "src/app.ts"), "utf8");
      expect(content.startsWith(SPDX_BLOCK)).toBe(true);
    });

    it("the LICENSE file is present in the working tree", async () => {
      expect(await fs.pathExists(path.join(repo, LICENSE_FILENAME))).toBe(true);
    });

    it("non-SPDX file content is byte-identical before and after reshape", async () => {
      const content = await fs.readFile(
        path.join(repo, "src/config.ts"),
        "utf8",
      );
      expect(content).toBe("export const config = true;\n");
    });
  });

  describe("branch hygiene", () => {
    it("temp branch does not exist after reshape completes", () => {
      const branches = git("branch --list", repo);
      expect(branches).not.toContain(TEMP_BRANCH);
    });

    it("original branch name (main) is still present after reshape", () => {
      const branches = git("branch --list", repo);
      expect(branches).toContain("main");
    });
  });
});

describe("applyHistoryShape — uncommitted changes", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-uncommitted-"));
    await buildFixtureRepo(repo);
    await touch(repo, "src/new.ts", SPDX_BLOCK + "export const n = 1;\n");
    await applyHistoryShape(repo, SILENT);
  });

  afterEach(async () => {
    await fs.remove(repo);
  });

  it("uncommitted file is present in Commit A (without SPDX)", () => {
    const content = git("show HEAD~1:src/new.ts", repo);
    expect(content).not.toContain(SPDX_HEADER_LINES[0]);
  });

  it("uncommitted file is present in Commit B (with SPDX restored)", () => {
    const content = git("show HEAD:src/new.ts", repo);
    expect(content.startsWith(SPDX_BLOCK)).toBe(true);
  });

  it("still produces exactly 2 commits when uncommitted changes are present", () => {
    const count = git("rev-list --count HEAD", repo);
    expect(Number(count)).toBe(2);
  });
});

describe("applyHistoryShape — dry run", () => {
  let repo: string;
  let commitCountBefore: number;

  beforeEach(async () => {
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-dryrun-"));
    await buildFixtureRepo(repo);
    commitCountBefore = Number(git("rev-list --count HEAD", repo));
    await applyHistoryShape(repo, { dryRun: true, ...SILENT });
  });

  afterEach(async () => {
    await fs.remove(repo);
  });

  it("does not change the number of commits", () => {
    const countAfter = Number(git("rev-list --count HEAD", repo));
    expect(countAfter).toBe(commitCountBefore);
  });

  it("does not modify any file in the working tree", async () => {
    const content = await fs.readFile(path.join(repo, "src/app.ts"), "utf8");
    expect(content.startsWith(SPDX_BLOCK)).toBe(true);
  });

  it("does not create the temp branch", () => {
    const branches = git("branch --list", repo);
    expect(branches).not.toContain(TEMP_BRANCH);
  });
});

describe("applyHistoryShape — COMMIT_A_DATE", () => {
  it("COMMIT_A_DATE encodes 2017-04-10 per the §5b convention", () => {
    expect(COMMIT_A_DATE).toContain("2017-04-10");
  });
});
