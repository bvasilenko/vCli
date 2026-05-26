// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import {
  branchExists,
  commitNow,
  commitWithDate,
  createOrphanBranch,
  currentBranch,
  deleteBranch,
  renameBranch,
  stageAll,
} from "../scripts/history-shape/git.ts";

function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function tryGit(args: string, cwd: string): string | null {
  try {
    return git(args, cwd);
  } catch {
    return null;
  }
}

async function initRepo(dir: string): Promise<void> {
  git("init -b main", dir);
  git("config user.email test@test.invalid", dir);
  git("config user.name 'Test'", dir);
}

async function seedCommit(dir: string, filename = "seed.txt"): Promise<void> {
  await fs.writeFile(path.join(dir, filename), "seed\n", "utf8");
  git("add -A", dir);
  git("commit -m 'seed'", dir);
}

describe("branchExists", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-git-"));
    await initRepo(repo);
    await seedCommit(repo);
  });

  afterEach(async () => {
    await fs.remove(repo);
  });

  it("returns true for a branch that exists", () => {
    expect(branchExists(repo, "main")).toBe(true);
  });

  it("returns false for a branch that does not exist", () => {
    expect(branchExists(repo, "no-such-branch")).toBe(false);
  });

  it("does not match a partial branch name", () => {
    expect(branchExists(repo, "mai")).toBe(false);
  });
});

describe("currentBranch", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-git-"));
    await initRepo(repo);
    await seedCommit(repo);
  });

  afterEach(async () => {
    await fs.remove(repo);
  });

  it("returns the name of the active branch", () => {
    expect(currentBranch(repo)).toBe("main");
  });
});

describe("createOrphanBranch", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-git-"));
    await initRepo(repo);
    await seedCommit(repo);
  });

  afterEach(async () => {
    await fs.remove(repo);
  });

  it("switches HEAD to the new orphan branch name", () => {
    createOrphanBranch(repo, "orphan-test");
    expect(currentBranch(repo)).toBe("orphan-test");
  });

  it("the orphan branch has no commits — git rev-list returns nothing", () => {
    createOrphanBranch(repo, "orphan-test");
    const result = tryGit("rev-list HEAD", repo);
    expect(result).toBeNull();
  });

  it("working tree files are still present after orphan creation", async () => {
    createOrphanBranch(repo, "orphan-test");
    expect(await fs.pathExists(path.join(repo, "seed.txt"))).toBe(true);
  });

  it("staged index carries over all files from the parent HEAD commit", () => {
    createOrphanBranch(repo, "orphan-test");
    const staged = git("diff --cached --name-only", repo);
    expect(staged).toContain("seed.txt");
  });
});

describe("stageAll", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-git-"));
    await initRepo(repo);
    await seedCommit(repo);
  });

  afterEach(async () => {
    await fs.remove(repo);
  });

  it("newly added file appears in the staged index after stageAll", async () => {
    await fs.writeFile(path.join(repo, "new.ts"), "export {};\n", "utf8");
    stageAll(repo);
    const staged = git("diff --cached --name-only", repo);
    expect(staged).toContain("new.ts");
  });

  it("modified tracked file appears staged after stageAll", async () => {
    await fs.writeFile(path.join(repo, "seed.txt"), "modified\n", "utf8");
    stageAll(repo);
    const staged = git("diff --cached --name-only", repo);
    expect(staged).toContain("seed.txt");
  });

  it("deleted tracked file appears staged as a removal", async () => {
    await fs.remove(path.join(repo, "seed.txt"));
    stageAll(repo);
    const status = git("diff --cached --name-status", repo);
    expect(status).toMatch(/^D\tseed\.txt$/m);
  });
});

describe("commitWithDate", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-git-"));
    await initRepo(repo);
    await seedCommit(repo);
    createOrphanBranch(repo, "test-orphan");
  });

  afterEach(async () => {
    await fs.remove(repo);
  });

  it("creates exactly one commit on the orphan branch", async () => {
    await fs.writeFile(path.join(repo, "a.ts"), "a\n", "utf8");
    stageAll(repo);
    commitWithDate(repo, "test commit", "2017-04-10T00:00:00+03:00");
    const log = git("rev-list HEAD", repo);
    expect(log.split("\n")).toHaveLength(1);
  });

  it("records the specified ISO date as the author date", async () => {
    const isoDate = "2017-04-10T00:00:00+03:00";
    await fs.writeFile(path.join(repo, "a.ts"), "a\n", "utf8");
    stageAll(repo);
    commitWithDate(repo, "dated", isoDate);
    const authorDate = git("log -1 --format=%aI", repo);
    expect(authorDate).toContain("2017-04-10");
  });

  it("records the specified ISO date as the committer date", async () => {
    const isoDate = "2017-04-10T00:00:00+03:00";
    await fs.writeFile(path.join(repo, "a.ts"), "a\n", "utf8");
    stageAll(repo);
    commitWithDate(repo, "dated", isoDate);
    const committerDate = git("log -1 --format=%cI", repo);
    expect(committerDate).toContain("2017-04-10");
  });

  it("stores the exact commit message", async () => {
    const message = "multi-line\n\nbody paragraph";
    await fs.writeFile(path.join(repo, "a.ts"), "a\n", "utf8");
    stageAll(repo);
    commitWithDate(repo, message, "2017-04-10T00:00:00+03:00");
    const stored = git("log -1 --format=%B", repo).trim();
    expect(stored).toBe(message);
  });
});

describe("commitNow", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-git-"));
    await initRepo(repo);
    await seedCommit(repo);
    createOrphanBranch(repo, "test-orphan");
  });

  afterEach(async () => {
    await fs.remove(repo);
  });

  it("creates a commit", async () => {
    await fs.writeFile(path.join(repo, "b.ts"), "b\n", "utf8");
    stageAll(repo);
    commitNow(repo, "now commit");
    expect(tryGit("rev-list HEAD", repo)).not.toBeNull();
  });

  it("stores the exact commit message", async () => {
    await fs.writeFile(path.join(repo, "b.ts"), "b\n", "utf8");
    stageAll(repo);
    commitNow(repo, "exact message");
    const stored = git("log -1 --format=%B", repo).trim();
    expect(stored).toBe("exact message");
  });

  it("author date is not in the past (within 60 seconds of now)", async () => {
    await fs.writeFile(path.join(repo, "b.ts"), "b\n", "utf8");
    stageAll(repo);
    const before = Date.now();
    commitNow(repo, "now commit");
    const authorDateStr = git("log -1 --format=%aI", repo);
    const authorDate = new Date(authorDateStr).getTime();
    expect(authorDate).toBeGreaterThanOrEqual(before - 1000);
  });

  it("committer date is also current (within 60 seconds of now)", async () => {
    await fs.writeFile(path.join(repo, "b.ts"), "b\n", "utf8");
    stageAll(repo);
    const before = Date.now();
    commitNow(repo, "now commit");
    const committerDateStr = git("log -1 --format=%cI", repo);
    const committerDate = new Date(committerDateStr).getTime();
    expect(committerDate).toBeGreaterThanOrEqual(before - 1000);
  });

  it("stores a multi-line message with subject and body", async () => {
    const message = "subject line\n\nbody paragraph";
    await fs.writeFile(path.join(repo, "b.ts"), "b\n", "utf8");
    stageAll(repo);
    commitNow(repo, message);
    const stored = git("log -1 --format=%B", repo).trim();
    expect(stored).toBe(message);
  });
});

describe("deleteBranch", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-git-"));
    await initRepo(repo);
    await seedCommit(repo);
    git("branch to-delete", repo);
    createOrphanBranch(repo, "safe-branch");
    await fs.writeFile(path.join(repo, "x.ts"), "x\n", "utf8");
    stageAll(repo);
    commitNow(repo, "safe commit");
  });

  afterEach(async () => {
    await fs.remove(repo);
  });

  it("the deleted branch no longer exists after the call", () => {
    deleteBranch(repo, "to-delete");
    expect(branchExists(repo, "to-delete")).toBe(false);
  });

  it("other branches are not affected by the deletion", () => {
    deleteBranch(repo, "to-delete");
    expect(branchExists(repo, "safe-branch")).toBe(true);
  });
});

describe("renameBranch", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-git-"));
    await initRepo(repo);
    await seedCommit(repo);
    createOrphanBranch(repo, "old-name");
    await fs.writeFile(path.join(repo, "y.ts"), "y\n", "utf8");
    stageAll(repo);
    commitNow(repo, "orphan commit");
  });

  afterEach(async () => {
    await fs.remove(repo);
  });

  it("the new name exists after rename", () => {
    renameBranch(repo, "old-name", "new-name");
    expect(branchExists(repo, "new-name")).toBe(true);
  });

  it("the old name is absent after rename", () => {
    renameBranch(repo, "old-name", "new-name");
    expect(branchExists(repo, "old-name")).toBe(false);
  });

  it("currentBranch reports the new name when renamed while checked out", () => {
    renameBranch(repo, "old-name", "new-name");
    expect(currentBranch(repo)).toBe("new-name");
  });

  it("HEAD commit SHA is unchanged after rename", () => {
    const shaBefore = git("rev-parse HEAD", repo);
    renameBranch(repo, "old-name", "new-name");
    expect(git("rev-parse HEAD", repo)).toBe(shaBefore);
  });
});

describe("commitNow — successive invocations across independent repos", () => {
  it("all N invocations complete and each repo has exactly one commit", async () => {
    const N = 8;
    const dirs = await Promise.all(
      Array.from({ length: N }, async (_, i) => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-successive-"));
        await initRepo(dir);
        await fs.writeFile(path.join(dir, `f${i}.ts`), "x\n", "utf8");
        git("add -A", dir);
        return dir;
      }),
    );
    try {
      for (const dir of dirs) {
        commitNow(dir, "successive");
      }
      for (const dir of dirs) {
        expect(git("rev-list --count HEAD", dir)).toBe("1");
      }
    } finally {
      await Promise.all(dirs.map((dir) => fs.remove(dir)));
    }
  });
});

describe("commitWithDate — successive invocations across independent repos", () => {
  it("all N invocations complete and each repo has exactly one commit", async () => {
    const N = 8;
    const isoDate = "2017-04-10T00:00:00+03:00";
    const dirs = await Promise.all(
      Array.from({ length: N }, async (_, i) => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-successive-"));
        await initRepo(dir);
        await fs.writeFile(path.join(dir, `f${i}.ts`), "x\n", "utf8");
        git("add -A", dir);
        return dir;
      }),
    );
    try {
      for (const dir of dirs) {
        commitWithDate(dir, "successive", isoDate);
      }
      for (const dir of dirs) {
        expect(git("rev-list --count HEAD", dir)).toBe("1");
      }
    } finally {
      await Promise.all(dirs.map((dir) => fs.remove(dir)));
    }
  });
});
