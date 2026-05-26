import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { glob } from "glob";

const TEMPLATES_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/template"
);

const DONOR_PATTERNS: RegExp[] = [
  /alexy-os/i,
  /delta5-hq/i,
  /quant5-lab/i,
  /github\.com\/alexy-os/i,
  /github\.com\/delta5-hq/i,
  /github\.com\/quant5-lab/i,
  /ui8kit/i,
  /buildy-ui/i,
  /ui\.buildy\.tw/i,
  /hinddy\/tailwind-builder/i,
  /ruvnet\/ruflo/i,
  /TauricResearch\/TradingAgents/,
  /\/tmp\/donors\//,
  /@buildy\//,
  /@editory\//,
];

const VOICE_PATTERNS: RegExp[] = [
  /PixiJS/,
  /RxDB/,
  /Wireflow/,
  /kien game/,
  /generic graph agent/,
];

async function collectFilesIn(dir: string): Promise<string[]> {
  const matches = await glob("**/*", { cwd: dir, nodir: true, dot: true });
  return matches.map((f) => path.join(dir, f));
}

async function findViolations(
  filePaths: string[],
  patterns: RegExp[]
): Promise<string[]> {
  const violations: string[] = [];
  for (const filePath of filePaths) {
    const content = await fs.readFile(filePath, "utf-8").catch(() => "");
    for (const pattern of patterns) {
      if (new RegExp(pattern.source, "gim").test(content)) {
        const rel = path.relative(TEMPLATES_ROOT, filePath);
        violations.push(`${rel}: matched /${pattern.source}/`);
      }
    }
  }
  return violations;
}

// ─── Template directories under test ─────────────────────────────────────────

const TEMPLATE_DIRS: Array<{ name: string; dir: string }> = [
  { name: "default", dir: path.join(TEMPLATES_ROOT, "files") },
  {
    name: "vblocks-marketing",
    dir: path.join(TEMPLATES_ROOT, "files-vblocks-marketing"),
  },
];

for (const { name, dir } of TEMPLATE_DIRS) {
  describe(`Gate 4 — donor leak check (${name} template)`, () => {
    let files: string[];

    beforeAll(async () => {
      files = await collectFilesIn(dir);
    });

    it("template directory contains at least one file (glob is not vacuously passing)", async () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it("no donor-origin patterns present in any file", async () => {
      const violations = await findViolations(files, DONOR_PATTERNS);
      expect(violations).toEqual([]);
    });
  });

  describe(`Gate 5 — voice leak check (${name} template)`, () => {
    let files: string[];

    beforeAll(async () => {
      files = await collectFilesIn(dir);
    });

    it("no literal avatar example phrases present in any file", async () => {
      const violations = await findViolations(files, VOICE_PATTERNS);
      expect(violations).toEqual([]);
    });
  });
}
