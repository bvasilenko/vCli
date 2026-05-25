// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
export { VcliConfigSchema, loadConfig, saveConfig } from "./config.js";
export type { VcliConfig } from "./config.js";

export { fetchRegistry } from "./registry/fetch.js";
export type { FetchOptions } from "./registry/fetch.js";

export {
  listEntries,
  findEntry,
  filterByCategory,
  resolveTransitiveDeps,
} from "./registry/source.js";
export type { RegistryEntry, Registry } from "./registry/source.js";

export { runInit } from "./commands/init.js";
export type { InitOptions } from "./commands/init.js";

export { runAdd } from "./commands/add.js";
export type { AddOptions } from "./commands/add.js";

export { runList } from "./commands/list.js";
export type { ListOptions } from "./commands/list.js";

export { runBuild } from "./commands/build.js";
export type { BuildOptions } from "./commands/build.js";

export { runCheck } from "./commands/check.js";
export type { CheckOptions } from "./commands/check.js";

export { VcliError, fail } from "./utils/exit.js";
