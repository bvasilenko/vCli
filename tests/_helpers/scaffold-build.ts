// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { execa } from "execa";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

export const TEMPLATE_ROOT = path.join(REPO_ROOT, "src", "template");
export const DEMO_NODE_MODULES = path.join(REPO_ROOT, "demo", "node_modules");
export const VITE_BIN = path.join(DEMO_NODE_MODULES, ".bin", "vite");

export interface ScaffoldHandle {
  distDir: string;
  cleanup: () => Promise<void>;
}

export function templateSourceDir(templateName: string): string {
  return path.join(TEMPLATE_ROOT, `files-${templateName}`);
}

export function scaffoldNodeModulesLink(scaffoldDir: string): string {
  return path.join(scaffoldDir, "node_modules");
}

export function scaffoldDistDir(scaffoldDir: string): string {
  return path.join(scaffoldDir, "dist");
}

export async function scaffoldAndBuild(templateName: string): Promise<ScaffoldHandle> {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `vcli-render-${templateName}-`)
  );

  await fs.copy(templateSourceDir(templateName), tmpDir);
  await fs.symlink(DEMO_NODE_MODULES, scaffoldNodeModulesLink(tmpDir));
  await execa(VITE_BIN, ["build"], { cwd: tmpDir });

  return {
    distDir: scaffoldDistDir(tmpDir),
    cleanup: () => fs.remove(tmpDir),
  };
}
