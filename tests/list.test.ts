// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect, vi, beforeEach } from "vitest";
import { registry as localRegistry } from "@booga/vregistry";

vi.mock("../src/registry/fetch.js", () => ({
  fetchRegistry: vi.fn(),
}));

import { runList } from "../src/commands/list.js";
import * as fetchModule from "../src/registry/fetch.js";

describe("list command", () => {
  let output: string;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchModule.fetchRegistry).mockResolvedValue(localRegistry);
    output = "";
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      output += args.join(" ") + "\n";
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("output content", () => {
    it("prints all registry entries when no category filter is given", async () => {
      await runList({});
      expect(output).toContain("hero-split");
      expect(output).toContain("badge");
    });

    it("includes only block entries when filtered by block category", async () => {
      await runList({ category: "block" });
      expect(output).toContain("hero-split");
      expect(output).not.toContain("badge");
    });

    it("includes only primitive entries when filtered by primitive category", async () => {
      await runList({ category: "primitive" });
      expect(output).toContain("badge");
      expect(output).not.toContain("hero-split");
    });

    it("outputs entries in stable alphabetical order within a category", async () => {
      await runList({ category: "block" });
      const ctaIndex = output.indexOf("cta-split");
      const heroIndex = output.indexOf("hero-split");
      expect(ctaIndex).toBeLessThan(heroIndex);
    });
  });

  describe("empty-state warnings", () => {
    it("warns when the requested category has no members", async () => {
      const warnSpy = vi.spyOn(console, "warn");
      await runList({ category: "nonexistent-category" });
      expect(warnSpy).toHaveBeenCalled();
    });

    it("warns with the word 'empty' when the registry has no entries", async () => {
      vi.mocked(fetchModule.fetchRegistry).mockResolvedValueOnce({
        ...localRegistry,
        entries: [],
      });
      const warnSpy = vi.spyOn(console, "warn");

      await runList({});

      expect(warnSpy.mock.calls.flat().join(" ")).toContain("empty");
    });
  });

  describe("registry resolution", () => {
    it("passes offline=true to fetchRegistry when the offline option is set", async () => {
      await runList({ offline: true });
      expect(fetchModule.fetchRegistry).toHaveBeenCalledWith(
        expect.any(Object),
        { offline: true }
      );
    });

    it("passes offline=false to fetchRegistry by default", async () => {
      await runList({});
      expect(fetchModule.fetchRegistry).toHaveBeenCalledWith(
        expect.any(Object),
        { offline: undefined }
      );
    });
  });
});
