# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-05-25

### Added

- `booga demo` — zero-install static server against bundled `demo-dist/`. Spawns a Node HTTP server on a free port, prints the URL, opens the browser, exits 0 after browser launch. `--no-open` flag for CI/headless mode. Terminates deterministically on the ready-signal (server listening + browser returned), not a fixed timeout.
- `booga init --template=vblocks-marketing` — pre-populated Vite+React+vBlocks scaffold: HeroSplit + FeaturesGrid + CtaCentered + FooterSplit at default content, picsum photo swap, Tailwind wired to `@booga/vtheme/preset` + `dslSafelist`.
- `open ^10` runtime dependency for cross-platform browser launch.
- Bundled `demo-dist/` in the npm tarball (~265 kB JS + 24 kB CSS compressed). Tarball is heavier by design; acceptable for a CLI that ships a zero-install demo.

### Changed

- Template resolution parameterised: `copyTemplate(dir, templateName)`. `"default"` maps to the existing Vite+React+Tailwind+vUi starter. Adding templates no longer requires touching the resolver.
- `booga init` accepts `--template <name>` flag (default: `"default"`).
- Build pipeline extended: `node scripts/copy-templates.mjs` (templates → `dist/templates/<name>/`) + `node scripts/build-demo-dist.mjs` (syncs template source → demo, runs `vite build`, copies output → `demo-dist/`).

## [0.1.2] - 2026-05-25

### Changed

- Republish at 0.1.2: 0.1.0 and 0.1.1 were occupied on npm by an earlier drifted-direct-scaffold cycle (force-pushed away from git; tarballs orphaned on registry). This is the first canonical contribot-driven cycle release.

## [0.1.0] - 2026-05-25

### Added

- `booga init [name]` — scaffold Vite + React + Tailwind + vUi project
- `booga add <component>...` — copy re-export stub from registry into `src/components/`
- `booga list [--category=]` — print registry catalog
- `booga build [--config=]` — delegate to `@booga/vssg` generate pipeline
- `booga check` — delegate to `@booga/vlint` over project source
- `VcliConfigSchema` — `zod` config schema with `registry`, `componentsDir`, `packageManager`
- Registry source wraps `@booga/vregistry` (baked-in data, no network dependency)
- Demo: `demo/` renders a vsuite landing page via `booga build`
