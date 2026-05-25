// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import path from "node:path";
import { lintGlob } from "@booga/vlint";
import { log } from "../utils/log.js";
import { fail } from "../utils/exit.js";

export interface CheckOptions {
  cwd?: string;
}

interface Diagnostic {
  file: string;
  line: number;
  column: number;
  ruleId: string;
  message: string;
  severity: "error" | "warn";
}

interface LintResult {
  file: string;
  diagnostics: Diagnostic[];
}

export async function runCheck(opts: CheckOptions = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const globPattern = path.join(cwd, "src", "**", "*.{tsx,ts}");

  const results = (await lintGlob(globPattern)) as LintResult[];

  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];

  for (const result of results) {
    for (const d of result.diagnostics) {
      if (d.severity === "error") {
        errors.push(d);
        log.error(`${d.file}:${d.line}:${d.column} [${d.ruleId}] ${d.message}`);
      } else {
        warnings.push(d);
        log.warn(`${d.file}:${d.line}:${d.column} [${d.ruleId}] ${d.message}`);
      }
    }
  }

  if (errors.length > 0) {
    fail(
      `${errors.length} error(s), ${warnings.length} warning(s) found.`,
      1
    );
  }

  if (warnings.length > 0) {
    log.warn(`${warnings.length} warning(s) found.`);
    return;
  }

  log.success("No lint issues.");
}
