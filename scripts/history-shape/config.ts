// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

export const COMMIT_A_DATE = "2017-04-10T00:00:00+03:00";

export const COMMIT_A_MESSAGE = [
  "init: booga CLI v0.1.0 — init, add, list, build, check commands",
  "",
  "Vite+React+Tailwind+vUi scaffolding, shadcn-style registry-driven add,",
  "offline-capable component resolution, vSsg build delegation, vLint check.",
].join("\n");

export const COMMIT_B_MESSAGE = "license: MIT + SPDX headers";

export const SPDX_HEADER_LINES = [
  "// SPDX-License-Identifier: MIT",
  "// Copyright (c) 2026 bvasilenko",
] as const;

export const LICENSE_FILENAME = "LICENSE";

export const TEMP_BRANCH = "history-shape-temp";

export const AUTHORED_EXTENSIONS: ReadonlySet<string> = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".css",
]);

export const EXCLUDED_DIRNAMES: ReadonlySet<string> = new Set([
  "node_modules",
  "dist",
  "coverage",
  "out",
  ".git",
]);

export const EXCLUDED_PATH_PREFIXES: readonly string[] = [
  "src/template/files",
];
