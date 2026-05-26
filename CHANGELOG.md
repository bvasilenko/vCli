# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-05-26

### Added

- `booga demo` runs the vBlocks marketing page in the browser with zero install. Spawns a Node HTTP server on a free port, prints the URL, opens the browser, exits 0 after browser launch. `--no-open` flag for CI/headless mode.
- `booga init my-site` scaffolds a pre-populated Vite + React + vBlocks project by default: HeroSplit + FeaturesGrid + CtaCentered + FooterSplit with picsum photos and Tailwind wired to `@booga/vtheme/preset`.
- `booga init my-site --template=blank` scaffolds a bare Vite + React + Tailwind + vUi starter with no vBlocks deps, for users who prefer to compose from scratch.
- `open ^10` runtime dependency for cross-platform browser launch.
- Bundled `demo-dist/` in the npm tarball (~265 kB JS + 24 kB CSS compressed).

### Changed

- `booga init` default template is now the vBlocks marketing scaffold. The prior bare Vite+React+Tailwind+vUi starter is available as `--template=blank`.
- Build pipeline: `demo-dist/` and the default init template share a single `src/` source so the zero-install demo and the scaffolded project can never drift.

## [0.1.2] - 2026-05-25

### Changed

- Republish at 0.1.2: 0.1.0 and 0.1.1 were occupied on npm by an earlier drifted-direct-scaffold cycle (force-pushed away from git; tarballs orphaned on registry). This is the first canonical contribot-driven cycle release.

## [0.1.0] - 2026-05-25

### Added

- `booga init [name]`: scaffold Vite + React + Tailwind + vUi project
- `booga add <component>...`: copy re-export stub from registry into `src/components/`
- `booga list [--category=]`: print registry catalog
- `booga build [--config=]`: delegate to `@booga/vssg` generate pipeline
- `booga check`: delegate to `@booga/vlint` over project source
- `VcliConfigSchema`: `zod` config schema with `registry`, `componentsDir`, `packageManager`
- Registry source wraps `@booga/vregistry` (baked-in data, no network dependency)
- Demo: `demo/` renders a vsuite landing page via `booga build`
