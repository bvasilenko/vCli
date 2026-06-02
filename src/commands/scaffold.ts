// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import path from "node:path";
import fs from "fs-extra";
import { DefaultBrandSourceAdapter } from "@booga/vbrand/adapters";
import { getTemplate, isTemplateId, TEMPLATE_IDS } from "@booga/vbrand/templates";
import type { VbrandType } from "@booga/vbrand";
import type { CompositionSpec } from "@booga/vbrand/composition";
import { parseBrandHandle } from "../brand/handle.js";
import { loadBrand } from "../brand/load.js";
import { copyTemplate } from "../template/index.js";
import { saveConfig, VcliConfigSchema, type VcliConfig } from "../config.js";
import { installAll } from "../utils/pkg.js";
import { log, spinner } from "../utils/log.js";
import { fail } from "../utils/exit.js";

export type AppType = (typeof TEMPLATE_IDS)[number];

export interface ScaffoldOptions {
  brand: string;
  app?: string;
  packageManager?: string;
  cwd?: string;
  noInstall?: boolean;
}

function resolveTargetDir(name: string | undefined, base: string): string {
  return name ? path.resolve(base, name) : base;
}

async function guardEmptyTarget(targetDir: string): Promise<void> {
  if (await fs.pathExists(targetDir)) {
    const entries = await fs.readdir(targetDir);
    if (entries.length > 0) {
      fail(
        `Directory "${targetDir}" is not empty. Run in an empty directory or supply a new project name.`
      );
    }
  }
}

function resolveAppType(raw: string | undefined): AppType {
  const appType = raw ?? "landing";
  if (!isTemplateId(appType)) {
    fail(
      `Unknown app type "${appType}". Available: ${TEMPLATE_IDS.join(", ")}.`
    );
  }
  return appType;
}

async function writeBrandJson(
  targetDir: string,
  brand: VbrandType
): Promise<void> {
  await fs.writeJson(path.join(targetDir, "brand.json"), brand, { spaces: 2 });
}

async function writeCompositionJson(
  targetDir: string,
  composition: CompositionSpec
): Promise<void> {
  await fs.writeJson(path.join(targetDir, "composition.json"), composition, {
    spaces: 2,
  });
}

async function writeScaffoldJson(
  targetDir: string,
  appType: AppType
): Promise<void> {
  await fs.writeJson(
    path.join(targetDir, "scaffold.json"),
    { appType },
    { spaces: 2 }
  );
}

export async function runScaffold(
  name: string | undefined,
  opts: ScaffoldOptions
): Promise<void> {
  const base = opts.cwd ?? process.cwd();
  const targetDir = resolveTargetDir(name, base);

  await guardEmptyTarget(targetDir);
  await fs.ensureDir(targetDir);

  const handle = parseBrandHandle(opts.brand);
  const appType = resolveAppType(opts.app);

  const spin = spinner("Loading brand");
  const adapter = new DefaultBrandSourceAdapter();
  const brand = await loadBrand(handle, adapter);
  spin.succeed("Brand loaded");

  const template = getTemplate(appType);
  const composition = template.defaultComposition();

  const scaffoldSpin = spinner("Scaffolding project");
  await copyTemplate(targetDir, "scaffold");
  await writeBrandJson(targetDir, brand);
  await writeCompositionJson(targetDir, composition);
  await writeScaffoldJson(targetDir, appType);
  scaffoldSpin.succeed("Scaffolded");

  const pm = (opts.packageManager ?? "bun") as VcliConfig["packageManager"];
  const config = VcliConfigSchema.parse({ packageManager: pm });
  await saveConfig(targetDir, config);

  if (!opts.noInstall) {
    log.info("Installing dependencies");
    await installAll(pm, targetDir);
  }

  log.success(
    `Ready. Run: cd ${name ?? "."} && ${pm} run dev`
  );
}
