// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect, vi } from "vitest";
import { loadBrand } from "../src/brand/load.js";
import type { BrandHandle } from "../src/brand/handle.js";
import type { BrandSourceAdapter } from "@booga/vbrand/adapters";
import { VcliError } from "../src/utils/exit.js";

const MOCK_BRAND = {
  name: "Test",
  voice: { canonical: "c", repoDescription: "d" },
  assets: {
    favicon: { source: "f.svg", sizes: [32] },
    og: { dimensions: [1200, 630] as [number, number] },
    icons: { source: "i.svg", set: [] },
  },
  tokens: { color: {}, type: {} },
} as const;

function makeAdapter(
  overrides: Partial<Record<keyof BrandSourceAdapter, ReturnType<typeof vi.fn>>>
): BrandSourceAdapter {
  const base: BrandSourceAdapter = {
    loadFromUrl: vi.fn().mockResolvedValue(MOCK_BRAND),
    loadFromFixture: vi.fn().mockResolvedValue(MOCK_BRAND),
    loadFromGitHub: vi.fn().mockResolvedValue(MOCK_BRAND),
    loadFromNpm: vi.fn().mockResolvedValue(MOCK_BRAND),
    loadFromLocalJson: vi.fn().mockResolvedValue(MOCK_BRAND),
    loadFromCustomJson: vi.fn().mockResolvedValue(MOCK_BRAND),
  };
  return { ...base, ...overrides };
}

describe("loadBrand", () => {
  it("dispatches url handle to loadFromUrl", async () => {
    const adapter = makeAdapter({});
    const handle: BrandHandle = { prefix: "url", value: "https://x.com/b.json" };
    const result = await loadBrand(handle, adapter);
    expect(adapter.loadFromUrl).toHaveBeenCalledWith("https://x.com/b.json");
    expect(result).toBe(MOCK_BRAND);
  });

  it("dispatches fixture handle to loadFromFixture", async () => {
    const adapter = makeAdapter({});
    const handle: BrandHandle = { prefix: "fixture", value: "stripe" };
    await loadBrand(handle, adapter);
    expect(adapter.loadFromFixture).toHaveBeenCalledWith("stripe");
  });

  it("dispatches github handle to loadFromGitHub with owner + repo", async () => {
    const adapter = makeAdapter({});
    const handle: BrandHandle = { prefix: "github", owner: "acme", repo: "brand" };
    await loadBrand(handle, adapter);
    expect(adapter.loadFromGitHub).toHaveBeenCalledWith("acme", "brand");
  });

  it("dispatches npm handle to loadFromNpm", async () => {
    const adapter = makeAdapter({});
    const handle: BrandHandle = { prefix: "npm", value: "@acme/brand" };
    await loadBrand(handle, adapter);
    expect(adapter.loadFromNpm).toHaveBeenCalledWith("@acme/brand");
  });

  it("dispatches json handle to loadFromCustomJson", async () => {
    const adapter = makeAdapter({});
    const handle: BrandHandle = { prefix: "json", payload: { x: 1 } };
    await loadBrand(handle, adapter);
    expect(adapter.loadFromCustomJson).toHaveBeenCalledWith({ x: 1 });
  });

  it("dispatches file handle to loadFromLocalJson", async () => {
    const adapter = makeAdapter({});
    const handle: BrandHandle = { prefix: "file", value: "/tmp/brand.json" };
    await loadBrand(handle, adapter);
    expect(adapter.loadFromLocalJson).toHaveBeenCalledWith("/tmp/brand.json");
  });

  it("wraps non-VcliError exceptions as VcliError with prefix context", async () => {
    const adapter = makeAdapter({
      loadFromUrl: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    });
    const handle: BrandHandle = { prefix: "url", value: "https://x.com/b.json" };
    await expect(loadBrand(handle, adapter)).rejects.toBeInstanceOf(VcliError);
  });

  it("re-throws VcliError unchanged", async () => {
    const original = new VcliError("already wrapped");
    const adapter = makeAdapter({
      loadFromUrl: vi.fn().mockRejectedValue(original),
    });
    const handle: BrandHandle = { prefix: "url", value: "https://x.com/b.json" };
    await expect(loadBrand(handle, adapter)).rejects.toBe(original);
  });

  it("wraps a non-Error thrown value (string, number) as VcliError", async () => {
    for (const nonError of ["plain string", 42, null, undefined]) {
      const adapter = makeAdapter({
        loadFromUrl: vi.fn().mockRejectedValue(nonError),
      });
      const handle: BrandHandle = { prefix: "url", value: "https://x.com/b.json" };
      await expect(loadBrand(handle, adapter)).rejects.toBeInstanceOf(VcliError);
    }
  });
});
