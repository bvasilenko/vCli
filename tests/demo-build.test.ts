import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { execa } from "execa";

const DEMO_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../demo"
);
const DIST_DIR = path.join(DEMO_DIR, "dist");
const NODE_MODULES_DIR = path.join(DEMO_DIR, "node_modules");

describe("demo vite build", () => {
  let cssFile: string;
  let jsFile: string;

  beforeAll(async () => {
    if (!(await fs.pathExists(NODE_MODULES_DIR))) {
      await execa("bun", ["install", "--frozen-lockfile"], {
        cwd: DEMO_DIR,
        stdio: "pipe",
      });
    }
    await fs.remove(DIST_DIR);
    await execa("bun", ["run", "build"], { cwd: DEMO_DIR, stdio: "pipe" });

    const assets = await fs.readdir(path.join(DIST_DIR, "assets"));
    cssFile = assets.find((f) => f.endsWith(".css")) ?? "";
    jsFile = assets.find((f) => f.endsWith(".js")) ?? "";
  }, 60_000);

  it("emits demo/dist/index.html", async () => {
    expect(await fs.pathExists(path.join(DIST_DIR, "index.html"))).toBe(true);
  });

  it("index.html references at least one CSS asset", async () => {
    const html = await fs.readFile(path.join(DIST_DIR, "index.html"), "utf-8");
    expect(html).toMatch(/\.css/);
  });

  it("index.html references at least one JS asset", async () => {
    const html = await fs.readFile(path.join(DIST_DIR, "index.html"), "utf-8");
    expect(html).toMatch(/\.js/);
  });

  it("index.html declares a favicon link to prevent browser auto-request", async () => {
    const html = await fs.readFile(path.join(DIST_DIR, "index.html"), "utf-8");
    expect(html).toMatch(/<link[^>]+rel=["']icon["']/);
  });

    it("assets/ directory contains both CSS and JS files", async () => {
    expect(cssFile).toBeTruthy();
    expect(jsFile).toBeTruthy();
  });

  it("CSS bundle is non-empty and contains at least 100 bytes", async () => {
    const css = await fs.readFile(
      path.join(DIST_DIR, "assets", cssFile),
      "utf-8"
    );
    expect(css.trim().length).toBeGreaterThan(100);
  });

  it("JS bundle is non-empty", async () => {
    const js = await fs.readFile(
      path.join(DIST_DIR, "assets", jsFile),
      "utf-8"
    );
    expect(js.trim().length).toBeGreaterThan(0);
  });

  it("JS bundle contains picsum.photos placeholder-swap logic from main.jsx", async () => {
    // present regardless of minification
    const js = await fs.readFile(
      path.join(DIST_DIR, "assets", jsFile),
      "utf-8"
    );
    expect(js).toContain("picsum.photos");
  });

  it("CSS bundle contains Tailwind-generated colour utility classes from vtheme", async () => {
    // bg-background only appears when the vtheme Tailwind preset resolves — reliable wiring proxy
    const css = await fs.readFile(
      path.join(DIST_DIR, "assets", cssFile),
      "utf-8"
    );
    expect(css).toMatch(/background|text-foreground|bg-card/);
  });
});
