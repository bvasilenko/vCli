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
  VALID_TEMPLATES: ["default", "vblocks-marketing"],
}));

import { runInit } from "../src/commands/init.js";
import { VcliError } from "../src/utils/exit.js";

const TEMPLATE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/template/files-vblocks-marketing"
);

describe("runInit — template routing for vblocks-marketing", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-vblocks-"));
    copyTemplateSpy.mockClear();
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("passes 'vblocks-marketing' as the template name to copyTemplate", async () => {
    await runInit("my-site", { cwd: tmpDir, template: "vblocks-marketing" });
    const [, templateArg] = copyTemplateSpy.mock.calls[0];
    expect(templateArg).toBe("vblocks-marketing");
  });

  it("targets the named subdirectory inside cwd", async () => {
    await runInit("my-site", { cwd: tmpDir, template: "vblocks-marketing" });
    const [targetDir] = copyTemplateSpy.mock.calls[0];
    expect(targetDir).toBe(path.join(tmpDir, "my-site"));
  });

  it("writes vcli.config.json to the scaffolded directory", async () => {
    await runInit("my-site", { cwd: tmpDir, template: "vblocks-marketing" });
    expect(
      await fs.pathExists(path.join(tmpDir, "my-site", "vcli.config.json"))
    ).toBe(true);
  });

  it("vcli.config.json records the chosen package manager", async () => {
    await runInit("my-site", {
      cwd: tmpDir,
      template: "vblocks-marketing",
      packageManager: "npm",
    });
    const config = await fs.readJson(
      path.join(tmpDir, "my-site", "vcli.config.json")
    );
    expect(config.packageManager).toBe("npm");
  });

  it("rejects a non-empty target directory regardless of template", async () => {
    const occupied = path.join(tmpDir, "occupied");
    await fs.ensureDir(occupied);
    await fs.writeFile(path.join(occupied, "existing.txt"), "x");
    await expect(
      runInit("occupied", { cwd: tmpDir, template: "vblocks-marketing" })
    ).rejects.toBeInstanceOf(VcliError);
  });

  it("accepts an empty pre-existing target directory", async () => {
    const empty = path.join(tmpDir, "empty");
    await fs.ensureDir(empty);
    await expect(
      runInit("empty", { cwd: tmpDir, template: "vblocks-marketing" })
    ).resolves.toBeUndefined();
  });

  it("does not invoke copyTemplate with 'default' when marketing template is requested", async () => {
    await runInit("my-site", { cwd: tmpDir, template: "vblocks-marketing" });
    const [, templateArg] = copyTemplateSpy.mock.calls[0];
    expect(templateArg).not.toBe("default");
  });
});

describe("files-vblocks-marketing template content", () => {
  it("package.json is valid JSON", async () => {
    await expect(
      fs.readJson(path.join(TEMPLATE_DIR, "package.json"))
    ).resolves.toBeTruthy();
  });

  it("package.json declares all required vBlocks runtime deps", async () => {
    const pkg = await fs.readJson(path.join(TEMPLATE_DIR, "package.json"));
    for (const dep of ["@booga/vblocks", "@booga/vtheme", "@booga/vdsl"]) {
      expect(pkg.dependencies).toHaveProperty(dep);
    }
  });

  it("package.json declares react and react-dom as dependencies", async () => {
    const pkg = await fs.readJson(path.join(TEMPLATE_DIR, "package.json"));
    expect(pkg.dependencies).toHaveProperty("react");
    expect(pkg.dependencies).toHaveProperty("react-dom");
  });

  it("package.json scripts include dev, build, and preview", async () => {
    const pkg = await fs.readJson(path.join(TEMPLATE_DIR, "package.json"));
    for (const script of ["dev", "build", "preview"]) {
      expect(pkg.scripts).toHaveProperty(script);
    }
  });

  it("package.json has type:module for ESM compatibility", async () => {
    const pkg = await fs.readJson(path.join(TEMPLATE_DIR, "package.json"));
    expect(pkg.type).toBe("module");
  });

  it("src/main.jsx imports all four required vBlocks components", async () => {
    const source = await fs.readFile(
      path.join(TEMPLATE_DIR, "src/main.jsx"),
      "utf-8"
    );
    for (const name of [
      "HeroSplit",
      "FeaturesGrid",
      "CtaCentered",
      "FooterSplit",
    ]) {
      expect(source).toContain(name);
    }
  });

  it("src/main.jsx uses DefaultContent objects for each component", async () => {
    const source = await fs.readFile(
      path.join(TEMPLATE_DIR, "src/main.jsx"),
      "utf-8"
    );
    for (const name of [
      "HeroSplitDefaultContent",
      "FeaturesGridDefaultContent",
      "CtaCenteredDefaultContent",
      "FooterSplitDefaultContent",
    ]) {
      expect(source).toContain(name);
    }
  });

  it("src/main.jsx imports from @booga/vblocks", async () => {
    const source = await fs.readFile(
      path.join(TEMPLATE_DIR, "src/main.jsx"),
      "utf-8"
    );
    expect(source).toContain("@booga/vblocks");
  });

  it("tailwind.config.js imports from @booga/vtheme/preset", async () => {
    const source = await fs.readFile(
      path.join(TEMPLATE_DIR, "tailwind.config.js"),
      "utf-8"
    );
    expect(source).toContain("@booga/vtheme/preset");
  });

  it("tailwind.config.js uses dslSafelist to cover DSL-generated classes", async () => {
    const source = await fs.readFile(
      path.join(TEMPLATE_DIR, "tailwind.config.js"),
      "utf-8"
    );
    expect(source).toContain("dslSafelist");
  });

  it("index.html mounts the React app via /src/main.jsx", async () => {
    const html = await fs.readFile(
      path.join(TEMPLATE_DIR, "index.html"),
      "utf-8"
    );
    expect(html).toContain("/src/main.jsx");
  });

  it("index.html has a #root mount point", async () => {
    const html = await fs.readFile(
      path.join(TEMPLATE_DIR, "index.html"),
      "utf-8"
    );
    expect(html).toContain('id="root"');
  });

  it("index.html declares a favicon link to prevent browser auto-request", async () => {
    const html = await fs.readFile(
      path.join(TEMPLATE_DIR, "index.html"),
      "utf-8"
    );
    expect(html).toMatch(/<link[^>]+rel=["']icon["']/);
  });

    it("vcli.config.json is present and is valid JSON", async () => {
    await expect(
      fs.readJson(path.join(TEMPLATE_DIR, "vcli.config.json"))
    ).resolves.toBeTruthy();
  });

  it("all expected files are present in the template directory", async () => {
    const required = [
      "index.html",
      "package.json",
      "tailwind.config.js",
      "vite.config.js",
      "postcss.config.js",
      "vcli.config.json",
      path.join("src", "main.jsx"),
      path.join("src", "styles.css"),
    ];
    for (const rel of required) {
      expect(
        await fs.pathExists(path.join(TEMPLATE_DIR, rel)),
        `missing: ${rel}`
      ).toBe(true);
    }
  });
});
