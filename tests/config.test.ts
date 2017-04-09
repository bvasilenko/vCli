import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { VcliConfigSchema, loadConfig, saveConfig } from "../src/config.js";

describe("VcliConfigSchema", () => {
  it("applies all defaults when input is empty", () => {
    const config = VcliConfigSchema.parse({});
    expect(config.registry).toMatch(/^https:\/\//);
    expect(config.componentsDir).toBe("src/components");
    expect(config.packageManager).toBe("bun");
  });

  it("preserves an explicit full override without applying defaults", () => {
    const config = VcliConfigSchema.parse({
      registry: "https://example.com/registry.json",
      componentsDir: "lib/ui",
      packageManager: "yarn",
    });
    expect(config.registry).toBe("https://example.com/registry.json");
    expect(config.componentsDir).toBe("lib/ui");
    expect(config.packageManager).toBe("yarn");
  });

  it("rejects a non-URL registry value", () => {
    expect(() => VcliConfigSchema.parse({ registry: "not-a-url" })).toThrow();
  });

  it("rejects an unsupported packageManager value", () => {
    expect(() =>
      VcliConfigSchema.parse({ packageManager: "deno" })
    ).toThrow();
  });

  it("rejects unknown keys (strict mode)", () => {
    expect(() =>
      VcliConfigSchema.parse({ unknownField: true })
    ).toThrow();
  });

  it("accepts each supported packageManager value", () => {
    for (const pm of ["bun", "pnpm", "npm", "yarn"] as const) {
      expect(() => VcliConfigSchema.parse({ packageManager: pm })).not.toThrow();
    }
  });
});

describe("loadConfig + saveConfig", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-config-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("returns schema defaults when no config file is present", async () => {
    const config = await loadConfig(tmpDir);
    expect(config.packageManager).toBe("bun");
    expect(config.componentsDir).toBe("src/components");
    expect(config.registry).toMatch(/^https:\/\//);
  });

  it("merges a partial config file with schema defaults", async () => {
    await fs.writeJson(path.join(tmpDir, "vcli.config.json"), {
      packageManager: "pnpm",
    });
    const config = await loadConfig(tmpDir);
    expect(config.packageManager).toBe("pnpm");
    expect(config.componentsDir).toBe("src/components");
  });

  it("throws when config file contains an unknown key", async () => {
    await fs.writeJson(path.join(tmpDir, "vcli.config.json"), {
      unrecognised: true,
    });
    await expect(loadConfig(tmpDir)).rejects.toThrow();
  });

  it("round-trips through saveConfig without data loss", async () => {
    const original = VcliConfigSchema.parse({
      packageManager: "npm",
      componentsDir: "widgets",
      registry: "https://example.com/reg.json",
    });
    await saveConfig(tmpDir, original);
    const reloaded = await loadConfig(tmpDir);
    expect(reloaded).toEqual(original);
  });

  it("saveConfig writes valid JSON that can be read back by fs.readJson", async () => {
    const config = VcliConfigSchema.parse({});
    await saveConfig(tmpDir, config);
    const raw = await fs.readJson(path.join(tmpDir, "vcli.config.json"));
    expect(raw).toMatchObject({ packageManager: "bun" });
  });
});
