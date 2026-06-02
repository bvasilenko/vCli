// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { readFileSync } from "node:fs";
import { Command } from "commander";
import { VcliError } from "./utils/exit.js";
import { runInit } from "./commands/init.js";
import { runAdd } from "./commands/add.js";
import { runList } from "./commands/list.js";
import { runBuild } from "./commands/build.js";
import { runCheck } from "./commands/check.js";
import { runDemo } from "./commands/demo.js";
import { runScaffold } from "./commands/scaffold.js";
import { runCompose } from "./commands/compose.js";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
) as { version: string };

async function run(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const isVcliError = err instanceof VcliError;
    const message = isVcliError ? err.message : String(err);
    const code = isVcliError ? err.code : 1;
    process.stderr.write(JSON.stringify({ error: message, code }) + "\n");
    process.exit(code);
  }
}

const program = new Command()
  .name("booga")
  .description("vsuite component CLI")
  .version(version)
  .option("--offline", "skip CDN fetch and use locally installed registry", false);

program
  .command("demo")
  .description("serve the bundled vBlocks marketing demo (zero install)")
  .option("--no-open", "skip opening the browser (CI / headless mode)")
  .option("--port <number>", "port to listen on (default: random free port)")
  .action((opts: { open: boolean; port?: string }) =>
    run(() =>
      runDemo({
        noOpen: !opts.open,
        port: opts.port !== undefined ? parseInt(opts.port, 10) : undefined,
      })
    )
  );

program
  .command("init [name]")
  .description("scaffold a Vite+React+Tailwind+vUi project")
  .option("--package-manager <pm>", "package manager to use", "bun")
  .option(
    "--template <name>",
    "project template (default, blank)",
    "default"
  )
  .action(
    (name: string | undefined, opts: { packageManager: string; template: string }) =>
      run(() =>
        runInit(name, {
          packageManager: opts.packageManager,
          template: opts.template,
        })
      )
  );

program
  .command("add <components...>")
  .description("add components from registry into src/components/")
  .option("--force", "overwrite existing files", false)
  .action((components: string[], opts: { force: boolean }) =>
    run(() =>
      runAdd(components, {
        force: opts.force,
        offline: program.opts().offline as boolean,
      })
    )
  );

program
  .command("list")
  .description("list available registry components")
  .option("--category <category>", "filter by category")
  .action((opts: { category?: string }) =>
    run(() =>
      runList({
        category: opts.category,
        offline: program.opts().offline as boolean,
      })
    )
  );

program
  .command("build")
  .description("build with vSsg")
  .option("--config <path>", "path to vssg.config.js")
  .action((opts: { config?: string }) =>
    run(() => runBuild({ config: opts.config }))
  );

program
  .command("check")
  .description("run vLint over project source")
  .action(() => run(() => runCheck()));

program
  .command("scaffold [name]")
  .description("scaffold a brand-driven vite+react project from a brand source")
  .requiredOption("--brand <handle>", "brand source (url:|fixture:|github:|npm:|json:|file:)")
  .option("--app <type>", "app type (landing, marketing, docs, dashboard)", "landing")
  .option("--package-manager <pm>", "package manager to use", "bun")
  .option("--no-install", "skip dependency installation")
  .action(
    (name: string | undefined, opts: { brand: string; app: string; packageManager: string; install: boolean }) =>
      run(() =>
        runScaffold(name, {
          brand: opts.brand,
          app: opts.app,
          packageManager: opts.packageManager,
          noInstall: !opts.install,
        })
      )
  );

program
  .command("compose")
  .description("open CompositionEditor in browser; reads/writes composition.json")
  .option("--port <number>", "port to listen on (default: random free port)")
  .option("--no-open", "skip opening the browser")
  .action((opts: { port?: string; open: boolean }) =>
    run(() =>
      runCompose({
        port: opts.port !== undefined ? parseInt(opts.port, 10) : undefined,
        noOpen: !opts.open,
      })
    )
  );

program.parse();
