// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { registry as localRegistry } from "@booga/vregistry";

vi.mock("../src/utils/log.js", () => ({
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
  spinner: vi.fn(() => ({ succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() })),
}));

vi.mock("../src/utils/pkg.js", () => ({
  installAll: vi.fn().mockResolvedValue(undefined),
  installPackages: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/registry/fetch.js", () => ({
  fetchRegistry: vi.fn(),
}));

import { runAdd } from "../src/commands/add.js";
import * as fetchModule from "../src/registry/fetch.js";
import { VcliError } from "../src/utils/exit.js";

describe("add command", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-add-"));
    vi.clearAllMocks();
    vi.mocked(fetchModule.fetchRegistry).mockResolvedValue(localRegistry);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe("file output", () => {
    it("creates a re-export stub file under the default components dir", async () => {
      await runAdd(["hero-split"], { cwd: tmpDir });
      const stubPath = path.join(tmpDir, "src", "components", "HeroSplit.tsx");
      expect(await fs.pathExists(stubPath)).toBe(true);
      const content = await fs.readFile(stubPath, "utf-8");
      expect(content).toContain("HeroSplit");
      expect(content).toContain("@booga/vblocks");
    });

    it("uses the componentsDir value from vcli.config.json", async () => {
      await fs.writeJson(path.join(tmpDir, "vcli.config.json"), {
        componentsDir: "lib/ui",
        packageManager: "bun",
      });
      await runAdd(["hero-split"], { cwd: tmpDir });
      expect(
        await fs.pathExists(path.join(tmpDir, "lib", "ui", "HeroSplit.tsx"))
      ).toBe(true);
    });

    it("creates stub files for all components in a single invocation", async () => {
      await runAdd(["hero-split", "cta-split"], { cwd: tmpDir });
      expect(
        await fs.pathExists(
          path.join(tmpDir, "src", "components", "HeroSplit.tsx")
        )
      ).toBe(true);
      expect(
        await fs.pathExists(
          path.join(tmpDir, "src", "components", "CtaSplit.tsx")
        )
      ).toBe(true);
    });
  });

  describe("package installation", () => {
    it("installs source package plus all declared npm deps", async () => {
      const { installPackages } = await import("../src/utils/pkg.js");
      await runAdd(["hero-split"], { cwd: tmpDir });
      expect(installPackages).toHaveBeenCalledWith(
        expect.arrayContaining(["@booga/vblocks", "@booga/vui"]),
        "bun",
        tmpDir
      );
    });

    it("installs only the source package when a component declares no npm deps", async () => {
      const { installPackages } = await import("../src/utils/pkg.js");
      await runAdd(["badge"], { cwd: tmpDir });
      const [packages] = vi.mocked(installPackages).mock.calls[0];
      expect(packages).toContain("@booga/vui");
      expect(packages).not.toContain("@booga/vblocks");
    });

    it("deduplicates packages shared across multiple components", async () => {
      const { installPackages } = await import("../src/utils/pkg.js");
      await runAdd(["hero-split", "cta-split"], { cwd: tmpDir });
      const [packages] = vi.mocked(installPackages).mock.calls[0];
      const vui = packages.filter((p: string) => p === "@booga/vui");
      expect(vui).toHaveLength(1);
    });

    it("passes installed packages in sorted order", async () => {
      const { installPackages } = await import("../src/utils/pkg.js");
      await runAdd(["hero-split"], { cwd: tmpDir });
      const [packages] = vi.mocked(installPackages).mock.calls[0];
      expect(packages).toEqual([...packages].sort());
    });

    it("handles entry with missing dependencies field without crashing", async () => {
      vi.mocked(fetchModule.fetchRegistry).mockResolvedValueOnce({
        ...localRegistry,
        entries: [
          ...localRegistry.entries,
          {
            id: "no-deps-entry",
            name: "NoDepsEntry",
            category: "primitive" as const,
            description: "",
            dependencies: undefined as unknown as string[],
            source: {
              package: "@booga/vtest",
              importPath: "NoDeps",
              exportName: "NoDeps",
            },
          },
        ],
      });
      const { installPackages } = await import("../src/utils/pkg.js");
      await runAdd(["no-deps-entry"], { cwd: tmpDir });
      const [packages] = vi.mocked(installPackages).mock.calls[0];
      expect(packages).toEqual(["@booga/vtest"]);
    });
  });

  describe("error handling", () => {
    it("throws VcliError for an unknown component ID", async () => {
      await expect(
        runAdd(["no-such-component"], { cwd: tmpDir })
      ).rejects.toBeInstanceOf(VcliError);
    });

    it("includes the unknown component ID in the error message", async () => {
      await expect(
        runAdd(["mystery-widget"], { cwd: tmpDir })
      ).rejects.toThrow("mystery-widget");
    });
  });

  describe("registry resolution", () => {
    it("passes offline=true to fetchRegistry when the offline option is set", async () => {
      await runAdd(["hero-split"], { cwd: tmpDir, offline: true });
      expect(fetchModule.fetchRegistry).toHaveBeenCalledWith(
        expect.any(Object),
        { offline: true }
      );
    });

    it("passes offline=false to fetchRegistry by default", async () => {
      await runAdd(["hero-split"], { cwd: tmpDir });
      expect(fetchModule.fetchRegistry).toHaveBeenCalledWith(
        expect.any(Object),
        { offline: undefined }
      );
    });
  });
});
