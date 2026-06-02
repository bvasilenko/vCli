// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import type { CompositionSpec } from "@booga/vbrand/composition";

type AppType = "landing" | "marketing" | "docs" | "dashboard";

const APP_TYPE_COMPOSITIONS: Record<AppType, CompositionSpec> = {
  landing: {
    sections: [
      { id: "hero", visible: true, density: "regular", order: 0 },
      { id: "features", visible: true, density: "regular", order: 1 },
      { id: "cta", visible: true, density: "regular", order: 2 },
      { id: "footer", visible: true, density: "regular", order: 3 },
    ],
  },
  marketing: {
    sections: [
      { id: "hero", visible: true, density: "regular", order: 0 },
      { id: "testimonials", visible: true, density: "regular", order: 1 },
      { id: "pricing", visible: true, density: "regular", order: 2 },
      { id: "cta", visible: true, density: "regular", order: 3 },
      { id: "footer", visible: true, density: "regular", order: 4 },
    ],
  },
  docs: {
    sections: [
      { id: "sidebar", visible: true, density: "regular", order: 0 },
      { id: "article", visible: true, density: "regular", order: 1 },
      { id: "toc", visible: true, density: "regular", order: 2 },
    ],
  },
  dashboard: {
    sections: [
      { id: "sidebar", visible: true, density: "regular", order: 0 },
      { id: "stats", visible: true, density: "regular", order: 1 },
      { id: "grid", visible: true, density: "regular", order: 2 },
    ],
  },
};

const TEMPLATE_IDS = Object.keys(APP_TYPE_COMPOSITIONS) as AppType[];

const MOCK_BRAND_A = {
  name: "Stripe",
  voice: { canonical: "c", repoDescription: "d" },
  assets: {
    favicon: { source: "f.svg", sizes: [32] },
    og: { dimensions: [1200, 630] },
    icons: { source: "i.svg", set: [] },
  },
  tokens: { color: { primary: "#635bff" }, type: { sans: "Inter" } },
};

const MOCK_BRAND_B = {
  name: "Linear",
  voice: { canonical: "l", repoDescription: "e" },
  assets: {
    favicon: { source: "g.svg", sizes: [32] },
    og: { dimensions: [1200, 630] },
    icons: { source: "j.svg", set: [] },
  },
  tokens: { color: { primary: "#5e6ad2" }, type: { mono: "JetBrains Mono" } },
};

const mocks = vi.hoisted(() => ({
  copyTemplate: vi.fn<() => Promise<void>>(),
  installAll: vi.fn<() => Promise<void>>(),
  getTemplate: vi.fn(),
  isTemplateId: vi.fn(),
  loadFromFixture: vi.fn(),
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
  getTemplate: mocks.getTemplate,
  isTemplateId: mocks.isTemplateId,
  TEMPLATE_IDS: ["landing", "marketing", "docs", "dashboard"],
}));

vi.mock("@booga/vbrand/adapters", () => ({
  DefaultBrandSourceAdapter: vi.fn().mockImplementation(() => ({
    loadFromFixture: mocks.loadFromFixture,
    loadFromUrl: vi.fn().mockRejectedValue(new Error("not used")),
    loadFromGitHub: vi.fn().mockRejectedValue(new Error("not used")),
    loadFromNpm: vi.fn().mockRejectedValue(new Error("not used")),
    loadFromCustomJson: vi.fn().mockRejectedValue(new Error("not used")),
    loadFromLocalJson: vi.fn().mockRejectedValue(new Error("not used")),
  })),
}));

import { runScaffold } from "../src/commands/scaffold.js";

describe("runScaffold app-type composition dispatch", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-app-type-test-"));
    vi.clearAllMocks();
    mocks.loadFromFixture.mockResolvedValue(MOCK_BRAND_A);
    mocks.isTemplateId.mockReturnValue(true);
    mocks.copyTemplate.mockResolvedValue(undefined);
    mocks.installAll.mockResolvedValue(undefined);
    mocks.getTemplate.mockImplementation((id: string) => ({
      templateId: () => id,
      defaultComposition: () =>
        APP_TYPE_COMPOSITIONS[id as AppType] ?? { sections: [] },
      compose: vi.fn().mockReturnValue(null),
    }));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe("composition written from getTemplate(appType).defaultComposition()", () => {
    it.each(TEMPLATE_IDS)(
      "runScaffold --app=%s writes the matching defaultComposition to composition.json",
      async (appType) => {
        await runScaffold("proj", {
          brand: "fixture:stripe",
          app: appType,
          cwd: tmpDir,
          noInstall: true,
        });

        const written = await fs.readJson(
          path.join(tmpDir, "proj", "composition.json")
        );

        expect(mocks.getTemplate).toHaveBeenCalledWith(appType);
        expect(written).toEqual(APP_TYPE_COMPOSITIONS[appType]);
      }
    );

    it("omitting --app writes landing's defaultComposition to composition.json", async () => {
      await runScaffold("proj", {
        brand: "fixture:stripe",
        cwd: tmpDir,
        noInstall: true,
      });

      const written = await fs.readJson(
        path.join(tmpDir, "proj", "composition.json")
      );

      expect(mocks.getTemplate).toHaveBeenCalledWith("landing");
      expect(written).toEqual(APP_TYPE_COMPOSITIONS["landing"]);
    });
  });

  describe("composition is determined by appType, not by brand", () => {
    it.each(TEMPLATE_IDS)(
      "--app=%s produces identical composition.json regardless of which brand is loaded",
      async (appType) => {
        mocks.loadFromFixture
          .mockResolvedValueOnce(MOCK_BRAND_A)
          .mockResolvedValueOnce(MOCK_BRAND_B);

        await runScaffold("proj-a", {
          brand: "fixture:stripe",
          app: appType,
          cwd: tmpDir,
          noInstall: true,
        });
        await runScaffold("proj-b", {
          brand: "fixture:linear",
          app: appType,
          cwd: tmpDir,
          noInstall: true,
        });

        const compositionA = await fs.readJson(
          path.join(tmpDir, "proj-a", "composition.json")
        );
        const compositionB = await fs.readJson(
          path.join(tmpDir, "proj-b", "composition.json")
        );

        expect(compositionA).toEqual(compositionB);
        expect(compositionA).toEqual(APP_TYPE_COMPOSITIONS[appType]);
      }
    );
  });
});
