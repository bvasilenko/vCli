// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import fse from "fs-extra";

await fse.copy("src/template/files", "dist/templates/default");
await fse.copy(
  "src/template/files-vblocks-marketing",
  "dist/templates/vblocks-marketing"
);

console.log("Templates copied to dist/templates/");
