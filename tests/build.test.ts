import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";

vi.mock("../src/utils/log.js", () => ({
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
  spinner: vi.fn(() => ({ succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() })),
}));

vi.mock("@booga/vssg", () => ({
  generate: vi.fn().mockResolvedValue(undefined),
  defineConfig: (c: unknown) => c,
}));

import { runBuild } from "../src/commands/build.js";
import { VcliError } from "../src/utils/exit.js";

describe("build command", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-build-"));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("calls generate() with the loaded config object", async () => {
    const { generate } = await import("@booga/vssg");
    const configContent = `export default { srcDir: 'content', outDir: 'out', routes: '**/*.mdx' };`;
    const configPath = path.join(tmpDir, "vssg.config.js");
    await fs.writeFile(configPath, configContent);

    await runBuild({ cwd: tmpDir });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        srcDir: path.join(tmpDir, "content"),
        outDir: path.join(tmpDir, "out"),
      })
    );
  });

  it("uses --config path when provided", async () => {
    const { generate } = await import("@booga/vssg");
    const configContent = `export default { srcDir: 'src', outDir: 'dist', routes: '**/*.mdx' };`;
    const configPath = path.join(tmpDir, "custom.config.js");
    await fs.writeFile(configPath, configContent);

    await runBuild({ config: "custom.config.js", cwd: tmpDir });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        srcDir: path.join(tmpDir, "src"),
        outDir: path.join(tmpDir, "dist"),
      })
    );
  });

  it("fails when config file does not exist", async () => {
    await expect(runBuild({ cwd: tmpDir })).rejects.toBeInstanceOf(VcliError);
  });

  it("resolves publicDir to an absolute path", async () => {
    const { generate } = await import("@booga/vssg");
    const configContent = `export default { srcDir: 'content', outDir: 'out', publicDir: 'public', routes: '**/*.mdx' };`;
    await fs.writeFile(path.join(tmpDir, "vssg.config.js"), configContent);

    await runBuild({ cwd: tmpDir });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        publicDir: path.join(tmpDir, "public"),
      })
    );
  });

  it("passes config keys without path semantics through unmodified", async () => {
    const { generate } = await import("@booga/vssg");
    const configContent = `export default { srcDir: 'content', outDir: 'out', routes: '**/*.mdx', baseUrl: '/docs/' };`;
    await fs.writeFile(path.join(tmpDir, "vssg.config.js"), configContent);

    await runBuild({ cwd: tmpDir });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "/docs/" })
    );
  });

  it("uses module namespace when config file has no default export", async () => {
    const { generate } = await import("@booga/vssg");
    const configContent = `export const srcDir = 'content'; export const outDir = 'out'; export const routes = '**/*.mdx';`;
    await fs.writeFile(path.join(tmpDir, "vssg.config.js"), configContent);

    await runBuild({ cwd: tmpDir });

    expect(generate).toHaveBeenCalled();
  });
});
