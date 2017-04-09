import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { runBuild } from "../src/commands/build.js";

const DEMO_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../demo"
);
const OUT_DIR = path.join(DEMO_DIR, "out");

describe("demo build", () => {
  beforeAll(async () => {
    await fs.remove(OUT_DIR);
    await runBuild({ config: "vssg.config.js", cwd: DEMO_DIR });
  }, 60_000);

  it("emits demo/out/index.html", async () => {
    expect(await fs.pathExists(path.join(OUT_DIR, "index.html"))).toBe(true);
  });

  it("html contains a link to semantic.css", async () => {
    const html = await fs.readFile(path.join(OUT_DIR, "index.html"), "utf-8");
    expect(html).toMatch(/semantic\.css/);
  });

  it("semantic.css is present and non-empty", async () => {
    const cssPath = path.join(OUT_DIR, "semantic.css");
    expect(await fs.pathExists(cssPath)).toBe(true);
    const css = await fs.readFile(cssPath, "utf-8");
    expect(css.trim().length).toBeGreaterThan(0);
  });

  it("vBlocks styles.css is copied to out/ via publicDir", async () => {
    expect(
      await fs.pathExists(path.join(OUT_DIR, "styles.css"))
    ).toBe(true);
  });

  it("html contains section elements (vBlocks components rendered)", async () => {
    const html = await fs.readFile(path.join(OUT_DIR, "index.html"), "utf-8");
    const sectionMatches = html.match(/<section/g) ?? [];
    expect(sectionMatches.length).toBeGreaterThanOrEqual(4);
  });
});
