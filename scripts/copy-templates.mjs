// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import fse from "fs-extra";

await fse.copy("src/template/files-default", "dist/templates/default");
await fse.copy(
  "src/template/files-blank",
  "dist/templates/blank"
);

await fse.copy("src/template/files-scaffold", "dist/templates/scaffold");

console.log("Templates copied to dist/templates/");
