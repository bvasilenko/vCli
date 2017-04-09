import { registry as localRegistry, type Registry } from "@booga/vregistry";
import type { VcliConfig } from "../config.js";
import { readCache, writeCache } from "./cache.js";
import { fetchFromUrl } from "./http.js";

export interface FetchOptions {
  offline?: boolean;
}

export async function fetchRegistry(
  config: VcliConfig,
  opts: FetchOptions = {}
): Promise<Registry> {
  if (opts.offline) return localRegistry;

  const cached = await readCache(config.registry);
  if (cached) return cached;

  try {
    const fresh = await fetchFromUrl(config.registry);
    await writeCache(config.registry, fresh);
    return fresh;
  } catch {
    return localRegistry;
  }
}
