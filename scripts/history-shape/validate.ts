
import { access } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { LICENSE_FILENAME, TEMP_BRANCH } from "./config.ts";

export class ShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShapeError";
  }
}

function tryExec(cmd: string, cwd: string): string | null {
  try {
    return execSync(cmd, {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function assertIsGitRepo(repoRoot: string): Promise<void> {
  if (!tryExec("git rev-parse --git-dir", repoRoot)) {
    throw new ShapeError(`Not a git repository: ${repoRoot}`);
  }
}

async function assertNoOngoingGitOperation(repoRoot: string): Promise<void> {
  const gitDir = tryExec("git rev-parse --git-dir", repoRoot);
  if (!gitDir) return;

  const absoluteGitDir = path.isAbsolute(gitDir)
    ? gitDir
    : path.join(repoRoot, gitDir);

  const blockers = [
    "MERGE_HEAD",
    "CHERRY_PICK_HEAD",
    "REBASE_HEAD",
    "rebase-merge",
    "rebase-apply",
  ];

  for (const indicator of blockers) {
    if (await pathExists(path.join(absoluteGitDir, indicator))) {
      throw new ShapeError(
        `Ongoing git operation (${indicator}). Abort it before reshaping history.`,
      );
    }
  }
}

async function assertLicensePresent(repoRoot: string): Promise<void> {
  if (!(await pathExists(path.join(repoRoot, LICENSE_FILENAME)))) {
    throw new ShapeError(
      `${LICENSE_FILENAME} not found in ${repoRoot}. Commit B cannot be formed.`,
    );
  }
}

async function assertTempBranchAbsent(repoRoot: string): Promise<void> {
  const existing = tryExec(`git branch --list ${TEMP_BRANCH}`, repoRoot);
  if (existing) {
    throw new ShapeError(
      `Branch '${TEMP_BRANCH}' already exists. Delete it (git branch -D ${TEMP_BRANCH}) and retry.`,
    );
  }
}

export async function assertPreconditions(repoRoot: string): Promise<void> {
  await assertIsGitRepo(repoRoot);
  await assertNoOngoingGitOperation(repoRoot);
  await assertLicensePresent(repoRoot);
  await assertTempBranchAbsent(repoRoot);
}
