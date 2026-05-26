import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
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

// These tests specifically guard the template-routing layer:
// adding --template flag support must not change behaviour when the flag is absent.

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

  it("never routes to 'vblocks-marketing' when no template is specified", async () => {
    await runInit("my-app", { cwd: tmpDir });
    const [, templateArg] = copyTemplateSpy.mock.calls[0];
    expect(templateArg).not.toBe("vblocks-marketing");
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
