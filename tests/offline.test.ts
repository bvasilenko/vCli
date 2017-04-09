import { describe, it, expect, vi, beforeEach } from "vitest";
import { registry as localRegistry } from "@booga/vregistry";

vi.mock("../src/registry/cache.js", () => ({
  readCache: vi.fn(),
  writeCache: vi.fn(),
  CACHE_TTL_MS: 3_600_000,
}));

import { fetchRegistry } from "../src/registry/fetch.js";
import * as cacheModule from "../src/registry/cache.js";
import { VcliConfigSchema } from "../src/config.js";

const defaultConfig = VcliConfigSchema.parse({});

describe("fetchRegistry — offline mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the local registry without making any HTTP request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await fetchRegistry(defaultConfig, { offline: true });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it("skips cache read so no disk I/O occurs", async () => {
    await fetchRegistry(defaultConfig, { offline: true });

    expect(cacheModule.readCache).not.toHaveBeenCalled();
  });

  it("skips cache write so the local registry is never persisted as a CDN fetch result", async () => {
    await fetchRegistry(defaultConfig, { offline: true });

    expect(cacheModule.writeCache).not.toHaveBeenCalled();
  });

  it("returns the same data regardless of whether the network would have succeeded", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => localRegistry,
    } as Response);

    const result = await fetchRegistry(defaultConfig, { offline: true });

    expect(result).toBe(localRegistry);
  });

  it("honours offline mode even when a valid cache entry exists", async () => {
    vi.mocked(cacheModule.readCache).mockResolvedValueOnce(localRegistry);

    await fetchRegistry(defaultConfig, { offline: true });

    expect(cacheModule.readCache).not.toHaveBeenCalled();
  });

  it("works with a custom registry URL — the URL is irrelevant in offline mode", async () => {
    const customConfig = VcliConfigSchema.parse({
      registry: "https://example.com/custom-registry.json",
    });

    const result = await fetchRegistry(customConfig, { offline: true });

    expect(result.entries.length).toBeGreaterThan(0);
  });
});
