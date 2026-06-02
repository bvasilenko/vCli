// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";

const MOCK_BRAND = {
  name: "Stripe",
  voice: { canonical: "c", repoDescription: "d" },
  assets: {
    favicon: { source: "f.svg", sizes: [32] },
    og: { dimensions: [1200, 630] },
    icons: { source: "i.svg", set: [] },
  },
  tokens: { color: { primary: "#635bff" }, type: { sans: "Inter" } },
};

const MOCK_COMPOSITION = {
  sections: [
    { id: "hero", visible: true, density: "regular", order: 0 },
    { id: "features", visible: true, density: "regular", order: 1 },
  ],
};

const mocks = vi.hoisted(() => ({
  copyTemplate: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  installAll: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  defaultComposition: vi.fn().mockReturnValue({
    sections: [
      { id: "hero", visible: true, density: "regular", order: 0 },
      { id: "features", visible: true, density: "regular", order: 1 },
    ],
  }),
  isTemplateId: vi.fn().mockReturnValue(true),
  loadFromFixture: vi.fn().mockResolvedValue({
    name: "Stripe",
    voice: { canonical: "c", repoDescription: "d" },
    assets: {
      favicon: { source: "f.svg", sizes: [32] },
      og: { dimensions: [1200, 630] },
      icons: { source: "i.svg", set: [] },
    },
    tokens: { color: { primary: "#635bff" }, type: { sans: "Inter" } },
  }),
  loadFromUrl: vi.fn().mockResolvedValue({ name: "Stripe", voice: { canonical: "c", repoDescription: "d" }, assets: { favicon: { source: "f.svg", sizes: [32] }, og: { dimensions: [1200, 630] }, icons: { source: "i.svg", set: [] } }, tokens: { color: {}, type: {} } }),
  loadFromGitHub: vi.fn().mockResolvedValue({ name: "Stripe", voice: { canonical: "c", repoDescription: "d" }, assets: { favicon: { source: "f.svg", sizes: [32] }, og: { dimensions: [1200, 630] }, icons: { source: "i.svg", set: [] } }, tokens: { color: {}, type: {} } }),
  loadFromNpm: vi.fn().mockResolvedValue({ name: "Stripe", voice: { canonical: "c", repoDescription: "d" }, assets: { favicon: { source: "f.svg", sizes: [32] }, og: { dimensions: [1200, 630] }, icons: { source: "i.svg", set: [] } }, tokens: { color: {}, type: {} } }),
  loadFromCustomJson: vi.fn().mockResolvedValue({ name: "Stripe", voice: { canonical: "c", repoDescription: "d" }, assets: { favicon: { source: "f.svg", sizes: [32] }, og: { dimensions: [1200, 630] }, icons: { source: "i.svg", set: [] } }, tokens: { color: {}, type: {} } }),
  loadFromLocalJson: vi.fn().mockResolvedValue({ name: "Stripe", voice: { canonical: "c", repoDescription: "d" }, assets: { favicon: { source: "f.svg", sizes: [32] }, og: { dimensions: [1200, 630] }, icons: { source: "i.svg", set: [] } }, tokens: { color: {}, type: {} } }),
}));

vi.mock("../src/utils/log.js", () => ({
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
  spinner: vi.fn(() => ({ succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() })),
}));

vi.mock("../src/utils/pkg.js", () => ({
  installAll: mocks.installAll,
  installPackages: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/template/index.js", () => ({
  copyTemplate: mocks.copyTemplate,
  VALID_TEMPLATES: ["default", "blank", "scaffold"],
}));

vi.mock("@booga/vbrand/templates", () => ({
  getTemplate: vi.fn().mockReturnValue({
    templateId: () => "landing",
    defaultComposition: mocks.defaultComposition,
    compose: vi.fn().mockReturnValue(null),
  }),
  isTemplateId: mocks.isTemplateId,
  TEMPLATE_IDS: ["landing", "marketing", "docs", "dashboard"],
}));

vi.mock("@booga/vbrand/adapters", () => ({
  DefaultBrandSourceAdapter: vi.fn().mockImplementation(() => ({
    loadFromFixture: mocks.loadFromFixture,
    loadFromUrl: mocks.loadFromUrl,
    loadFromGitHub: mocks.loadFromGitHub,
    loadFromNpm: mocks.loadFromNpm,
    loadFromCustomJson: mocks.loadFromCustomJson,
    loadFromLocalJson: mocks.loadFromLocalJson,
  })),
}));

import { runScaffold } from "../src/commands/scaffold.js";
import { VcliError } from "../src/utils/exit.js";

describe("runScaffold", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-scaffold-test-"));
    vi.clearAllMocks();
    mocks.loadFromFixture.mockResolvedValue(MOCK_BRAND);
    mocks.defaultComposition.mockReturnValue(MOCK_COMPOSITION);
    mocks.copyTemplate.mockResolvedValue(undefined);
    mocks.isTemplateId.mockReturnValue(true);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe("brand handle dispatch", () => {
    it("fixture: prefix calls loadFromFixture", async () => {
      await runScaffold("proj", { brand: "fixture:stripe", cwd: tmpDir, noInstall: true });
      expect(mocks.loadFromFixture).toHaveBeenCalledWith("stripe");
    });

    it("url: prefix calls loadFromUrl", async () => {
      await runScaffold("proj", { brand: "url:https://x.com/b.json", cwd: tmpDir, noInstall: true });
      expect(mocks.loadFromUrl).toHaveBeenCalledWith("https://x.com/b.json");
    });

    it("github: prefix calls loadFromGitHub with owner + repo", async () => {
      await runScaffold("proj", { brand: "github:acme/brand", cwd: tmpDir, noInstall: true });
      expect(mocks.loadFromGitHub).toHaveBeenCalledWith("acme", "brand");
    });

    it("npm: prefix calls loadFromNpm", async () => {
      await runScaffold("proj", { brand: "npm:@acme/brand", cwd: tmpDir, noInstall: true });
      expect(mocks.loadFromNpm).toHaveBeenCalledWith("@acme/brand");
    });

    it("json: prefix decodes base64 and calls loadFromCustomJson", async () => {
      const payload = { name: "Test" };
      const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
      await runScaffold("proj", { brand: `json:${encoded}`, cwd: tmpDir, noInstall: true });
      expect(mocks.loadFromCustomJson).toHaveBeenCalledWith(payload);
    });

    it("file: prefix calls loadFromLocalJson", async () => {
      await runScaffold("proj", { brand: "file:/tmp/brand.json", cwd: tmpDir, noInstall: true });
      expect(mocks.loadFromLocalJson).toHaveBeenCalledWith("/tmp/brand.json");
    });
  });

  describe("output files", () => {
    it("writes brand.json with loaded brand data", async () => {
      const targetDir = path.join(tmpDir, "proj");
      await fs.ensureDir(targetDir);
      await runScaffold("proj", { brand: "fixture:stripe", cwd: tmpDir, noInstall: true });
      const written = await fs.readJson(path.join(targetDir, "brand.json"));
      expect(written.name).toBe("Stripe");
    });

    it("writes composition.json from template.defaultComposition()", async () => {
      const targetDir = path.join(tmpDir, "proj");
      await fs.ensureDir(targetDir);
      await runScaffold("proj", { brand: "fixture:stripe", cwd: tmpDir, noInstall: true });
      const written = await fs.readJson(path.join(targetDir, "composition.json"));
      expect(written.sections).toHaveLength(2);
    });

    it("writes scaffold.json with the resolved appType", async () => {
      const targetDir = path.join(tmpDir, "proj");
      await fs.ensureDir(targetDir);
      await runScaffold("proj", { brand: "fixture:stripe", app: "landing", cwd: tmpDir, noInstall: true });
      const written = await fs.readJson(path.join(targetDir, "scaffold.json"));
      expect(written.appType).toBe("landing");
    });

    it("writes vcli.config.json with the package manager", async () => {
      const targetDir = path.join(tmpDir, "proj");
      await fs.ensureDir(targetDir);
      await runScaffold("proj", { brand: "fixture:stripe", packageManager: "npm", cwd: tmpDir, noInstall: true });
      const config = await fs.readJson(path.join(targetDir, "vcli.config.json"));
      expect(config.packageManager).toBe("npm");
    });

    it("vcli.config.json defaults packageManager to bun when not specified", async () => {
      await runScaffold("proj", { brand: "fixture:stripe", cwd: tmpDir, noInstall: true });
      const config = await fs.readJson(path.join(tmpDir, "proj", "vcli.config.json"));
      expect(config.packageManager).toBe("bun");
    });
  });

  describe("app type", () => {
    it("defaults to landing when --app is omitted", async () => {
      await runScaffold("proj", { brand: "fixture:stripe", cwd: tmpDir, noInstall: true });
      expect(mocks.isTemplateId).toHaveBeenCalledWith("landing");
    });

    it("rejects unknown app types", async () => {
      mocks.isTemplateId.mockReturnValueOnce(false);
      await expect(
        runScaffold("proj", { brand: "fixture:stripe", app: "unknown-app", cwd: tmpDir, noInstall: true })
      ).rejects.toBeInstanceOf(VcliError);
    });
  });

  describe("directory guards", () => {
    it("fails when target directory is non-empty", async () => {
      const targetDir = path.join(tmpDir, "proj");
      await fs.ensureDir(targetDir);
      await fs.writeFile(path.join(targetDir, "existing.txt"), "");
      await expect(
        runScaffold("proj", { brand: "fixture:stripe", cwd: tmpDir, noInstall: true })
      ).rejects.toBeInstanceOf(VcliError);
    });

    it("succeeds when target directory is empty", async () => {
      const targetDir = path.join(tmpDir, "proj");
      await fs.ensureDir(targetDir);
      await expect(
        runScaffold("proj", { brand: "fixture:stripe", cwd: tmpDir, noInstall: true })
      ).resolves.toBeUndefined();
    });

    it("succeeds when target directory does not exist yet", async () => {
      await expect(
        runScaffold("new-proj", { brand: "fixture:stripe", cwd: tmpDir, noInstall: true })
      ).resolves.toBeUndefined();
    });
  });

  describe("scaffolding", () => {
    it("copies scaffold template to the target directory for any brand source", async () => {
      const targetDir = path.join(tmpDir, "proj");
      await runScaffold("proj", { brand: "fixture:stripe", cwd: tmpDir, noInstall: true });
      expect(mocks.copyTemplate).toHaveBeenCalledWith(targetDir, "scaffold");
    });
  });

  describe("path resolution", () => {
    it("uses process.cwd() as the base when cwd option is omitted", async () => {
      const cwdStub = vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
      try {
        await runScaffold("proj", { brand: "fixture:stripe", noInstall: true });
        const config = await fs.readJson(path.join(tmpDir, "proj", "vcli.config.json"));
        expect(config).toHaveProperty("packageManager");
      } finally {
        cwdStub.mockRestore();
      }
    });

    it("scaffolds into the cwd itself when project name is undefined", async () => {
      await runScaffold(undefined, { brand: "fixture:stripe", cwd: tmpDir, noInstall: true });
      const config = await fs.readJson(path.join(tmpDir, "vcli.config.json"));
      expect(config).toHaveProperty("packageManager");
    });
  });

  describe("install", () => {
    it("calls installAll with the chosen package manager when noInstall is not set", async () => {
      await runScaffold("proj", { brand: "fixture:stripe", cwd: tmpDir });
      expect(mocks.installAll).toHaveBeenCalledOnce();
    });

    it("skips installAll when noInstall is true", async () => {
      await runScaffold("proj", { brand: "fixture:stripe", cwd: tmpDir, noInstall: true });
      expect(mocks.installAll).not.toHaveBeenCalled();
    });

    it.each(["npm", "pnpm", "yarn", "bun"] as const)(
      "passes '%s' as the package manager argument to installAll",
      async (pm) => {
        await runScaffold("proj", { brand: "fixture:stripe", packageManager: pm, cwd: tmpDir });
        expect(mocks.installAll).toHaveBeenCalledWith(pm, expect.any(String));
      }
    );
  });
});
