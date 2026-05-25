// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import path from "node:path";
import fs from "fs-extra";
import { saveConfig, VcliConfigSchema, type VcliConfig } from "../config.js";
import { copyTemplate } from "../template/index.js";
import { installAll } from "../utils/pkg.js";
import { log, spinner } from "../utils/log.js";
import { fail } from "../utils/exit.js";

export interface InitOptions {
  packageManager?: string;
  cwd?: string;
}

export async function runInit(
  name: string | undefined,
  opts: InitOptions = {}
): Promise<void> {
  const base = opts.cwd ?? process.cwd();
  const targetDir = name ? path.resolve(base, name) : base;

  if (await fs.pathExists(targetDir)) {
    const entries = await fs.readdir(targetDir);
    if (entries.length > 0) {
      fail(
        `Directory "${targetDir}" is not empty. Run in an empty directory.`
      );
    }
  }

  await fs.ensureDir(targetDir);

  const spin = spinner("Scaffolding project");
  await copyTemplate(targetDir);
  spin.succeed("Scaffolded");

  const pm = (opts.packageManager ?? "bun") as VcliConfig["packageManager"];
  const config = VcliConfigSchema.parse({ packageManager: pm });
  await saveConfig(targetDir, config);

  log.info("Installing dependencies");
  await installAll(pm, targetDir);
  log.success(`Ready. Run: cd ${name ?? "."} && ${pm} run dev`);
}
