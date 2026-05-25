// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect } from "vitest";
import { registry as localRegistry, type Registry, type RegistryEntry } from "@booga/vregistry";
import {
  listEntries,
  findEntry,
  filterByCategory,
  resolveTransitiveDeps,
} from "../src/registry/source.js";

function makeEntry(
  id: string,
  deps: string[] = [],
  pkg = `@p/${id}`
): RegistryEntry {
  return {
    id,
    name: id,
    category: "primitive",
    description: "",
    dependencies: deps,
    source: { package: pkg, importPath: id, exportName: id },
  };
}

function makeRegistry(entries: RegistryEntry[]): Registry {
  return { version: "0.0.0", generatedAt: "1970-01-01T00:00:00.000Z", entries };
}

describe("listEntries", () => {
  it("returns all entries from the registry", () => {
    const result = listEntries(localRegistry);
    expect(result.length).toBe(localRegistry.entries.length);
  });

  it("returns a defensive copy — mutations do not affect subsequent calls", () => {
    const first = listEntries(localRegistry);
    first.splice(0, first.length);
    const second = listEntries(localRegistry);
    expect(second.length).toBe(localRegistry.entries.length);
  });

  it("preserves registry insertion order", () => {
    const a = makeEntry("a");
    const b = makeEntry("b");
    const reg = makeRegistry([a, b]);
    expect(listEntries(reg).map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("returns empty array for an empty registry", () => {
    expect(listEntries(makeRegistry([]))).toHaveLength(0);
  });

  it("returns stable results across multiple calls", () => {
    const calls = Array.from({ length: 3 }, () =>
      listEntries(localRegistry).map((e) => e.id)
    );
    expect(calls[1]).toEqual(calls[0]);
    expect(calls[2]).toEqual(calls[0]);
  });

  it("every real-registry entry id matches the lowercase-hyphenated format", () => {
    for (const entry of listEntries(localRegistry)) {
      expect(entry.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it("every real-registry entry has all required shape fields", () => {
    for (const entry of listEntries(localRegistry)) {
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("category");
      expect(entry).toHaveProperty("source");
      expect(entry).toHaveProperty("dependencies");
    }
  });
});

describe("findEntry", () => {
  it("returns the matching entry for a known id", () => {
    const entry = findEntry(localRegistry, "hero-split");
    expect(entry?.name).toBe("HeroSplit");
  });

  it("returns undefined for an unknown id", () => {
    expect(findEntry(localRegistry, "no-such-component")).toBeUndefined();
  });

  it("is case-sensitive — uppercase id does not match", () => {
    for (const e of localRegistry.entries) {
      expect(findEntry(localRegistry, e.id.toUpperCase())).toBeUndefined();
    }
  });

  it("returns undefined for an empty string id", () => {
    expect(findEntry(localRegistry, "")).toBeUndefined();
  });

  it("returns undefined on an empty registry", () => {
    expect(findEntry(makeRegistry([]), "hero-split")).toBeUndefined();
  });
});

describe("filterByCategory", () => {
  it("returns only entries matching the requested category", () => {
    const blocks = filterByCategory(localRegistry, "block");
    expect(blocks.length).toBeGreaterThan(0);
    for (const entry of blocks) {
      expect(entry.category).toBe("block");
    }
  });

  it("returns empty array for a category with no members", () => {
    expect(filterByCategory(localRegistry, "nonexistent")).toHaveLength(0);
  });

  it("returns all entries when every entry shares the same category", () => {
    const entries = [makeEntry("a"), makeEntry("b"), makeEntry("c")];
    const reg = makeRegistry(entries);
    expect(filterByCategory(reg, "primitive")).toHaveLength(3);
  });

  it("returns empty array on an empty registry", () => {
    expect(filterByCategory(makeRegistry([]), "block")).toHaveLength(0);
  });

  it("returns a defensive copy — mutations do not affect subsequent calls", () => {
    const first = filterByCategory(localRegistry, "primitive");
    first.splice(0, first.length);
    const second = filterByCategory(localRegistry, "primitive");
    expect(second.length).toBeGreaterThan(0);
  });
});

describe("resolveTransitiveDeps", () => {
  it("returns empty array for empty input", () => {
    expect(resolveTransitiveDeps(localRegistry, [])).toHaveLength(0);
  });

  it("returns the requested entry when it has no component deps", () => {
    const result = resolveTransitiveDeps(localRegistry, ["badge"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("badge");
  });

  it("silently skips unknown component ids without throwing", () => {
    const result = resolveTransitiveDeps(localRegistry, [
      "hero-split",
      "totally-unknown",
    ]);
    expect(result.some((e) => e.id === "hero-split")).toBe(true);
    expect(result.some((e) => e.id === "totally-unknown")).toBe(false);
  });

  it("deduplicates when the same id appears multiple times in input", () => {
    const result = resolveTransitiveDeps(localRegistry, [
      "hero-split",
      "hero-split",
    ]);
    expect(result.filter((e) => e.id === "hero-split")).toHaveLength(1);
  });

  it("resolves multi-level chain: A → B → C all appear in output", () => {
    const reg = makeRegistry([
      makeEntry("a", ["b"]),
      makeEntry("b", ["c"]),
      makeEntry("c"),
    ]);
    const result = resolveTransitiveDeps(reg, ["a"]);
    expect(result.map((e) => e.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("does not loop on a direct self-reference", () => {
    const reg = makeRegistry([makeEntry("a", ["a"])]);
    const result = resolveTransitiveDeps(reg, ["a"]);
    expect(result).toHaveLength(1);
  });

  it("terminates on a mutual cycle: A → B → A", () => {
    const reg = makeRegistry([
      makeEntry("a", ["b"]),
      makeEntry("b", ["a"]),
    ]);
    const result = resolveTransitiveDeps(reg, ["a"]);
    expect(result).toHaveLength(2);
  });

  it("does not resolve npm-scoped package deps as component entries", () => {
    const reg = makeRegistry([
      makeEntry("block-x", ["@booga/vui"]),
    ]);
    const result = resolveTransitiveDeps(reg, ["block-x"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("block-x");
  });

  it("resolves entries from multiple independent roots", () => {
    const result = resolveTransitiveDeps(localRegistry, ["badge", "hero-split"]);
    expect(result.some((e) => e.id === "badge")).toBe(true);
    expect(result.some((e) => e.id === "hero-split")).toBe(true);
  });

  it("returns only entries reachable from the given roots — not the whole registry", () => {
    const result = resolveTransitiveDeps(localRegistry, ["badge"]);
    expect(result.length).toBeLessThan(localRegistry.entries.length);
  });
});
