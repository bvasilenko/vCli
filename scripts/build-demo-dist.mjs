// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import fse from "fs-extra";
import { execa } from "execa";

const TEMPLATE_SRC = "src/template/files-vblocks-marketing/src";
const DEMO_SRC = "demo/src";
const DEMO_DIST_SRC = "demo/dist";
const DEMO_DIST_DEST = "demo-dist";

await fse.copy(TEMPLATE_SRC, DEMO_SRC, { overwrite: true });
console.log(`Synced ${TEMPLATE_SRC} → ${DEMO_SRC}`);

await execa("bun", ["run", "build"], { cwd: "demo", stdio: "inherit" });

await fse.remove(DEMO_DIST_DEST);
await fse.copy(DEMO_DIST_SRC, DEMO_DIST_DEST);
console.log(`demo-dist/ built (${DEMO_DIST_DEST})`);
