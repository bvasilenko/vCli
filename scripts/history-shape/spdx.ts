// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SPDX_HEADER_LINES } from "./config.ts";

const SPDX_BLOCK = SPDX_HEADER_LINES.join("\n") + "\n";

function withSpdxStripped(content: string): string {
  return content.startsWith(SPDX_BLOCK)
    ? content.slice(SPDX_BLOCK.length)
    : content;
}

function withSpdxPrepended(content: string): string {
  return content.startsWith(SPDX_BLOCK) ? content : SPDX_BLOCK + content;
}

async function transformFile(
  absolutePath: string,
  transform: (content: string) => string,
): Promise<boolean> {
  const original = await readFile(absolutePath, "utf8");
  const transformed = transform(original);
  if (transformed === original) return false;
  await writeFile(absolutePath, transformed, "utf8");
  return true;
}

export async function stripSpdxFromAll(
  repoRoot: string,
  relativeFiles: readonly string[],
): Promise<number> {
  let count = 0;
  for (const relative of relativeFiles) {
    if (await transformFile(path.join(repoRoot, relative), withSpdxStripped)) {
      count++;
    }
  }
  return count;
}

export async function addSpdxToAll(
  repoRoot: string,
  relativeFiles: readonly string[],
): Promise<number> {
  let count = 0;
  for (const relative of relativeFiles) {
    if (await transformFile(path.join(repoRoot, relative), withSpdxPrepended)) {
      count++;
    }
  }
  return count;
}
