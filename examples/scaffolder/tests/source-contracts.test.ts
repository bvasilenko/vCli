import { expect, test } from "./scaffolder-fixtures.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

const SOURCE_CONTRACT_DIRS = [
  "examples/scaffolder/src",
  "src/template/files-scaffold/src",
] as const;

const LEAF_CSS_PATTERNS = [
  /#[0-9A-Fa-f]{3,8}/,
  /font-family\s*:/,
  /fontFamily\s*:/,
  /font-size\s*:\s*[0-9]/,
  /fontSize\s*:\s*["']?[0-9]/,
  /padding\s*:\s*["']?[0-9]/,
] as const;

async function sourceFiles(dir: string): Promise<string[]> {
  const absoluteDir = path.join(ROOT_DIR, dir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(relativePath);
      return /\.(css|jsx|tsx?|html)$/.test(entry.name) ? [relativePath] : [];
    })
  );
  return nested.flat();
}

test("scaffolder source keeps leaf styling literals out of hosted and generated leaves", async () => {
  const files = (await Promise.all(SOURCE_CONTRACT_DIRS.map(sourceFiles))).flat();
  const violations: string[] = [];

  for (const file of files) {
    const content = await fs.readFile(path.join(ROOT_DIR, file), "utf-8");
    for (const pattern of LEAF_CSS_PATTERNS) {
      if (pattern.test(content)) violations.push(`${file} :: ${pattern.source}`);
    }
  }

  expect(violations).toEqual([]);
});
