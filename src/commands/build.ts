// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import path from "node:path";
import { generate } from "@booga/vssg";
import { log } from "../utils/log.js";
import { fail } from "../utils/exit.js";

export interface BuildOptions {
  config?: string;
  cwd?: string;
}

const DEFAULT_CONFIG = "vssg.config.js";

// vSsg resolves srcDir/outDir/publicDir against process.cwd(). Pre-resolving
// them against the CLI's cwd makes the command cwd-independent.
function resolveConfigPaths(
  raw: unknown,
  cwd: string
): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null) return {};
  const c = raw as Record<string, unknown>;
  const resolved: Record<string, unknown> = { ...c };
  for (const key of ["srcDir", "outDir", "publicDir"] as const) {
    if (typeof c[key] === "string") {
      resolved[key] = path.resolve(cwd, c[key] as string);
    }
  }
  return resolved;
}

export async function runBuild(opts: BuildOptions = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const configPath = path.resolve(cwd, opts.config ?? DEFAULT_CONFIG);

  let userConfig: unknown;
  try {
    const mod = await import(configPath);
    userConfig = mod.default ?? mod;
  } catch {
    fail(`Config file not found: ${configPath}`);
  }

  log.info(`Building with ${path.relative(cwd, configPath)}`);
  await generate(resolveConfigPaths(userConfig, cwd));
  log.success("Build complete");
}
