// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

type ExecEnv = Record<string, string>;

function run(
  args: string[],
  cwd: string,
  extraEnv: ExecEnv = {},
): string {
  return execSync(["git", ...args].join(" "), {
    cwd,
    env: { ...process.env, ...extraEnv } as NodeJS.ProcessEnv,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  }).trim();
}

function uniqueTempPath(): string {
  return path.join(tmpdir(), `git-msg-${randomBytes(8).toString("hex")}.txt`);
}

function withTempMessageFile<T>(
  message: string,
  fn: (filePath: string) => T,
): T {
  const filePath = uniqueTempPath();
  writeFileSync(filePath, message, "utf8");
  try {
    return fn(filePath);
  } finally {
    try {
      unlinkSync(filePath);
    } catch (e) {
      // ENOENT: OS tmp-cleanup removed the file before the finally block ran.
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
}

export function currentBranch(repoRoot: string): string {
  return run(["symbolic-ref", "--short", "HEAD"], repoRoot);
}

export function branchExists(repoRoot: string, name: string): boolean {
  return run(["branch", "--list", name], repoRoot) !== "";
}

export function createOrphanBranch(repoRoot: string, name: string): void {
  run(["checkout", "--orphan", name], repoRoot);
}

export function stageAll(repoRoot: string): void {
  run(["add", "-A"], repoRoot);
}

export function commitWithDate(
  repoRoot: string,
  message: string,
  isoDate: string,
): void {
  withTempMessageFile(message, (filePath) => {
    run(["commit", "-F", filePath], repoRoot, {
      GIT_AUTHOR_DATE: isoDate,
      GIT_COMMITTER_DATE: isoDate,
    });
  });
}

export function commitNow(repoRoot: string, message: string): void {
  withTempMessageFile(message, (filePath) => {
    run(["commit", "-F", filePath], repoRoot);
  });
}

export function deleteBranch(repoRoot: string, name: string): void {
  run(["branch", "-D", name], repoRoot);
}

export function renameBranch(
  repoRoot: string,
  from: string,
  to: string,
): void {
  run(["branch", "-m", from, to], repoRoot);
}
