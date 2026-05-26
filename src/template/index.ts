// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs-extra";
import { fail } from "../utils/exit.js";

export const VALID_TEMPLATES = ["default", "vblocks-marketing"] as const;
export type TemplateName = (typeof VALID_TEMPLATES)[number];

function assertValidTemplate(name: string): asserts name is TemplateName {
  if (!VALID_TEMPLATES.includes(name as TemplateName)) {
    fail(
      `Unknown template "${name}". Available: ${VALID_TEMPLATES.join(", ")}`
    );
  }
}

function resolveTemplateDir(name: TemplateName): string {
  const base = path.resolve(
    fileURLToPath(new URL("./templates", import.meta.url))
  );
  return path.join(base, name);
}

export async function copyTemplate(
  targetDir: string,
  template: string = "default"
): Promise<void> {
  assertValidTemplate(template);
  const src = resolveTemplateDir(template);
  await fs.copy(src, targetDir, { overwrite: false });
}
