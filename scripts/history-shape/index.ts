// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import {
  COMMIT_A_DATE,
  COMMIT_A_MESSAGE,
  COMMIT_B_MESSAGE,
  LICENSE_FILENAME,
  TEMP_BRANCH,
} from "./config.ts";
import { findSpdxBearingFiles } from "./files.ts";
import { addSpdxToAll, stripSpdxFromAll } from "./spdx.ts";
import * as git from "./git.ts";
import { assertPreconditions, ShapeError } from "./validate.ts";

export interface ShapeOptions {
  dryRun?: boolean;
  log?: (message: string) => void;
}

const noop = (): void => {};

function findRepoRoot(): string {
  return execSync("git rev-parse --show-toplevel", {
    encoding: "utf8",
  }).trim();
}

export async function applyHistoryShape(
  repoRoot: string,
  options: ShapeOptions = {},
): Promise<void> {
  const log = options.log ?? noop;
  const dryRun = options.dryRun ?? false;

  log(`Repository: ${repoRoot}`);
  if (dryRun) log("Dry-run mode — git operations will be skipped.");

  await assertPreconditions(repoRoot);

  const spdxFiles = await findSpdxBearingFiles(repoRoot);
  log(`SPDX-bearing files: ${spdxFiles.length}`);

  const licensePath = path.join(repoRoot, LICENSE_FILENAME);
  const licenseContent = readFileSync(licensePath, "utf8");

  if (dryRun) {
    log("Dry run complete — no git operations performed.");
    return;
  }

  const originalBranch = git.currentBranch(repoRoot);
  log(`Original branch: ${originalBranch}`);

  git.createOrphanBranch(repoRoot, TEMP_BRANCH);

  const stripped = await stripSpdxFromAll(repoRoot, spdxFiles);
  log(`Stripped SPDX from ${stripped} files`);

  unlinkSync(licensePath);
  log(`Removed ${LICENSE_FILENAME}`);

  git.stageAll(repoRoot);
  git.commitWithDate(repoRoot, COMMIT_A_MESSAGE, COMMIT_A_DATE);
  log(`Commit A — ${COMMIT_A_DATE}`);

  const restored = await addSpdxToAll(repoRoot, spdxFiles);
  log(`Restored SPDX on ${restored} files`);

  writeFileSync(licensePath, licenseContent, "utf8");
  log(`Restored ${LICENSE_FILENAME}`);

  git.stageAll(repoRoot);
  git.commitNow(repoRoot, COMMIT_B_MESSAGE);
  log("Commit B — today");

  git.deleteBranch(repoRoot, originalBranch);
  git.renameBranch(repoRoot, TEMP_BRANCH, originalBranch);
  log(`Branch '${originalBranch}' reshaped to 2 commits. Authorize force-push when ready.`);
}

async function main(): Promise<void> {
  const repoRoot = findRepoRoot();
  const dryRun = process.argv.includes("--dry-run");
  const log = (msg: string): void => {
    process.stdout.write(`[history-shape] ${msg}\n`);
  };
  await applyHistoryShape(repoRoot, { dryRun, log });
}

if (import.meta.main) {
  main().catch((err: unknown) => {
    const message = err instanceof ShapeError ? err.message : String(err);
    process.stderr.write(`[history-shape] Error: ${message}\n`);
    process.exit(1);
  });
}
