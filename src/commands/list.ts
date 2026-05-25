// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import chalk from "chalk";
import { loadConfig } from "../config.js";
import { fetchRegistry } from "../registry/fetch.js";
import { listEntries, filterByCategory, type RegistryEntry } from "../registry/source.js";
import { log } from "../utils/log.js";

export interface ListOptions {
  category?: string;
  offline?: boolean;
  cwd?: string;
}

export async function runList(opts: ListOptions = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const config = await loadConfig(cwd);
  const registry = await fetchRegistry(config, { offline: opts.offline });

  const entries = opts.category
    ? filterByCategory(registry, opts.category)
    : listEntries(registry);

  if (entries.length === 0) {
    log.warn(
      opts.category
        ? `No components in category "${opts.category}".`
        : "Registry is empty."
    );
    return;
  }

  const groups = groupByCategory(entries);

  for (const [category, items] of [...groups.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    console.log(chalk.bold.cyan(`\n${category}`));
    for (const item of items) {
      const desc = item.description ? chalk.dim(` ${item.description}`) : "";
      console.log(`  ${chalk.green(item.id.padEnd(24))}${desc}`);
    }
  }
}

function groupByCategory(
  entries: RegistryEntry[]
): Map<string, RegistryEntry[]> {
  const groups = new Map<string, RegistryEntry[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.category) ?? [];
    bucket.push(entry);
    groups.set(entry.category, bucket);
  }
  for (const [cat, items] of groups) {
    groups.set(
      cat,
      [...items].sort((a, b) => a.id.localeCompare(b.id))
    );
  }
  return groups;
}
