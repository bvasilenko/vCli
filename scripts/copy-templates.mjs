// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import fse from "fs-extra";

await fse.copy("src/template/files-default", "dist/templates/default");
await fse.copy(
  "src/template/files-blank",
  "dist/templates/blank"
);

console.log("Templates copied to dist/templates/");
