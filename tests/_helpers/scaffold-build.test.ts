// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect } from "vitest";
import path from "node:path";

import {
  DEMO_NODE_MODULES,
  VITE_BIN,
  TEMPLATE_ROOT,
  templateSourceDir,
  scaffoldNodeModulesLink,
  scaffoldDistDir,
} from "./scaffold-build.js";

describe("templateSourceDir — naming convention", () => {
  it("maps 'default' to the files-default directory name", () => {
    expect(path.basename(templateSourceDir("default"))).toBe("files-default");
  });

  it("maps 'blank' to the files-blank directory name", () => {
    expect(path.basename(templateSourceDir("blank"))).toBe("files-blank");
  });

  it("maps any arbitrary name to the files-<name> directory", () => {
    expect(path.basename(templateSourceDir("custom-foo"))).toBe("files-custom-foo");
  });

  it("places every template directory directly inside TEMPLATE_ROOT", () => {
    expect(path.dirname(templateSourceDir("default"))).toBe(TEMPLATE_ROOT);
    expect(path.dirname(templateSourceDir("blank"))).toBe(TEMPLATE_ROOT);
  });

  it("returns an absolute path regardless of template name", () => {
    expect(path.isAbsolute(templateSourceDir("default"))).toBe(true);
    expect(path.isAbsolute(templateSourceDir("blank"))).toBe(true);
  });

  it("two distinct template names produce two distinct paths", () => {
    expect(templateSourceDir("default")).not.toBe(templateSourceDir("blank"));
  });
});

describe("scaffoldDistDir — output directory contract", () => {
  it("appends 'dist' as the final path segment", () => {
    expect(path.basename(scaffoldDistDir("/tmp/my-scaffold"))).toBe("dist");
  });

  it("parent of the returned path is the supplied scaffoldDir", () => {
    const scaffoldDir = "/tmp/my-scaffold";
    expect(path.dirname(scaffoldDistDir(scaffoldDir))).toBe(scaffoldDir);
  });

  it("returns an absolute path when scaffoldDir is absolute", () => {
    expect(path.isAbsolute(scaffoldDistDir("/tmp/test"))).toBe(true);
  });

  it("different scaffoldDirs produce different distDirs", () => {
    expect(scaffoldDistDir("/tmp/a")).not.toBe(scaffoldDistDir("/tmp/b"));
  });
});

describe("scaffoldNodeModulesLink — symlink target contract", () => {
  it("appends 'node_modules' as the final path segment", () => {
    expect(path.basename(scaffoldNodeModulesLink("/tmp/my-scaffold"))).toBe("node_modules");
  });

  it("parent of the returned path is the supplied scaffoldDir", () => {
    const scaffoldDir = "/tmp/my-scaffold";
    expect(path.dirname(scaffoldNodeModulesLink(scaffoldDir))).toBe(scaffoldDir);
  });

  it("returns an absolute path when scaffoldDir is absolute", () => {
    expect(path.isAbsolute(scaffoldNodeModulesLink("/tmp/test"))).toBe(true);
  });

  it("different scaffoldDirs produce different link paths", () => {
    expect(scaffoldNodeModulesLink("/tmp/a")).not.toBe(scaffoldNodeModulesLink("/tmp/b"));
  });
});

describe("TEMPLATE_ROOT — repository layout contract", () => {
  it("is an absolute path", () => {
    expect(path.isAbsolute(TEMPLATE_ROOT)).toBe(true);
  });

  it("final path segment is 'template'", () => {
    expect(path.basename(TEMPLATE_ROOT)).toBe("template");
  });
});

describe("DEMO_NODE_MODULES — dependency lock contract", () => {
  it("is an absolute path", () => {
    expect(path.isAbsolute(DEMO_NODE_MODULES)).toBe(true);
  });

  it("final path segment is 'node_modules'", () => {
    expect(path.basename(DEMO_NODE_MODULES)).toBe("node_modules");
  });

  it("is located inside the demo workspace directory", () => {
    expect(path.basename(path.dirname(DEMO_NODE_MODULES))).toBe("demo");
  });
});

describe("VITE_BIN — build tool contract", () => {
  it("is an absolute path", () => {
    expect(path.isAbsolute(VITE_BIN)).toBe(true);
  });

  it("final path segment is 'vite'", () => {
    expect(path.basename(VITE_BIN)).toBe("vite");
  });

  it("is nested inside DEMO_NODE_MODULES", () => {
    expect(VITE_BIN.startsWith(DEMO_NODE_MODULES + path.sep)).toBe(true);
  });
});
