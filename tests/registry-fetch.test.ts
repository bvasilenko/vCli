// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
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

describe("fetchRegistry — cache hit path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns cached registry without calling CDN", async () => {
    vi.mocked(cacheModule.readCache).mockResolvedValueOnce(localRegistry);

    const result = await fetchRegistry(defaultConfig);

    expect(result).toBe(localRegistry);
    expect(cacheModule.writeCache).not.toHaveBeenCalled();
  });

  it("passes the registry URL as the cache key", async () => {
    vi.mocked(cacheModule.readCache).mockResolvedValueOnce(localRegistry);

    await fetchRegistry(defaultConfig);

    expect(cacheModule.readCache).toHaveBeenCalledWith(defaultConfig.registry);
  });

  it("uses the configured custom registry URL as the cache key", async () => {
    const customConfig = VcliConfigSchema.parse({
      registry: "https://example.com/custom-registry.json",
    });
    vi.mocked(cacheModule.readCache).mockResolvedValueOnce(localRegistry);

    await fetchRegistry(customConfig);

    expect(cacheModule.readCache).toHaveBeenCalledWith(customConfig.registry);
  });
});

describe("fetchRegistry — CDN fetch path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches from CDN when cache misses and writes result to cache", async () => {
    vi.mocked(cacheModule.readCache).mockResolvedValueOnce(null);
    vi.mocked(cacheModule.writeCache).mockResolvedValueOnce(undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => localRegistry,
    } as Response);

    await fetchRegistry(defaultConfig);

    expect(cacheModule.writeCache).toHaveBeenCalledWith(
      defaultConfig.registry,
      expect.objectContaining({ entries: expect.any(Array) })
    );
  });

  it("second call uses cache without making a second HTTP request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => localRegistry,
    } as Response);
    vi.mocked(cacheModule.readCache)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(localRegistry);
    vi.mocked(cacheModule.writeCache).mockResolvedValueOnce(undefined);

    await fetchRegistry(defaultConfig);
    await fetchRegistry(defaultConfig);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("cache write failure does not prevent returning freshly fetched data", async () => {
    vi.mocked(cacheModule.readCache).mockResolvedValueOnce(null);
    vi.mocked(cacheModule.writeCache).mockRejectedValueOnce(
      new Error("disk full")
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => localRegistry,
    } as Response);

    const result = await fetchRegistry(defaultConfig);

    expect(result.entries.length).toBeGreaterThan(0);
  });
});

describe("fetchRegistry — local fallback path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("falls back to local registry when CDN request throws", async () => {
    vi.mocked(cacheModule.readCache).mockResolvedValueOnce(null);
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("network unavailable")
    );

    const result = await fetchRegistry(defaultConfig);

    expect(result.entries.length).toBeGreaterThan(0);
  });

  it("falls back to local registry when CDN returns a non-ok status", async () => {
    vi.mocked(cacheModule.readCache).mockResolvedValueOnce(null);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    } as Response);

    const result = await fetchRegistry(defaultConfig);

    expect(result.entries.length).toBeGreaterThan(0);
  });

  it("does not write to cache when falling back to local registry", async () => {
    vi.mocked(cacheModule.readCache).mockResolvedValueOnce(null);
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("network unavailable")
    );

    await fetchRegistry(defaultConfig);

    expect(cacheModule.writeCache).not.toHaveBeenCalled();
  });
});
