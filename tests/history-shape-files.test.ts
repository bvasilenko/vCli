// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import {
  findAuthoredSourceFiles,
  findSpdxBearingFiles,
} from "../scripts/history-shape/files.ts";
import {
  EXCLUDED_DIRNAMES,
  EXCLUDED_PATH_PREFIXES,
  SPDX_HEADER_LINES,
} from "../scripts/history-shape/config.ts";

const SPDX_BLOCK =
  SPDX_HEADER_LINES[0] + "\n" + SPDX_HEADER_LINES[1] + "\nexport {};\n";

async function touch(root: string, relative: string, content = ""): Promise<void> {
  const full = path.join(root, relative);
  await fs.ensureDir(path.dirname(full));
  await fs.writeFile(full, content, "utf8");
}

describe("findAuthoredSourceFiles", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-files-"));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  describe("extension filtering", () => {
    it("returns .ts files", async () => {
      await touch(root, "a.ts");
      expect(await findAuthoredSourceFiles(root)).toContain("a.ts");
    });

    it("returns .tsx files", async () => {
      await touch(root, "b.tsx");
      expect(await findAuthoredSourceFiles(root)).toContain("b.tsx");
    });

    it("returns .js files", async () => {
      await touch(root, "c.js");
      expect(await findAuthoredSourceFiles(root)).toContain("c.js");
    });

    it("returns .mjs files", async () => {
      await touch(root, "e.mjs");
      expect(await findAuthoredSourceFiles(root)).toContain("e.mjs");
    });

    it("returns .css files", async () => {
      await touch(root, "d.css");
      expect(await findAuthoredSourceFiles(root)).toContain("d.css");
    });

    it("excludes non-authored extensions: .md, .json, .txt, .png", async () => {
      await touch(root, "README.md");
      await touch(root, "package.json");
      await touch(root, "notes.txt");
      await touch(root, "image.png");
      const result = await findAuthoredSourceFiles(root);
      expect(result).toHaveLength(0);
    });

    it("empty directory yields empty result", async () => {
      expect(await findAuthoredSourceFiles(root)).toHaveLength(0);
    });
  });

  describe("directory exclusions by dirname", () => {
    it.each([...EXCLUDED_DIRNAMES])(
      "excludes files inside '%s/' directory",
      async (dirname) => {
        await touch(root, `${dirname}/some.ts`);
        expect(await findAuthoredSourceFiles(root)).toHaveLength(0);
      },
    );

    it("excludes deeply nested files when an ancestor dirname is excluded", async () => {
      await touch(root, "node_modules/pkg/src/index.ts");
      expect(await findAuthoredSourceFiles(root)).toHaveLength(0);
    });

    it("does not exclude a file whose non-dirname path segment matches an excluded dirname", async () => {
      await touch(root, "src/dist-utils.ts");
      const result = await findAuthoredSourceFiles(root);
      expect(result).toContain("src/dist-utils.ts");
    });
  });

  describe("path prefix exclusions", () => {
    it.each([...EXCLUDED_PATH_PREFIXES])(
      "excludes files under prefix '%s'",
      async (prefix) => {
        await touch(root, `${prefix}file.ts`);
        expect(await findAuthoredSourceFiles(root)).toHaveLength(0);
      },
    );

    it.each([...EXCLUDED_PATH_PREFIXES])(
      "excludes files directly inside '%s/' directory",
      async (prefix) => {
        await touch(root, `${prefix}/file.ts`);
        expect(await findAuthoredSourceFiles(root)).toHaveLength(0);
      },
    );

    it.each([...EXCLUDED_PATH_PREFIXES])(
      "excludes files inside a hyphenated variant '%s-<name>/' directory",
      async (prefix) => {
        await touch(root, `${prefix}-variant/file.ts`);
        expect(await findAuthoredSourceFiles(root)).toHaveLength(0);
      },
    );

    it.each([...EXCLUDED_PATH_PREFIXES])(
      "excludes deeply nested files inside any '%s*/' directory tree",
      async (prefix) => {
        await touch(root, `${prefix}-variant/src/components/widget.ts`);
        expect(await findAuthoredSourceFiles(root)).toHaveLength(0);
      },
    );

    it("includes files in directories that share a prefix name but are not the excluded prefix", async () => {
      await touch(root, "src/template/other.ts");
      const result = await findAuthoredSourceFiles(root);
      expect(result).toContain("src/template/other.ts");
    });
  });

  describe("recursive traversal", () => {
    it("finds files in nested subdirectories", async () => {
      await touch(root, "src/commands/add.ts");
      await touch(root, "src/utils/log.ts");
      const result = await findAuthoredSourceFiles(root);
      expect(result).toContain("src/commands/add.ts");
      expect(result).toContain("src/utils/log.ts");
    });

    it("finds files at any nesting depth alongside the root level", async () => {
      await touch(root, "root.ts");
      await touch(root, "a/b/c/deep.ts");
      const result = await findAuthoredSourceFiles(root);
      expect(result).toContain("root.ts");
      expect(result).toContain("a/b/c/deep.ts");
    });
  });

  describe("ordering and path format", () => {
    it("returns results in stable lexicographic order", async () => {
      await touch(root, "z.ts");
      await touch(root, "a.ts");
      await touch(root, "m.ts");
      const result = await findAuthoredSourceFiles(root);
      expect(result).toEqual(["a.ts", "m.ts", "z.ts"]);
    });

    it("uses forward slashes in relative paths on all platforms", async () => {
      await touch(root, "src/index.ts");
      const result = await findAuthoredSourceFiles(root);
      expect(result.every((p) => !p.includes("\\"))).toBe(true);
    });
  });
});

describe("findSpdxBearingFiles", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-spdx-detect-"));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  describe("positive detection", () => {
    it("returns a file whose first two lines are the exact SPDX header block", async () => {
      await touch(root, "licensed.ts", SPDX_BLOCK);
      expect(await findSpdxBearingFiles(root)).toContain("licensed.ts");
    });

    it("is not confused by trailing whitespace on the header lines", async () => {
      const content =
        SPDX_HEADER_LINES[0] + "   \n" + SPDX_HEADER_LINES[1] + "  \ncode\n";
      await touch(root, "padded.ts", content);
      expect(await findSpdxBearingFiles(root)).toContain("padded.ts");
    });
  });

  describe("negative detection", () => {
    it("excludes a file with no SPDX header", async () => {
      await touch(root, "unlicensed.ts", "export const x = 1;\n");
      expect(await findSpdxBearingFiles(root)).not.toContain("unlicensed.ts");
    });

    it("excludes an empty file", async () => {
      await touch(root, "empty.ts", "");
      expect(await findSpdxBearingFiles(root)).toHaveLength(0);
    });

    it("excludes a file with only the first SPDX line", async () => {
      await touch(root, "partial.ts", SPDX_HEADER_LINES[0] + "\nexport {};\n");
      expect(await findSpdxBearingFiles(root)).not.toContain("partial.ts");
    });

    it("excludes a file with only the second SPDX line at the start", async () => {
      await touch(root, "partial.ts", SPDX_HEADER_LINES[1] + "\nexport {};\n");
      expect(await findSpdxBearingFiles(root)).not.toContain("partial.ts");
    });

    it("excludes a file where the SPDX block is preceded by a blank line", async () => {
      await touch(root, "shifted.ts", "\n" + SPDX_BLOCK);
      expect(await findSpdxBearingFiles(root)).not.toContain("shifted.ts");
    });

    it("excludes a file where the SPDX block appears mid-file, not at position 0", async () => {
      await touch(root, "mid.ts", "export {};\n" + SPDX_BLOCK);
      expect(await findSpdxBearingFiles(root)).not.toContain("mid.ts");
    });
  });

  describe("subset relationship", () => {
    it("every returned file also appears in findAuthoredSourceFiles", async () => {
      await touch(root, "a.ts", SPDX_BLOCK);
      await touch(root, "b.ts", "export {};\n");
      const authored = await findAuthoredSourceFiles(root);
      const spdx = await findSpdxBearingFiles(root);
      for (const f of spdx) {
        expect(authored).toContain(f);
      }
    });

    it("returns only SPDX-bearing files from a mixed set", async () => {
      await touch(root, "licensed.ts", SPDX_BLOCK);
      await touch(root, "unlicensed.ts", "export {};\n");
      const result = await findSpdxBearingFiles(root);
      expect(result).toContain("licensed.ts");
      expect(result).not.toContain("unlicensed.ts");
    });

    it("returns empty when no authored file carries a SPDX header", async () => {
      await touch(root, "a.ts", "export const a = 1;\n");
      await touch(root, "b.js", "module.exports = {};\n");
      expect(await findSpdxBearingFiles(root)).toHaveLength(0);
    });

    it.each([...EXCLUDED_PATH_PREFIXES])(
      "does not surface SPDX-bearing files located under excluded prefix '%s'",
      async (prefix) => {
        await touch(root, `${prefix}-variant/licensed.ts`, SPDX_BLOCK);
        expect(await findSpdxBearingFiles(root)).toHaveLength(0);
      },
    );
  });
});
