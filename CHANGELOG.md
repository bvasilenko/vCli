# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
