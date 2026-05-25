// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs-extra";

// Resolved at runtime from the bundled dist/cli.js → dist/template/
const TEMPLATE_DIR = path.resolve(
  fileURLToPath(new URL("./template", import.meta.url))
);

export async function copyTemplate(targetDir: string): Promise<void> {
  await fs.copy(TEMPLATE_DIR, targetDir, { overwrite: false });
}
