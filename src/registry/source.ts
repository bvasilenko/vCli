import type { Registry, RegistryEntry } from "@booga/vregistry";

export type { Registry, RegistryEntry };

export function listEntries(registry: Registry): RegistryEntry[] {
  return [...registry.entries];
}

export function findEntry(
  registry: Registry,
  id: string
): RegistryEntry | undefined {
  return registry.entries.find((e) => e.id === id);
}

export function filterByCategory(
  registry: Registry,
  category: string
): RegistryEntry[] {
  return registry.entries.filter((e) => e.category === category);
}

export function resolveTransitiveDeps(
  registry: Registry,
  componentIds: string[]
): RegistryEntry[] {
  const resolved = new Map<string, RegistryEntry>();
  const queue = [...componentIds];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (resolved.has(id)) continue;

    const entry = registry.entries.find((e) => e.id === id);
    if (!entry) continue;

    resolved.set(id, entry);

    for (const dep of entry.dependencies ?? []) {
      if (!resolved.has(dep) && registry.entries.some((e) => e.id === dep)) {
        queue.push(dep);
      }
    }
  }

  return [...resolved.values()];
}
