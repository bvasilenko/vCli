// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readText(rel: string): Promise<string> {
  return fs.readFile(path.join(ROOT, rel), "utf-8");
}

function extractChangelogSection(changelog: string, version: string): string {
  const header = `## [${version}]`;
  const start = changelog.indexOf(header);
  if (start === -1) return "";
  const nextSectionMatch = changelog.slice(start + header.length).search(/\n## \[/);
  const end = nextSectionMatch === -1
    ? changelog.length
    : start + header.length + nextSectionMatch;
  return changelog.slice(start, end);
}

const EM_DASH = "—";
const PROHIBITED_FLAG = "--template=vblocks-marketing";

describe("voice gate — README.md", () => {
  let readme: string;
  let lines: string[];

  beforeAll(async () => {
    readme = await readText("README.md");
    lines = readme.split("\n");
  });

  it("file is non-empty", () => {
    expect(readme.trim().length).toBeGreaterThan(0);
  });

  it("contains no em-dashes", () => {
    expect(readme).not.toContain(EM_DASH);
  });

  it("contains no reference to the removed --template=vblocks-marketing flag", () => {
    expect(readme).not.toContain(PROHIBITED_FLAG);
  });

  it("npx @booga/vcli demo appears as the first CLI invocation in the file", () => {
    const firstCliLine = lines.find((line) => line.includes("npx ") || line.match(/`booga /));
    expect(firstCliLine).toBeTruthy();
    expect(firstCliLine).toContain("npx @booga/vcli demo");
  });

  it("shows booga init my-site with no --template flag as the default init path", () => {
    expect(readme).toMatch(/booga init my-site(?!\s*--template)/);
  });

  it("documents --template=blank as the power-user alternative", () => {
    expect(readme).toContain("--template=blank");
  });
});

describe("voice gate — package.json description", () => {
  let description: string;

  beforeAll(async () => {
    const pkg = await fs.readJson(path.join(ROOT, "package.json")) as { description: string };
    description = pkg.description;
  });

  it("description is present and non-empty", () => {
    expect(typeof description).toBe("string");
    expect(description.trim().length).toBeGreaterThan(0);
  });

  it("description contains no em-dashes", () => {
    expect(description).not.toContain(EM_DASH);
  });

  it("description contains no reference to the removed --template=vblocks-marketing flag", () => {
    expect(description).not.toContain(PROHIBITED_FLAG);
  });

  it("description leads with the GTM hook (zero-install demo or scaffold)", () => {
    expect(description.toLowerCase()).toMatch(/demo|scaffold/);
  });
});

describe("voice gate — CHANGELOG.md 0.1.3 entry", () => {
  let entry: string;

  beforeAll(async () => {
    const changelog = await readText("CHANGELOG.md");
    entry = extractChangelogSection(changelog, "0.1.3");
  });

  it("0.1.3 entry exists in CHANGELOG", () => {
    expect(entry.trim().length).toBeGreaterThan(0);
  });

  it("0.1.3 entry presents booga init as the default vBlocks scaffold command", () => {
    expect(entry).toMatch(/booga init/);
  });
});

describe("voice gate — .github/repo-about.md", () => {
  let repoAbout: string;

  beforeAll(async () => {
    repoAbout = await readText(".github/repo-about.md");
  });

  it("file is non-empty", () => {
    expect(repoAbout.trim().length).toBeGreaterThan(0);
  });

  it("contains no em-dashes", () => {
    expect(repoAbout).not.toContain(EM_DASH);
  });

  it("contains no reference to the removed --template=vblocks-marketing flag", () => {
    expect(repoAbout).not.toContain(PROHIBITED_FLAG);
  });
});

describe("voice gate — CHANGELOG.md (full document)", () => {
  let changelog: string;

  beforeAll(async () => {
    changelog = await readText("CHANGELOG.md");
  });

  it("no em-dashes anywhere in the document (all sections, all versions)", () => {
    expect(changelog).not.toContain(EM_DASH);
  });

  it("no --template=vblocks-marketing references anywhere in the document (all sections, all versions)", () => {
    expect(changelog).not.toContain(PROHIBITED_FLAG);
  });
});
