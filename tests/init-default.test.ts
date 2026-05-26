// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
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
  "../src/template/files-default"
);

// ─── Routing ─────────────────────────────────────────────────────────────────

describe("runInit — default template routing (regression guard)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-default-"));
    copyTemplateSpy.mockClear();
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("routes to 'default' template when --template is omitted", async () => {
    await runInit("my-app", { cwd: tmpDir });
    const [, templateArg] = copyTemplateSpy.mock.calls[0];
    expect(templateArg).toBe("default");
  });

  it("routes to 'default' template when template option is explicitly 'default'", async () => {
    await runInit("my-app", { cwd: tmpDir, template: "default" });
    const [, templateArg] = copyTemplateSpy.mock.calls[0];
    expect(templateArg).toBe("default");
  });

  it("copyTemplate is called exactly once per runInit invocation", async () => {
    await runInit("my-app", { cwd: tmpDir });
    expect(copyTemplateSpy).toHaveBeenCalledOnce();
  });

  it("all four supported package managers produce valid vcli.config.json", async () => {
    const pms = ["bun", "npm", "pnpm", "yarn"] as const;
    for (const pm of pms) {
      const dir = path.join(tmpDir, `app-${pm}`);
      await runInit(`app-${pm}`, { cwd: tmpDir, packageManager: pm });
      const config = await fs.readJson(path.join(dir, "vcli.config.json"));
      expect(config.packageManager).toBe(pm);
    }
  });
});

// ─── Static template content ─────────────────────────────────────────────────

describe("files-default template — package.json", () => {
  let pkg: Record<string, unknown>;

  beforeAll(async () => {
    pkg = await fs.readJson(path.join(TEMPLATE_DIR, "package.json"));
  });

  it("is valid JSON", () => {
    expect(pkg).toBeTruthy();
  });

  it("has type:module for ESM compatibility", () => {
    expect(pkg.type).toBe("module");
  });

  it("declares the three vBlocks runtime packages as dependencies", () => {
    const deps = pkg.dependencies as Record<string, string>;
    for (const required of ["@booga/vblocks", "@booga/vdsl", "@booga/vtheme"]) {
      expect(deps, `missing dep: ${required}`).toHaveProperty(required);
    }
  });

  it("declares react and react-dom as runtime dependencies", () => {
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps).toHaveProperty("react");
    expect(deps).toHaveProperty("react-dom");
  });

  it("scripts include dev, build, and preview", () => {
    const scripts = pkg.scripts as Record<string, string>;
    for (const name of ["dev", "build", "preview"]) {
      expect(scripts, `missing script: ${name}`).toHaveProperty(name);
    }
  });
});

describe("files-default template — app composition (src/main.jsx)", () => {
  let source: string;

  beforeAll(async () => {
    source = await fs.readFile(path.join(TEMPLATE_DIR, "src/main.jsx"), "utf-8");
  });

  it("imports all four vBlocks section components from @booga/vblocks", () => {
    for (const component of ["HeroSplit", "FeaturesGrid", "CtaCentered", "FooterSplit"]) {
      expect(source, `${component} not imported`).toContain(component);
    }
  });

  it("renders all four section components", () => {
    for (const tag of ["<HeroSplit", "<FeaturesGrid", "<CtaCentered", "<FooterSplit"]) {
      expect(source, `${tag} not rendered`).toContain(tag);
    }
  });

  it("wraps the app in a bg-background container", () => {
    expect(source).toContain("bg-background");
  });

  it("mounts into the DOM via createRoot", () => {
    expect(source).toContain("createRoot");
  });
});

describe("files-default template — tailwind setup (tailwind.config.js)", () => {
  let source: string;

  beforeAll(async () => {
    source = await fs.readFile(path.join(TEMPLATE_DIR, "tailwind.config.js"), "utf-8");
  });

  it("uses vtheme as a Tailwind preset", () => {
    expect(source).toContain("@booga/vtheme/preset");
    expect(source).toMatch(/presets\s*:/);
  });

  it("spreads dslSafelist into the tailwind safelist", () => {
    expect(source).toContain("dslSafelist");
    expect(source).toMatch(/safelist\s*:/);
  });

  it("includes vblocks dist in tailwind content paths", () => {
    expect(source).toContain("@booga/vblocks/dist");
  });
});

describe("files-default template — HTML entry (index.html)", () => {
  let html: string;

  beforeAll(async () => {
    html = await fs.readFile(path.join(TEMPLATE_DIR, "index.html"), "utf-8");
  });

  it("has a #root mount point for the React app", () => {
    expect(html).toContain('id="root"');
  });

  it("mounts the JSX entry point via /src/main.jsx", () => {
    expect(html).toContain("/src/main.jsx");
  });

  it("uses an inline data-URI favicon", () => {
    expect(html).toMatch(/href="data:/);
  });
});

describe("files-default template — required files present", () => {
  const REQUIRED_FILES = [
    "index.html",
    "package.json",
    "tailwind.config.js",
    "postcss.config.js",
    "vite.config.js",
    "vcli.config.json",
    path.join("src", "main.jsx"),
    path.join("src", "styles.css"),
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
});
