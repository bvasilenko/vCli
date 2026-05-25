// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { assertPreconditions, ShapeError } from "../scripts/history-shape/validate.ts";
import { TEMP_BRANCH, LICENSE_FILENAME } from "../scripts/history-shape/config.ts";

function git(args: string, cwd: string): void {
  execSync(`git ${args}`, {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

async function initValidRepo(dir: string): Promise<void> {
  git("init -b main", dir);
  git("config user.email test@test.invalid", dir);
  git("config user.name 'Test'", dir);
  await fs.writeFile(path.join(dir, LICENSE_FILENAME), "MIT\n", "utf8");
  await fs.writeFile(path.join(dir, "src.ts"), "export {};\n", "utf8");
  git("add -A", dir);
  git("commit -m 'init'", dir);
}

describe("assertPreconditions", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-validate-"));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  describe("git repository check", () => {
    it("throws ShapeError when called outside a git repository", async () => {
      await expect(assertPreconditions(dir)).rejects.toBeInstanceOf(ShapeError);
    });

    it("error message identifies the non-repo path", async () => {
      await expect(assertPreconditions(dir)).rejects.toThrow(
        "Not a git repository",
      );
    });
  });

  describe("ongoing git operation checks", () => {
    it("throws ShapeError when MERGE_HEAD is present", async () => {
      await initValidRepo(dir);
      const gitDir = path.join(dir, ".git");
      await fs.writeFile(path.join(gitDir, "MERGE_HEAD"), "abc\n", "utf8");
      await expect(assertPreconditions(dir)).rejects.toBeInstanceOf(ShapeError);
    });

    it("error message names the blocking indicator for MERGE_HEAD", async () => {
      await initValidRepo(dir);
      await fs.writeFile(path.join(dir, ".git", "MERGE_HEAD"), "abc\n", "utf8");
      await expect(assertPreconditions(dir)).rejects.toThrow("MERGE_HEAD");
    });

    it("throws ShapeError when CHERRY_PICK_HEAD is present", async () => {
      await initValidRepo(dir);
      await fs.writeFile(
        path.join(dir, ".git", "CHERRY_PICK_HEAD"),
        "abc\n",
        "utf8",
      );
      await expect(assertPreconditions(dir)).rejects.toBeInstanceOf(ShapeError);
    });

    it("throws ShapeError when rebase-merge directory is present", async () => {
      await initValidRepo(dir);
      await fs.ensureDir(path.join(dir, ".git", "rebase-merge"));
      await expect(assertPreconditions(dir)).rejects.toBeInstanceOf(ShapeError);
    });

    it("throws ShapeError when rebase-apply directory is present", async () => {
      await initValidRepo(dir);
      await fs.ensureDir(path.join(dir, ".git", "rebase-apply"));
      await expect(assertPreconditions(dir)).rejects.toBeInstanceOf(ShapeError);
    });
  });

  describe("LICENSE presence check", () => {
    it("throws ShapeError when LICENSE file is absent", async () => {
      await initValidRepo(dir);
      await fs.remove(path.join(dir, LICENSE_FILENAME));
      await expect(assertPreconditions(dir)).rejects.toBeInstanceOf(ShapeError);
    });

    it("error message mentions LICENSE", async () => {
      await initValidRepo(dir);
      await fs.remove(path.join(dir, LICENSE_FILENAME));
      await expect(assertPreconditions(dir)).rejects.toThrow(LICENSE_FILENAME);
    });
  });

  describe("temp branch absence check", () => {
    it("throws ShapeError when the temp branch already exists", async () => {
      await initValidRepo(dir);
      git(`branch ${TEMP_BRANCH}`, dir);
      await expect(assertPreconditions(dir)).rejects.toBeInstanceOf(ShapeError);
    });

    it("error message names the conflicting branch", async () => {
      await initValidRepo(dir);
      git(`branch ${TEMP_BRANCH}`, dir);
      await expect(assertPreconditions(dir)).rejects.toThrow(TEMP_BRANCH);
    });
  });

  describe("all conditions met", () => {
    it("resolves without throwing when the repo is clean and ready", async () => {
      await initValidRepo(dir);
      await expect(assertPreconditions(dir)).resolves.toBeUndefined();
    });
  });
});
