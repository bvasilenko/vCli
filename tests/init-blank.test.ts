// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";

vi.mock("../src/utils/log.js", () => ({
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
  spinner: vi.fn(() => ({ succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() })),
}));

vi.mock("../src/utils/pkg.js", () => ({
  installAll: vi.fn().mockResolvedValue(undefined),
  installPackages: vi.fn().mockResolvedValue(undefined),
}));

const copyTemplateSpy = vi.fn().mockResolvedValue(undefined);
vi.mock("../src/template/index.js", () => ({
  copyTemplate: (...args: unknown[]) => copyTemplateSpy(...args),
  VALID_TEMPLATES: ["default", "blank"],
}));

import { runInit } from "../src/commands/init.js";

const TEMPLATE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/template/files-blank"
);

describe("runInit — blank template routing", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-blank-"));
    copyTemplateSpy.mockClear();
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("passes 'blank' as the template name to copyTemplate", async () => {
    await runInit("my-site", { cwd: tmpDir, template: "blank" });
    const [, templateArg] = copyTemplateSpy.mock.calls[0];
    expect(templateArg).toBe("blank");
  });

  it("invokes copyTemplate exactly once when blank template is requested", async () => {
    await runInit("my-site", { cwd: tmpDir, template: "blank" });
    expect(copyTemplateSpy).toHaveBeenCalledOnce();
  });
});

describe("files-blank template — package.json", () => {
  let pkg: Record<string, unknown>;

  beforeEach(async () => {
    pkg = await fs.readJson(path.join(TEMPLATE_DIR, "package.json"));
  });

  it("is valid JSON", () => {
    expect(pkg).toBeTruthy();
  });

  it("has type:module for ESM compatibility", () => {
    expect(pkg.type).toBe("module");
  });

  it("declares react and react-dom as runtime dependencies", () => {
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps).toHaveProperty("react");
    expect(deps).toHaveProperty("react-dom");
  });

  it("carries no vBlocks runtime dependencies", () => {
    const deps = pkg.dependencies as Record<string, string>;
    for (const forbidden of ["@booga/vblocks", "@booga/vdsl"]) {
      expect(deps).not.toHaveProperty(forbidden);
    }
  });

  it("declares vUi and vTheme as the vsuite runtime deps", () => {
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps).toHaveProperty("@booga/vui");
    expect(deps).toHaveProperty("@booga/vtheme");
  });

  it("scripts include dev, build, and preview", () => {
    const scripts = pkg.scripts as Record<string, string>;
    for (const script of ["dev", "build", "preview"]) {
      expect(scripts).toHaveProperty(script);
    }
  });
});

describe("files-blank template — entry point (src/main.tsx)", () => {
  let source: string;

  beforeEach(async () => {
    source = await fs.readFile(path.join(TEMPLATE_DIR, "src/main.tsx"), "utf-8");
  });

  it("imports react-dom for client-side rendering", () => {
    expect(source).toContain("react-dom");
  });

  it("mounts into a DOM element (createRoot pattern)", () => {
    expect(source).toMatch(/createRoot|render/);
  });
});

describe("files-blank template — App component (src/App.tsx)", () => {
  let source: string;

  beforeEach(async () => {
    source = await fs.readFile(path.join(TEMPLATE_DIR, "src/App.tsx"), "utf-8");
  });

  it("exports a default React component", () => {
    expect(source).toContain("export default");
  });

  it("imports from @booga/vui as the starting point for composition", () => {
    expect(source).toContain("@booga/vui");
  });
});

describe("files-blank template — HTML entry (index.html)", () => {
  let html: string;

  beforeEach(async () => {
    html = await fs.readFile(path.join(TEMPLATE_DIR, "index.html"), "utf-8");
  });

  it("has a #root mount point for the React app", () => {
    expect(html).toContain('id="root"');
  });

  it("mounts the TypeScript entry point via /src/main.tsx", () => {
    expect(html).toContain("/src/main.tsx");
  });
});

describe("files-blank template — required files present", () => {
  const REQUIRED_FILES = [
    "index.html",
    "package.json",
    "tsconfig.json",
    "tailwind.config.ts",
    "vite.config.ts",
    "postcss.config.js",
    "vcli.config.json",
    path.join("src", "main.tsx"),
    path.join("src", "App.tsx"),
    path.join("src", "index.css"),
  ];

  for (const rel of REQUIRED_FILES) {
    it(`${rel} is present`, async () => {
      expect(await fs.pathExists(path.join(TEMPLATE_DIR, rel))).toBe(true);
    });
  }

  it("vcli.config.json is valid JSON", async () => {
    await expect(
      fs.readJson(path.join(TEMPLATE_DIR, "vcli.config.json"))
    ).resolves.toBeTruthy();
  });

  it("tsconfig.json is valid JSON", async () => {
    await expect(
      fs.readJson(path.join(TEMPLATE_DIR, "tsconfig.json"))
    ).resolves.toBeTruthy();
  });
});
