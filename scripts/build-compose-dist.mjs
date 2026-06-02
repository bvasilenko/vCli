// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { existsSync } from "node:fs";
import fse from "fs-extra";
import { execa } from "execa";

const COMPOSE_UI_DIR = "compose-ui";
const COMPOSE_DIST_SRC = "compose-ui/dist";
const COMPOSE_DIST_DEST = "compose-dist";

if (!existsSync(`${COMPOSE_UI_DIR}/node_modules`)) {
  await execa("bun", ["install"], { cwd: COMPOSE_UI_DIR, stdio: "inherit" });
}

await execa("bun", ["run", "build"], { cwd: COMPOSE_UI_DIR, stdio: "inherit" });

await fse.remove(COMPOSE_DIST_DEST);
await fse.copy(COMPOSE_DIST_SRC, COMPOSE_DIST_DEST);
console.log(`compose-dist/ built (${COMPOSE_DIST_DEST})`);
