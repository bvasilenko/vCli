import path from "node:path";
import fs from "fs-extra";
import type { Registry, RegistryEntry } from "@booga/vregistry";
import { loadConfig } from "../config.js";
import { fetchRegistry } from "../registry/fetch.js";
import { findEntry, resolveTransitiveDeps } from "../registry/source.js";
import { installPackages } from "../utils/pkg.js";
import { log, spinner } from "../utils/log.js";
import { fail } from "../utils/exit.js";

export interface AddOptions {
  force?: boolean;
  offline?: boolean;
  cwd?: string;
}

function buildReexportStub(exportName: string, pkg: string): string {
  return `export { ${exportName} } from '${pkg}';\n`;
}

function collectPackageDeps(entry: RegistryEntry, registry: Registry): string[] {
  const source = entry.source as { package: string };
  const componentIds = new Set(registry.entries.map((e) => e.id));
  const pkgDeps = (entry.dependencies ?? []).filter((d) => !componentIds.has(d));
  return [...new Set([source.package, ...pkgDeps])];
}

export async function runAdd(
  componentIds: string[],
  opts: AddOptions = {}
): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const config = await loadConfig(cwd);
  const registry = await fetchRegistry(config, { offline: opts.offline });

  for (const id of componentIds) {
    if (!findEntry(registry, id)) {
      fail(`Component "${id}" not found in registry.`);
    }
  }

  const entries = resolveTransitiveDeps(registry, componentIds);
  const allPackages = new Set<string>();
  const spin = spinner(`Resolving ${componentIds.join(", ")}`);

  for (const entry of entries) {
    const source = entry.source as { package: string; exportName: string };
    const targetDir = path.join(cwd, config.componentsDir);
    await fs.ensureDir(targetDir);

    const targetFile = path.join(targetDir, `${source.exportName}.tsx`);

    if ((await fs.pathExists(targetFile)) && !opts.force) {
      spin.fail();
      fail(`"${source.exportName}.tsx" already exists. Use --force to overwrite.`);
    }

    await fs.writeFile(
      targetFile,
      buildReexportStub(source.exportName, source.package)
    );

    for (const pkg of collectPackageDeps(entry, registry)) {
      allPackages.add(pkg);
    }
  }

  spin.succeed(`Added: ${componentIds.join(", ")}`);

  if (allPackages.size > 0) {
    log.info(`Installing ${[...allPackages].sort().join(", ")}`);
    await installPackages([...allPackages].sort(), config.packageManager, cwd);
  }
}
