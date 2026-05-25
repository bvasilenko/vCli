// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { stripSpdxFromAll, addSpdxToAll } from "../scripts/history-shape/spdx.ts";
import { SPDX_HEADER_LINES } from "../scripts/history-shape/config.ts";

const LINE_1 = SPDX_HEADER_LINES[0];
const LINE_2 = SPDX_HEADER_LINES[1];
const SPDX_BLOCK = LINE_1 + "\n" + LINE_2 + "\n";

async function write(root: string, rel: string, content: string): Promise<void> {
  const full = path.join(root, rel);
  await fs.ensureDir(path.dirname(full));
  await fs.writeFile(full, content, "utf8");
}

async function read(root: string, rel: string): Promise<string> {
  return fs.readFile(path.join(root, rel), "utf8");
}

describe("stripSpdxFromAll", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-strip-"));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it("returns 0 and touches nothing when the file list is empty", async () => {
    const count = await stripSpdxFromAll(root, []);
    expect(count).toBe(0);
  });

  it("returns 1 and removes the SPDX block from a file that starts with it", async () => {
    await write(root, "a.ts", SPDX_BLOCK + "export {};\n");
    const count = await stripSpdxFromAll(root, ["a.ts"]);
    expect(count).toBe(1);
    expect(await read(root, "a.ts")).toBe("export {};\n");
  });

  it("returns 0 and leaves unchanged a file with no SPDX header", async () => {
    const original = "export const x = 1;\n";
    await write(root, "b.ts", original);
    const count = await stripSpdxFromAll(root, ["b.ts"]);
    expect(count).toBe(0);
    expect(await read(root, "b.ts")).toBe(original);
  });

  it("strips only the header block — all content after it is preserved exactly", async () => {
    const body = "const multiline = true;\n// a comment\nexport default {};\n";
    await write(root, "c.ts", SPDX_BLOCK + body);
    await stripSpdxFromAll(root, ["c.ts"]);
    expect(await read(root, "c.ts")).toBe(body);
  });

  it("is idempotent: a second strip call on an already-stripped file returns 0", async () => {
    await write(root, "d.ts", SPDX_BLOCK + "export {};\n");
    await stripSpdxFromAll(root, ["d.ts"]);
    const count = await stripSpdxFromAll(root, ["d.ts"]);
    expect(count).toBe(0);
  });

  it("does not strip when only the first SPDX line is present", async () => {
    const content = LINE_1 + "\nexport {};\n";
    await write(root, "e.ts", content);
    const count = await stripSpdxFromAll(root, ["e.ts"]);
    expect(count).toBe(0);
    expect(await read(root, "e.ts")).toBe(content);
  });

  it("does not strip a SPDX block that appears mid-file, not at position 0", async () => {
    const content = "export {};\n" + SPDX_BLOCK;
    await write(root, "f.ts", content);
    const count = await stripSpdxFromAll(root, ["f.ts"]);
    expect(count).toBe(0);
    expect(await read(root, "f.ts")).toBe(content);
  });

  it("processes multiple files and returns the count of actually modified ones", async () => {
    await write(root, "g.ts", SPDX_BLOCK + "g\n");
    await write(root, "h.ts", "no-spdx\n");
    await write(root, "i.ts", SPDX_BLOCK + "i\n");
    const count = await stripSpdxFromAll(root, ["g.ts", "h.ts", "i.ts"]);
    expect(count).toBe(2);
  });
});

describe("addSpdxToAll", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-add-spdx-"));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it("returns 0 and touches nothing when the file list is empty", async () => {
    const count = await addSpdxToAll(root, []);
    expect(count).toBe(0);
  });

  it("returns 1 and prepends the SPDX block to a file without it", async () => {
    await write(root, "a.ts", "export {};\n");
    const count = await addSpdxToAll(root, ["a.ts"]);
    expect(count).toBe(1);
    expect(await read(root, "a.ts")).toBe(SPDX_BLOCK + "export {};\n");
  });

  it("is idempotent: adding to a file that already has the header returns 0", async () => {
    await write(root, "b.ts", SPDX_BLOCK + "export {};\n");
    const count = await addSpdxToAll(root, ["b.ts"]);
    expect(count).toBe(0);
  });

  it("preserves all original content after the prepended header", async () => {
    const body = "const x = 42;\nexport default x;\n";
    await write(root, "c.ts", body);
    await addSpdxToAll(root, ["c.ts"]);
    const result = await read(root, "c.ts");
    expect(result.endsWith(body)).toBe(true);
  });

  it("result starts with the exact two-line SPDX block", async () => {
    await write(root, "d.ts", "export {};\n");
    await addSpdxToAll(root, ["d.ts"]);
    const result = await read(root, "d.ts");
    expect(result.startsWith(SPDX_BLOCK)).toBe(true);
  });

  it("processes multiple files and returns the count of actually modified ones", async () => {
    await write(root, "e.ts", "no-spdx\n");
    await write(root, "f.ts", SPDX_BLOCK + "already\n");
    await write(root, "g.ts", "also-no-spdx\n");
    const count = await addSpdxToAll(root, ["e.ts", "f.ts", "g.ts"]);
    expect(count).toBe(2);
  });
});

describe("strip → add round-trip", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "vcli-roundtrip-"));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it("stripping then adding on a SPDX-bearing file yields byte-identical content", async () => {
    const original = SPDX_BLOCK + "export const value = 42;\n";
    await write(root, "a.ts", original);
    await stripSpdxFromAll(root, ["a.ts"]);
    await addSpdxToAll(root, ["a.ts"]);
    expect(await read(root, "a.ts")).toBe(original);
  });

  it("adding then stripping on a non-SPDX file yields byte-identical content", async () => {
    const original = "export const x = 1;\n";
    await write(root, "b.ts", original);
    await addSpdxToAll(root, ["b.ts"]);
    await stripSpdxFromAll(root, ["b.ts"]);
    expect(await read(root, "b.ts")).toBe(original);
  });

  it("a file not in the operated list is never touched during strip or add", async () => {
    const sentinel = "untouched content\n";
    await write(root, "operated.ts", SPDX_BLOCK + "code\n");
    await write(root, "bystander.ts", sentinel);
    await stripSpdxFromAll(root, ["operated.ts"]);
    await addSpdxToAll(root, ["operated.ts"]);
    expect(await read(root, "bystander.ts")).toBe(sentinel);
  });
});
