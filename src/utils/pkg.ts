// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { execa } from "execa";
import type { VcliConfig } from "../config.js";

type PackageManager = VcliConfig["packageManager"];

const ADD_ARGS: Record<PackageManager, readonly string[]> = {
  bun: ["add"],
  pnpm: ["add"],
  npm: ["install"],
  yarn: ["add"],
};

const INSTALL_ARGS: Record<PackageManager, readonly string[]> = {
  bun: ["install"],
  pnpm: ["install"],
  npm: ["install"],
  yarn: ["install"],
};

export async function installPackages(
  packages: string[],
  pm: PackageManager,
  cwd: string
): Promise<void> {
  if (packages.length === 0) return;
  await execa(pm, [...ADD_ARGS[pm], ...packages], { cwd, stdio: "inherit" });
}

export async function installAll(
  pm: PackageManager,
  cwd: string
): Promise<void> {
  await execa(pm, [...INSTALL_ARGS[pm]], { cwd, stdio: "inherit" });
}
