import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";

vi.mock("../src/utils/log.js", () => ({
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
  spinner: vi.fn(() => ({ succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() })),
}));

vi.mock("../src/template/index.js", () => ({
  copyTemplate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/utils/pkg.js", () => ({
  installAll: vi.fn().mockResolvedValue(undefined),
  installPackages: vi.fn().mockResolvedValue(undefined),
}));

import { runInit } from "../src/commands/init.js";
import { VcliError } from "../src/utils/exit.js";

describe("init command", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-init-"));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("creates vcli.config.json in an empty directory", async () => {
    const targetDir = path.join(tmpDir, "my-app");
    await runInit("my-app", { cwd: tmpDir });
    expect(await fs.pathExists(path.join(targetDir, "vcli.config.json"))).toBe(
      true
    );
  });

  it("writes config with requested package manager", async () => {
    const targetDir = path.join(tmpDir, "npm-app");
    await runInit("npm-app", { cwd: tmpDir, packageManager: "npm" });
    const config = await fs.readJson(
      path.join(targetDir, "vcli.config.json")
    );
    expect(config.packageManager).toBe("npm");
  });

  it("scaffolds into cwd when name is omitted", async () => {
    await runInit(undefined, { cwd: tmpDir });
    expect(await fs.pathExists(path.join(tmpDir, "vcli.config.json"))).toBe(
      true
    );
  });

  it("fails on a non-empty directory", async () => {
    await fs.writeFile(path.join(tmpDir, "existing.txt"), "x");
    await expect(runInit(undefined, { cwd: tmpDir })).rejects.toBeInstanceOf(
      VcliError
    );
  });

  it("succeeds when target directory does not yet exist", async () => {
    const newDir = path.join(tmpDir, "brand-new");
    await runInit("brand-new", { cwd: tmpDir });
    expect(await fs.pathExists(newDir)).toBe(true);
  });

  it("succeeds when named target directory already exists but is empty", async () => {
    const emptyDir = path.join(tmpDir, "empty-existing");
    await fs.ensureDir(emptyDir);
    await expect(runInit("empty-existing", { cwd: tmpDir })).resolves.toBeUndefined();
  });
});
