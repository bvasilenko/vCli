// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  AUTHORED_EXTENSIONS,
  EXCLUDED_DIRNAMES,
  EXCLUDED_PATH_PREFIXES,
  SPDX_HEADER_LINES,
} from "./config.ts";

function isExcludedByDirname(relative: string): boolean {
  return relative.split("/").some((part) => EXCLUDED_DIRNAMES.has(part));
}

function isExcludedByPrefix(relative: string): boolean {
  return EXCLUDED_PATH_PREFIXES.some((prefix) => relative.startsWith(prefix));
}

function isExcluded(relative: string): boolean {
  return isExcludedByDirname(relative) || isExcludedByPrefix(relative);
}

function isAuthoredExtension(filename: string): boolean {
  const ext = path.extname(filename);
  return AUTHORED_EXTENSIONS.has(ext);
}

async function* walkAuthoredFiles(
  dir: string,
  repoRoot: string,
): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(repoRoot, absolute).replace(/\\/g, "/");
    if (isExcluded(relative)) continue;
    if (entry.isDirectory()) {
      yield* walkAuthoredFiles(absolute, repoRoot);
    } else if (entry.isFile() && isAuthoredExtension(entry.name)) {
      yield relative;
    }
  }
}

async function fileHasSpdxHeader(absolutePath: string): Promise<boolean> {
  let content: string;
  try {
    content = await readFile(absolutePath, "utf8");
  } catch {
    return false;
  }
  const lines = content.split("\n");
  return (
    lines[0]?.trimEnd() === SPDX_HEADER_LINES[0] &&
    lines[1]?.trimEnd() === SPDX_HEADER_LINES[1]
  );
}

export async function findAuthoredSourceFiles(
  repoRoot: string,
): Promise<string[]> {
  const files: string[] = [];
  for await (const relative of walkAuthoredFiles(repoRoot, repoRoot)) {
    files.push(relative);
  }
  return files;
}

export async function findSpdxBearingFiles(repoRoot: string): Promise<string[]> {
  const authored = await findAuthoredSourceFiles(repoRoot);
  const results: string[] = [];
  for (const relative of authored) {
    const absolute = path.join(repoRoot, relative);
    if (await fileHasSpdxHeader(absolute)) {
      results.push(relative);
    }
  }
  return results;
}
