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

describe("add idempotency", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-add-idem-"));
    vi.clearAllMocks();
    vi.mocked(fetchModule.fetchRegistry).mockResolvedValue(localRegistry);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("errors on second run without --force", async () => {
    await runAdd(["hero-split"], { cwd: tmpDir });
    await expect(
      runAdd(["hero-split"], { cwd: tmpDir })
    ).rejects.toBeInstanceOf(VcliError);
  });

  it("succeeds on second run with --force", async () => {
    await runAdd(["hero-split"], { cwd: tmpDir });
    await expect(
      runAdd(["hero-split"], { cwd: tmpDir, force: true })
    ).resolves.toBeUndefined();
  });

  it("preserves file content on overwrite — stub is idempotent", async () => {
    await runAdd(["hero-split"], { cwd: tmpDir });
    const stubPath = path.join(tmpDir, "src", "components", "HeroSplit.tsx");
    const before = await fs.readFile(stubPath, "utf-8");

    await runAdd(["hero-split"], { cwd: tmpDir, force: true });
    const after = await fs.readFile(stubPath, "utf-8");
    expect(after).toBe(before);
  });

  it("stops at the first conflict in a multi-component add — does not partially write", async () => {
    await runAdd(["hero-split"], { cwd: tmpDir });

    await expect(
      runAdd(["hero-split", "cta-split"], { cwd: tmpDir })
    ).rejects.toBeInstanceOf(VcliError);

    expect(
      await fs.pathExists(path.join(tmpDir, "src", "components", "CtaSplit.tsx"))
    ).toBe(false);
  });

  it("includes the conflicting filename in the error message", async () => {
    await runAdd(["hero-split"], { cwd: tmpDir });
    await expect(
      runAdd(["hero-split"], { cwd: tmpDir })
    ).rejects.toThrow("HeroSplit.tsx");
  });
});
